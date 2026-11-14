import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isExcludedDomain } from "@/features/audits/excluded-domains";
import { normalizeDomain } from "@/features/sites/domain";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { estimatePublicAudit, FREE_LIMITS, periodKey, RATE_LIMITS } from "./config";
import { checkCircuitBreaker, hashKey, rateLimit } from "./guard";
import { PUBLIC_AUDIT_EVENT, failPublicAudit } from "./run";
import type { PublicAuditResult, PublicAuditStatus } from "./types";

type Client = SupabaseClient<Database>;
const M = t.publicAudit.errors;

export type SendEvent = (event: {
  id?: string;
  name: string;
  data: Record<string, unknown>;
}) => Promise<unknown>;

export interface GuardDeps {
  service: Client;
  /** Sel du hachage des identifiants (IP, email). */
  salt: string;
  /** Adresse IP du visiteur (déjà extraite des en-têtes). */
  ip: string;
  now?: Date;
}

export interface StartDeps extends GuardDeps {
  sendEvent: SendEvent;
  enabled: boolean;
  dailyCapUsd: number;
}

export type StartState =
  | { status: "ok"; id: string; cached: boolean }
  | { status: "error"; code: string; message: string; retryAfterSeconds?: number };

const fail = (code: keyof typeof M, retryAfterSeconds?: number): StartState => ({
  status: "error",
  code,
  message: M[code],
  ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
});

import { nicheQueries, parseNiche } from "./niche";

const querySchema = z.string().trim().min(2).max(100);

export interface StartInput {
  domain: string;
  queries?: string[];
  /** Thème du site (facultatif) : requêtes de secours si le site n'a encore aucun mot-clé classé (MA.4). */
  niche?: string;
  /** Champ piège : un humain ne le remplit jamais. */
  honeypot?: string;
}

/** Normalise les requêtes saisies : vides ignorées, doublons retirés, 3 au plus. */
export function parseQueries(raw: readonly string[] | undefined): string[] | null {
  const out: string[] = [];
  for (const q of raw ?? []) {
    if (!q.trim()) continue;
    const parsed = querySchema.safeParse(q);
    if (!parsed.success) return null;
    const v = parsed.data.toLowerCase().replace(/\s+/g, " ");
    if (!out.includes(v)) out.push(v);
  }
  return out.slice(0, FREE_LIMITS.queries);
}

/**
 * Démarre (ou retrouve) l'audit gratuit d'un domaine. Ordre des contrôles, du moins cher au
 * plus cher : validation, limite de soumissions, résultat en cache (0 USD : une exécution par
 * domaine et par mois), coupe-circuit de dépense, limites de création, puis envoi du job.
 */
export async function startPublicAudit(deps: StartDeps, input: StartInput): Promise<StartState> {
  const { service } = deps;
  if (input.honeypot?.trim()) return fail("invalide");

  const domain = normalizeDomain(input.domain);
  if (!domain) return fail("domaine_invalide");
  if (isExcludedDomain(domain)) return fail("domaine_non_eligible");
  const typed = parseQueries(input.queries);
  if (typed === null) return fail("requete_invalide");
  const niche = parseNiche(input.niche);
  if (niche === null) return fail("requete_invalide");
  // MA.4 : sans requête saisie, un thème fournit des requêtes de secours (source « auto » :
  // les mots-clés classés du site restent prioritaires, voir collectOwnKeywords).
  const queries = typed.length ? typed : nicheQueries(niche);
  const queriesSource = typed.length ? "visiteur" : "auto";

  const requester = hashKey(deps.ip, deps.salt);
  const submit = await rateLimit(service, "pa_submit", requester, RATE_LIMITS.submit);
  if (!submit.allowed) return fail("trop_de_demandes", submit.retryAfterSeconds);

  const period = periodKey(deps.now);
  const existing = await findExisting(service, domain, period);
  if (existing && existing.status !== "echoue") {
    return { status: "ok", id: existing.id, cached: true };
  }
  if (existing && existing.attempts >= FREE_LIMITS.maxAttempts) return fail("domaine_epuise");

  const estimate = estimatePublicAudit(queries.length || FREE_LIMITS.queries);
  const breaker = await checkCircuitBreaker(service, {
    enabled: deps.enabled,
    dailyCapUsd: deps.dailyCapUsd,
    estimateUsd: estimate.totalUsd,
    now: deps.now,
  });
  if (breaker.open) {
    logger.warn("audit gratuit refusé par le coupe-circuit", {
      reason: breaker.reason,
      spentUsd: breaker.spentUsd,
    });
    return fail(breaker.reason === "desactive" ? "ferme" : "capacite_atteinte");
  }

  const perRequester = await rateLimit(
    service,
    "pa_create",
    requester,
    RATE_LIMITS.createPerRequester,
  );
  if (!perRequester.allowed) return fail("limite_quotidienne", perRequester.retryAfterSeconds);
  const global = await rateLimit(service, "pa_create_all", "all", RATE_LIMITS.createGlobal);
  if (!global.allowed) return fail("capacite_atteinte", global.retryAfterSeconds);

  let id: string;
  let attempts: number;
  if (existing) {
    // Réessai après un échec : on remet l'audit en file (atomique sur le statut).
    const { data, error } = await service
      .from("public_audits")
      .update({
        status: "en_attente",
        queries,
        // Sans cela, des requêtes saisies après un échec seraient ignorées (déduction « auto »).
        queries_source: queriesSource,
        error_code: null,
        error_message: null,
      })
      .eq("id", existing.id)
      .eq("status", "echoue")
      .select("id, attempts");
    if (error || !data?.length) return fail("erreur");
    id = data[0]!.id;
    attempts = data[0]!.attempts ?? 0;
  } else {
    const { data, error } = await service
      .from("public_audits")
      .insert({
        domain,
        period_key: period,
        status: "en_attente",
        attempts: 0,
        queries,
        queries_source: queriesSource,
        estimated_cost_usd: estimate.totalUsd,
        requester_hash: requester,
      })
      .select("id, attempts")
      .single();
    if (error || !data) {
      if (error?.code === "23505") {
        // Course avec une autre demande du même domaine : on réutilise la sienne.
        const raced = await findExisting(service, domain, period);
        if (raced) return { status: "ok", id: raced.id, cached: true };
      }
      logger.error("public_audits : insertion impossible", { error: error?.message });
      return fail("erreur");
    }
    id = data.id;
    attempts = data.attempts ?? 0;
  }

  try {
    await deps.sendEvent({
      id: `public-audit-${id}-${attempts}`,
      name: PUBLIC_AUDIT_EVENT,
      data: { publicAuditId: id },
    });
  } catch (e) {
    logger.error("public-audit : événement Inngest non envoyé", { id, error: String(e) });
    await failPublicAudit(service, id, "file_indisponible", "Envoi de l'événement impossible");
    return fail("file_indisponible");
  }
  return { status: "ok", id, cached: false };
}

async function findExisting(service: Client, domain: string, period: string) {
  const { data } = await service
    .from("public_audits")
    .select("id, status, attempts")
    .eq("domain", domain)
    .eq("period_key", period)
    .maybeSingle();
  return data ?? null;
}

// ----- Email demandé pour le rapport complet ----------------------------------

const emailSchema = z.email().max(254);

export type EmailState =
  { status: "ok"; token: string } | { status: "error"; code: string; message: string };

export async function captureEmail(
  deps: GuardDeps,
  input: { auditId: string; email: string; consent: boolean },
): Promise<EmailState> {
  const { service } = deps;
  const err = (code: keyof typeof M): EmailState => ({ status: "error", code, message: M[code] });
  const parsed = emailSchema.safeParse(input.email.trim());
  if (!parsed.success) return err("email_invalide");
  if (!input.consent) return err("consentement");
  const email = parsed.data.toLowerCase();

  const requester = hashKey(deps.ip, deps.salt);
  const perIp = await rateLimit(service, "pa_email", requester, RATE_LIMITS.email);
  if (!perIp.allowed) return err("trop_de_demandes");
  const perEmail = await rateLimit(
    service,
    "pa_email_addr",
    hashKey(email, deps.salt),
    RATE_LIMITS.emailAddress,
  );
  if (!perEmail.allowed) return err("trop_de_demandes");

  const { data: audit } = await service
    .from("public_audits")
    .select("id, status")
    .eq("id", input.auditId)
    .maybeSingle();
  if (!audit || audit.status !== "termine") return err("rapport_indisponible");

  const token = randomBytes(32).toString("hex");
  const ins = await service
    .from("public_audit_leads")
    .insert({
      public_audit_id: audit.id,
      email,
      access_token: token,
      requester_hash: requester,
    })
    .select("access_token")
    .single();
  if (!ins.error && ins.data) return { status: "ok", token: ins.data.access_token };
  if (ins.error?.code === "23505") {
    // Même adresse, même rapport : on rouvre l'accès existant (aucune donnée nouvelle).
    const { data: lead } = await service
      .from("public_audit_leads")
      .select("access_token")
      .eq("public_audit_id", audit.id)
      .eq("email", email)
      .maybeSingle();
    if (lead) return { status: "ok", token: lead.access_token };
  }
  logger.error("public_audit_leads : insertion impossible", { error: ins.error?.message });
  return err("erreur");
}

// ----- Lecture du rapport -----------------------------------------------------

export interface LoadedAudit {
  id: string;
  domain: string;
  status: PublicAuditStatus;
  errorCode: string | null;
  attempts: number;
  result: PublicAuditResult | null;
  unlocked: boolean;
}

export async function loadPublicAudit(
  service: Client,
  id: string,
  token: string | undefined,
): Promise<LoadedAudit | null> {
  const { data: row } = await service
    .from("public_audits")
    .select("id, domain, status, error_code, attempts, result")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  let unlocked = false;
  if (token && token.length >= 32 && row.status === "termine") {
    const { data: lead } = await service
      .from("public_audit_leads")
      .select("id")
      .eq("public_audit_id", id)
      .eq("access_token", token)
      .maybeSingle();
    unlocked = !!lead;
  }
  const result = row.status === "termine" ? (row.result as unknown as PublicAuditResult) : null;
  return {
    id: row.id,
    domain: row.domain,
    status: row.status as PublicAuditStatus,
    errorCode: row.error_code,
    attempts: row.attempts,
    result: result?.version === 1 ? result : null,
    unlocked,
  };
}
