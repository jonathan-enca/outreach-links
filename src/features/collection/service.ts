import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { getLatestBrandProfile } from "@/features/brand/service";
import { getLatestQueryUniverse } from "@/features/queries/service";
import { dailyCapReached, totalCostForAudit } from "@/lib/costs";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
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
      "id, status, workspace_id, cost_cap_usd, sites(id, domain, niche, goal, target_keywords)",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { ok: false, message: M.notFound };
  if (audit.status !== "termine") return { ok: false, message: M.auditNotDone };
  const site = audit.sites as unknown as {
    id: string;
    domain: string;
    niche: string | null;
    goal: string;
    target_keywords: string[];
  } | null;
  if (!site) return { ok: false, message: M.notFound };

  const [universe, profile, comps] = await Promise.all([
    getLatestQueryUniverse(service, site.id),
    getLatestBrandProfile(service, site.id),
    service
      .from("competitors")
      .select("domain, selected, score")
      .eq("audit_id", auditId)
      .eq("selected", true)
      .order("score", { ascending: false }),
  ]);
  if (!universe) return { ok: false, message: M.noUniverse };

  const plan = buildCollectionPlan({
    queries: universe.queries,
    competitorDomains: (comps.data ?? []).map((c) => c.domain),
    theme: site.niche ?? "",
    nameVariants: profile?.profile.name_variants ?? [],
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

/**
 * Lance la collecte (après la confirmation du coût annoncé par `previewCollection`). Fige le plan et
 * le coût dans `candidate_collections`, puis envoie l'événement Inngest. Refuse sans rien facturer si
 * le coût attendu dépasse ce qui reste du plafond d'audit ou si le plafond du jour est atteint.
 * Aucun envoi d'email, aucun achat de lien.
 */
export async function startCollection(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
  actorId: string | null,
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };

  const existing = await service
    .from("candidate_collections")
    .select("id, status, created_at")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (existing.data && ["en_cours", "termine"].includes(existing.data.status)) {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }

  let nonce = existing.data?.status === "confirme" ? existing.data.created_at : null;
  if (!nonce) {
    const prev = await previewCollection(service, auditId);
    if (!prev.ok) return { status: "error", message: prev.message };
    const { plan, estimate, remainingUsd } = prev.preview;
    if (estimate.expectedUsd > remainingUsd + 1e-9) return { status: "error", message: M.overCap };
    if (await dailyCapReached(service, env.DAILY_COST_CAP_USD)) {
      return { status: "error", message: M.dailyCap };
    }
    nonce = new Date().toISOString();
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
  }

  try {
    await sendEvent({
      id: `audit-collection-${auditId}-${nonce}`,
      name: COLLECTION_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
