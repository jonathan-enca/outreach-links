import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  computeAuditEstimate,
  confirmAudit,
  createAudit,
  refreshEstimatedAudit,
  type SendEvent,
} from "@/features/audits/service";
import type { ChainEstimate } from "@/features/audits/chain";
import { normalizeDomain } from "@/features/sites/domain";
import type { PageRead } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildAndStoreBrandProfile,
  getLatestBrandProfile,
  saveBrandProfileVersion,
  type BrandDeps,
} from "@/features/brand/service";
import { parseProfileForm, sameProfile } from "@/features/brand/form";
import type { StoredBrandProfile } from "@/features/brand/schema";
import { deduceSite } from "./deduce";

type Client = SupabaseClient<Database>;

export const ONBOARDING_MESSAGES = t.onboarding.messages;

/** Audit en cours ou terminé : on y renvoie l'utilisateur au lieu d'en payer un second. */
const REUSABLE_AUDIT_STATUSES = ["en_attente", "estime", "confirme", "en_cours", "termine"];

export interface StartState {
  status: "idle" | "error" | "ok";
  message?: string;
  siteId?: string;
  /** Renseigné quand un audit existe déjà pour ce site : on y va directement. */
  auditId?: string;
}

export interface StartDeps {
  /** Lit la page d'accueil du domaine (lecteur sûr : SSRF, robots.txt). null = illisible. */
  readHomepage: (domain: string) => Promise<PageRead | null>;
  /** Client LLM borné, ou null sans clé. */
  makeLlm: () => LlmClient | null;
  /** MT.1 : profil de marque (lecture du site + un appel LLM). Absent = pas de profil. */
  brand?: BrandDeps;
}

async function currentUserId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Étape 1 de l'onboarding en une URL : crée le site (ou retrouve celui du même domaine), déduit
 * thème, langue et requêtes depuis la page d'accueil, puis enregistre. AUCUN appel DataForSEO ici ;
 * seul appel payant possible : un appel LLM court, plafonné (voir DEDUCE_LIMITS). La vérification
 * de propriété, le prénom de signature, l'actif offert et la boîte d'envoi sont demandés plus
 * tard, juste avant le premier lot, jamais avant la première valeur.
 */
export async function startFromUrl(
  supabase: Client,
  rawUrl: string,
  deps: StartDeps,
): Promise<StartState> {
  const domain = normalizeDomain(rawUrl);
  if (!domain) return { status: "error", message: ONBOARDING_MESSAGES.invalidUrl };

  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return { status: "error", message: ONBOARDING_MESSAGES.noWorkspace };

  const { data: existing } = await supabase
    .from("sites")
    .select("id, niche, priority_queries")
    .eq("workspace_id", ws.id)
    .eq("domain", domain)
    .maybeSingle();

  if (existing) {
    const { data: audit } = await supabase
      .from("audits")
      .select("id")
      .eq("site_id", existing.id)
      .in("status", REUSABLE_AUDIT_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (audit) return { status: "ok", siteId: existing.id, auditId: audit.id };
    // Site déjà cadré (ou saisi à la main) : pas de nouvelle déduction, donc pas de nouvel appel LLM.
    // Le profil de marque, lui, est établi s'il manque (site créé avant MT.1).
    if (existing.niche && existing.priority_queries.length > 0) {
      await ensureBrandProfile(supabase, deps, {
        siteId: existing.id,
        workspaceId: ws.id,
        userId,
        domain,
        home: null,
      });
      return { status: "ok", siteId: existing.id };
    }
  }

  let page: PageRead | null = null;
  try {
    page = await deps.readHomepage(domain);
  } catch {
    page = null;
  }
  let llm: LlmClient | null = null;
  try {
    llm = deps.makeLlm();
  } catch {
    llm = null;
  }
  const deduction = await deduceSite({ domain, page, llm, workspaceId: ws.id });

  const row = {
    niche: deduction.theme || null,
    country: deduction.country,
    language: deduction.language,
    priority_queries: deduction.queries,
  };

  let siteId: string;
  if (existing) {
    const { error } = await supabase.from("sites").update(row).eq("id", existing.id);
    if (error) return { status: "error", message: ONBOARDING_MESSAGES.saveError };
    siteId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("sites")
      .insert({ workspace_id: ws.id, domain, ...row })
      .select("id")
      .single();
    if (error || !data) {
      return { status: "error", message: ONBOARDING_MESSAGES.saveError };
    }
    siteId = data.id;
    await supabase.from("events").insert({
      workspace_id: ws.id,
      actor_id: userId,
      type: "site.created",
      payload: { site_id: siteId, domain, origin: "onboarding_url" },
    });
  }
  await supabase.from("events").insert({
    workspace_id: ws.id,
    actor_id: userId,
    type: "onboarding.deduced",
    payload: {
      site_id: siteId,
      source: deduction.source,
      queries: deduction.queries.length,
    },
  });
  const brand = await ensureBrandProfile(supabase, deps, {
    siteId,
    workspaceId: ws.id,
    userId,
    domain,
    home: page,
  });
  if (brand) {
    await supabase.from("events").insert({
      workspace_id: ws.id,
      actor_id: userId,
      type: "brand_profile.created",
      payload: { site_id: siteId, version: brand.version, pages: brand.pagesRead.length },
    });
  }
  return { status: "ok", siteId };
}

/** Établit le profil de marque d'un site qui n'en a pas encore ; ne lève jamais. */
async function ensureBrandProfile(
  supabase: Client,
  deps: StartDeps,
  input: {
    siteId: string;
    workspaceId: string;
    userId: string;
    domain: string;
    home: PageRead | null;
  },
): Promise<StoredBrandProfile | null> {
  if (!deps.brand) return null;
  try {
    if (await getLatestBrandProfile(supabase, input.siteId)) return null;
    return await buildAndStoreBrandProfile(supabase, input, deps.brand);
  } catch {
    return null;
  }
}

/**
 * Enregistre les corrections du profil de marque saisies à l'écran de relecture. Rien de saisi :
 * rien à faire. Profil modifié : une NOUVELLE version « utilisateur » (l'ancienne reste, jamais
 * écrasée). Profil identique à la dernière version : aucune version créée.
 */
async function applyProfileEdits(
  supabase: Client,
  site: { id: string; workspaceId: string; domain: string; language: string },
  userId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = parseProfileForm(formData, { domain: site.domain, language: site.language });
  if (parsed.status === "error") return { ok: false, message: parsed.message };
  if (parsed.status === "empty") return { ok: true };
  const latest = await getLatestBrandProfile(supabase, site.id);
  if (latest && sameProfile(latest.profile, parsed.profile)) return { ok: true };
  const saved = await saveBrandProfileVersion(supabase, {
    siteId: site.id,
    workspaceId: site.workspaceId,
    userId,
    profile: parsed.profile,
    source: "utilisateur",
    pagesRead: latest?.pagesRead ?? [],
  });
  if (!saved.ok) return { ok: false, message: t.onboarding.brand.messages.saveError };
  await supabase.from("events").insert({
    workspace_id: site.workspaceId,
    actor_id: userId,
    type: "brand_profile.edited",
    payload: { site_id: site.id, version: saved.version },
  });
  return { ok: true };
}

export interface LaunchPreview {
  siteId: string;
  workspaceId: string;
  domain: string;
  theme: string;
  language: string;
  country: string;
  queries: string[];
  verified: boolean;
  /** Coût de tout le parcours annoncé (USD) et son détail. */
  totalUsd: number;
  capUsd: number;
  chain: ChainEstimate;
  /** Un audit existe déjà pour ce site (rien à lancer). */
  auditId: string | null;
  /** Dernière version du profil de marque (MT.1), null si elle n'a pas pu être établie. */
  brand: StoredBrandProfile | null;
}

/** Écran de confirmation : ce qui a été compris + coût total du parcours. Lecture seule, 0 USD. */
export async function getLaunchPreview(
  supabase: Client,
  siteId: string,
): Promise<LaunchPreview | null> {
  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, workspace_id, domain, niche, language, country, priority_queries, offered_asset, verified_at",
    )
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return null;
  const [{ data: ws }, { data: audit }, brand] = await Promise.all([
    supabase.from("workspaces").select("plan").eq("id", site.workspace_id).maybeSingle(),
    supabase
      .from("audits")
      .select("id")
      .eq("site_id", site.id)
      .in("status", REUSABLE_AUDIT_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getLatestBrandProfile(supabase, siteId),
  ]);
  const est = computeAuditEstimate({
    domain: site.domain,
    niche: site.niche,
    offeredAsset: site.offered_asset,
    priorityQueries: site.priority_queries,
    workspacePlan: ws?.plan,
  });
  return {
    siteId: site.id,
    workspaceId: site.workspace_id,
    domain: site.domain,
    theme: site.niche ?? "",
    language: site.language,
    country: site.country ?? "FR",
    queries: est.queries,
    verified: Boolean(site.verified_at),
    totalUsd: est.chain.totalUsd,
    capUsd: est.limits.costCapUsd,
    chain: est.chain,
    auditId: audit?.id ?? null,
    brand,
  };
}

export interface LaunchState {
  status: "idle" | "error" | "ok";
  message?: string;
  auditId?: string;
}

const launchSchema = z.object({
  theme: z
    .string()
    .trim()
    .min(2, ONBOARDING_MESSAGES.themeInvalid)
    .max(60, ONBOARDING_MESSAGES.themeInvalid),
  queries: z.array(z.string()).max(3),
});

/** Thème et requêtes saisis dans le formulaire de l'écran de confirmation (normalisés). */
function readCorrections(formData: FormData) {
  const parsed = launchSchema.pick({ theme: true, queries: true }).safeParse({
    theme: formData.get("theme") ?? "",
    queries: ["query1", "query2", "query3"].map((k) => String(formData.get(k) ?? "")),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? ONBOARDING_MESSAGES.invalid,
    };
  }
  const queries = [
    ...new Set(
      parsed.data.queries
        .map((q) => q.trim().toLowerCase().replace(/\s+/g, " "))
        .filter((q) => q.length >= 3 && q.length <= 120),
    ),
  ].slice(0, 3);
  if (queries.length === 0)
    return { ok: false as const, message: ONBOARDING_MESSAGES.queriesMissing };
  return {
    ok: true as const,
    theme: parsed.data.theme.toLowerCase().replace(/\s+/g, " "),
    queries,
  };
}

/**
 * Cas où rien n'a pu être déduit (site illisible, sans clé LLM) : la seule saisie demandée est le
 * thème et au moins une recherche ; on les enregistre puis l'écran réaffiche le coût réel.
 */
export async function saveCorrections(
  supabase: Client,
  siteId: string,
  formData: FormData,
): Promise<LaunchState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };
  const c = readCorrections(formData);
  if (!c.ok) return { status: "error", message: c.message };
  const { data, error } = await supabase
    .from("sites")
    .update({ niche: c.theme, priority_queries: c.queries })
    .eq("id", siteId)
    .select("id, workspace_id, domain, language")
    .maybeSingle();
  if (error) return { status: "error", message: ONBOARDING_MESSAGES.saveError };
  if (!data) return { status: "error", message: ONBOARDING_MESSAGES.siteNotFound };
  const edits = await applyProfileEdits(
    supabase,
    { id: data.id, workspaceId: data.workspace_id, domain: data.domain, language: data.language },
    userId,
    formData,
  );
  if (!edits.ok) return { status: "error", message: edits.message };
  return { status: "ok" };
}

/**
 * Étape 2 : l'UNIQUE confirmation. Enregistre les corrections éventuelles du thème et des
 * requêtes, puis estime (`createAudit`) et confirme (`confirmAudit`) en un seul geste : le
 * parcours s'enchaîne ensuite seul (MA.6). Refuse de lancer si le coût recalculé dépasse le coût
 * affiché (une correction qui ajoute des requêtes doit être revue avant d'être payée).
 */
export async function launchJourney(
  supabase: Client,
  siteId: string,
  formData: FormData,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<LaunchState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: ONBOARDING_MESSAGES.unauthenticated };

  const preview = await getLaunchPreview(supabase, siteId);
  if (!preview) return { status: "error", message: ONBOARDING_MESSAGES.siteNotFound };

  const c = readCorrections(formData);
  if (!c.ok) return { status: "error", message: c.message };
  const acceptedUsd = Number(formData.get("acceptedUsd") ?? "0");
  if (!Number.isFinite(acceptedUsd) || acceptedUsd < 0) {
    return { status: "error", message: ONBOARDING_MESSAGES.invalid };
  }
  const theme = c.theme;
  const finalQueries = c.queries;

  const changed = theme !== preview.theme || finalQueries.join("|") !== preview.queries.join("|");
  if (changed) {
    const { error } = await supabase
      .from("sites")
      .update({ niche: theme, priority_queries: finalQueries })
      .eq("id", siteId);
    if (error) return { status: "error", message: ONBOARDING_MESSAGES.saveError };
  }

  const edits = await applyProfileEdits(
    supabase,
    {
      id: siteId,
      workspaceId: preview.workspaceId,
      domain: preview.domain,
      language: preview.language,
    },
    userId,
    formData,
  );
  if (!edits.ok) return { status: "error", message: edits.message };

  const created = await createAudit(supabase, siteId, getServiceClient);
  if (created.status !== "ok" || !created.auditId) {
    return { status: "error", message: created.message ?? ONBOARDING_MESSAGES.saveError };
  }
  // Un audit déjà « estimé » (pas encore payé) suit les corrections faites ici.
  await refreshEstimatedAudit(supabase, created.auditId, getServiceClient);
  // Le parcours figé doit être celui que la personne a vu : mêmes requêtes, coût au plus égal au
  // coût accepté.
  const { data: audit } = await supabase
    .from("audits")
    .select("estimate_details, queries")
    .eq("id", created.auditId)
    .maybeSingle();
  const chain = (audit?.estimate_details as { chain?: { totalUsd?: number } } | null)?.chain;
  const total = chain?.totalUsd ?? 0;
  if (!audit || audit.queries.join("|") !== finalQueries.join("|") || total > acceptedUsd + 1e-6) {
    return { status: "error", auditId: created.auditId, message: ONBOARDING_MESSAGES.costChanged };
  }

  const confirmed = await confirmAudit(supabase, created.auditId, getServiceClient, sendEvent);
  if (confirmed.status === "error") {
    return { status: "error", auditId: created.auditId, message: confirmed.message };
  }
  await supabase.from("events").insert({
    workspace_id: preview.workspaceId,
    actor_id: userId,
    type: "onboarding.launched",
    payload: { site_id: siteId, audit_id: created.auditId, accepted_usd: acceptedUsd },
  });
  return { status: "ok", auditId: created.auditId };
}
