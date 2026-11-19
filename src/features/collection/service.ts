import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { getLatestBrandProfile } from "@/features/brand/service";
import { getLatestQueryUniverse } from "@/features/queries/service";
import { dailyCapReached, totalCostForAudit } from "@/lib/costs";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { contentQueries, searchConsoleRowsOf } from "./content-queries";
import { COLLECTION_LIMITS } from "./limits";
import {
  buildCollectionPlan,
  estimateCollection,
  type CollectionEstimate,
  type CollectionPlan,
} from "./plan";
import { COLLECTION_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.collection.messages;

export interface CollectionPreview {
  plan: CollectionPlan;
  estimate: CollectionEstimate;
  /** Ce qui reste du plafond de l'audit avant la collecte (USD). */
  remainingUsd: number;
}

type PreviewResult =
  | { ok: true; preview: CollectionPreview; workspaceId: string; siteId: string }
  | { ok: false; message: string };

/**
 * Plan de collecte et coût ANNONCÉ (attendu et pire cas) pour un audit terminé, sans aucun appel
 * payant : lit l'univers de requêtes (MT.2b), les concurrents retenus (M1.3) et le profil de marque.
 */
export async function previewCollection(service: Client, auditId: string): Promise<PreviewResult> {
  const { data: audit } = await service
    .from("audits")
    .select(
      "id, status, workspace_id, cost_cap_usd, links_state, sites(id, domain, niche, language, goal, target_keywords)",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { ok: false, message: M.notFound };
  if (audit.status !== "termine") return { ok: false, message: M.auditNotDone };
  const site = audit.sites as unknown as {
    id: string;
    domain: string;
    niche: string | null;
    language: string;
    goal: string;
    target_keywords: string[];
  } | null;
  if (!site) return { ok: false, message: M.notFound };

  const [universe, profile, comps] = await Promise.all([
    getLatestQueryUniverse(service, site.id),
    getLatestBrandProfile(service, site.id),
    service
      .from("competitors")
      .select("domain, selected, score, referring_domains, sample_url")
      .eq("audit_id", auditId)
      .order("score", { ascending: false }),
  ]);
  if (!universe) return { ok: false, message: M.noUniverse };

  const facts = (c: NonNullable<typeof comps.data>[number]) => ({
    domain: c.domain,
    referringDomains: c.referring_domains,
    sampleUrl: c.sample_url,
  });
  const retained = (comps.data ?? []).filter((c) => c.selected);
  const theme = site.niche ?? "";
  const nameVariants = profile?.profile.name_variants ?? [];
  // MQ.4 : requêtes de contenu sans lien (thème + Search Console si l'état des lieux l'a déjà lue).
  const extra = contentQueries({
    theme,
    language: site.language,
    domain: site.domain,
    nameVariants,
    searchConsoleQueries: searchConsoleRowsOf(audit.links_state),
    existing: universe.queries.map((q) => q.q),
    perQueryUsd: estimateCost("serpOrganicLive", {
      keyword: "exemple",
      depth: COLLECTION_LIMITS.serp.depth,
    }),
  });
  const plan = buildCollectionPlan({
    queries: universe.queries,
    contentQueries: extra,
    competitorDomains: retained.map((c) => c.domain),
    competitors: retained.map(facts),
    // MC.6b : les concurrents non retenus servent seulement de candidats au choix des ressources comparables.
    otherCompetitors: (comps.data ?? []).filter((c) => !c.selected).map(facts),
    language: site.language,
    theme,
    nameVariants,
    domain: site.domain,
    goal: site.goal === "mots_cles" ? "mots_cles" : "autorite_generale",
    targetKeywords: site.target_keywords,
  });
  const spent = await totalCostForAudit(service, auditId);
  return {
    ok: true,
    workspaceId: audit.workspace_id,
    siteId: site.id,
    preview: {
      plan,
      estimate: estimateCollection(plan),
      remainingUsd: Math.round((Number(audit.cost_cap_usd) - spent) * 1e6) / 1e6,
    },
  };
}

/** Résultat de la préparation d'une étape : prête à démarrer (jeton de lancement), déjà faite, ou refusée. */
export type PrepareResult =
  { status: "ready"; nonce: string } | { status: "already" } | { status: "error"; message: string };

/**
 * Fige le plan et le coût de la collecte dans `candidate_collections` (statut « confirme »), sans rien
 * lancer. Refuse sans rien facturer si le coût attendu dépasse ce qui reste du plafond d'audit ou si
 * le plafond du jour est atteint. Une collecte « en cours » ou « confirmée » est reprise telle quelle.
 * `resume` (analyse unique, MU.1) : une collecte restée « en cours » après un job mort est reprise au
 * lieu d'être considérée comme lancée ailleurs.
 */
export async function prepareCollection(
  service: Client,
  auditId: string,
  actorId: string,
  opts: { resume?: boolean } = {},
): Promise<PrepareResult> {
  const existing = await service
    .from("candidate_collections")
    .select("id, status, created_at")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (existing.data?.status === "termine") return { status: "already" };
  if (existing.data?.status === "en_cours") {
    return opts.resume
      ? { status: "ready", nonce: existing.data.created_at }
      : { status: "already" };
  }
  if (existing.data?.status === "confirme") {
    return { status: "ready", nonce: existing.data.created_at };
  }

  const prev = await previewCollection(service, auditId);
  if (!prev.ok) return { status: "error", message: prev.message };
  const { plan, estimate, remainingUsd } = prev.preview;
  if (estimate.expectedUsd > remainingUsd + 1e-9) return { status: "error", message: M.overCap };
  if (await dailyCapReached(service, env.DAILY_COST_CAP_USD)) {
    return { status: "error", message: M.dailyCap };
  }
  const nonce = new Date().toISOString();
  const row = {
    audit_id: auditId,
    workspace_id: prev.workspaceId,
    site_id: prev.siteId,
    status: "confirme",
    plan: plan as unknown as Json,
    expected_cost_usd: estimate.expectedUsd,
    worst_case_usd: estimate.worstUsd,
    target_usd: estimate.targetUsd,
    actual_cost_usd: null,
    stats: {} as Json,
    stop_reason: null,
    error_message: null,
    confirmed_by: actorId,
    created_at: nonce,
    started_at: null,
    finished_at: null,
  };
  // Relance après échec : la ligne repart de zéro (les réponses déjà payées sont en cache).
  const { error } = await service
    .from("candidate_collections")
    .upsert(row, { onConflict: "audit_id" });
  if (error) return { status: "error", message: M.saveError };
  return { status: "ready", nonce };
}

/**
 * Lance la collecte (après la confirmation du coût annoncé par `previewCollection`) : prépare la ligne
 * (`prepareCollection`), puis envoie l'événement Inngest. Aucun envoi d'email, aucun achat de lien.
 */
export async function startCollection(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
  actorId: string | null,
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };
  const prep = await prepareCollection(service, auditId, actorId);
  if (prep.status === "already") return { status: "ok", auditId, message: M.alreadyStarted };
  if (prep.status === "error") return { status: "error", message: prep.message };
  try {
    await sendEvent({
      id: `audit-collection-${auditId}-${prep.nonce}`,
      name: COLLECTION_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
