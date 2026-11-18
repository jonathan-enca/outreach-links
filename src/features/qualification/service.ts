import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import type { PrepareResult } from "@/features/collection/service";
import { dailyCapReached, totalCostForAudit } from "@/lib/costs";
import { DEFAULT_MODELS } from "@/lib/llm/client";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { runFreeStages } from "./free";
import { estimateQualification, QUALIFY_LIMITS, type QualificationEstimate } from "./limits";
import { loadQualificationInput, QUALIFICATION_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.qualification.messages;

/** Modèle qui sera réellement appelé (même choix que `createLlmClientFromEnv`). */
export function configuredModel(): string {
  if (env.LLM_MODEL) return env.LLM_MODEL;
  const provider =
    env.LLM_PROVIDER ??
    (env.ANTHROPIC_API_KEY
      ? "anthropic"
      : env.OPENAI_API_KEY || env.LLM_PROXY_AUTH
        ? "openai"
        : "anthropic");
  return DEFAULT_MODELS[provider];
}

/**
 * Modèle de la qualification (MC.6c) : la page est lue sur 6 000 caractères, ce qui coûte trop cher avec
 * `claude-haiku-4-5` (1 USD par million de jetons d'entrée) mais 10 fois moins avec la génération actuelle.
 * `LLM_MODEL` reste prioritaire. Sans clé Anthropic (développement avec OpenAI), le modèle par défaut du fournisseur.
 */
export const QUALIFY_MODELS: Record<"anthropic" | "openai", string> = {
  anthropic: "claude-haiku-5-5",
  openai: DEFAULT_MODELS.openai,
};

export function qualificationModel(): string {
  if (env.LLM_MODEL) return env.LLM_MODEL;
  const provider =
    env.LLM_PROVIDER ??
    (env.ANTHROPIC_API_KEY
      ? "anthropic"
      : env.OPENAI_API_KEY || env.LLM_PROXY_AUTH
        ? "openai"
        : "anthropic");
  return QUALIFY_MODELS[provider];
}

export interface QualificationPreview {
  estimate: QualificationEstimate;
  remainingUsd: number;
}

type PreviewResult =
  | {
      ok: true;
      preview: QualificationPreview;
      workspaceId: string;
      siteId: string;
      collectionId: string;
    }
  | { ok: false; message: string };

/**
 * Coût ANNONCÉ (attendu et pire cas) avant tout appel payant : les étages gratuits 1 et 2 sont
 * calculés ici (aucune requête HTTP, aucun LLM) pour savoir combien de candidats iront plus loin.
 */
export async function previewQualification(
  service: Client,
  auditId: string,
): Promise<PreviewResult> {
  const loaded = await loadQualificationInput(service, auditId);
  if (!loaded) return { ok: false, message: M.collectionNotDone };
  const afterFree = runFreeStages(loaded.candidates, loaded.ctx).filter(
    (v) => v.reason === null,
  ).length;
  const { data: audit } = await service
    .from("audits")
    .select("cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  const spent = await totalCostForAudit(service, auditId);
  return {
    ok: true,
    workspaceId: loaded.workspaceId,
    siteId: loaded.siteId,
    collectionId: loaded.collectionId,
    preview: {
      estimate: estimateQualification(afterFree, { model: qualificationModel() }),
      remainingUsd: Math.round((Number(audit?.cost_cap_usd ?? 0) - spent) * 1e6) / 1e6,
    },
  };
}

/**
 * Fige le modèle, le budget et les limites de la qualification (statut « confirme »), sans rien lancer.
 * Refuse sans rien facturer si le pire cas dépasse ce qui reste du plafond d'audit ou si le plafond du
 * jour est atteint. `resume` (analyse unique, MU.1) : une qualification restée « en cours » après un
 * job mort est reprise ; `keepDone` : une qualification terminée n'est pas refaite.
 */
export async function prepareQualification(
  service: Client,
  auditId: string,
  actorId: string,
  opts: { resume?: boolean; keepDone?: boolean } = {},
): Promise<PrepareResult> {
  const existing = await service
    .from("qualification_runs")
    .select("id, status, created_at")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (existing.data?.status === "en_cours") {
    return opts.resume
      ? { status: "ready", nonce: existing.data.created_at }
      : { status: "already" };
  }
  if (existing.data?.status === "termine" && opts.keepDone) return { status: "already" };
  if (existing.data?.status === "confirme") {
    return { status: "ready", nonce: existing.data.created_at };
  }
  const prev = await previewQualification(service, auditId);
  if (!prev.ok) return { status: "error", message: prev.message };
  const { estimate, remainingUsd } = prev.preview;
  if (estimate.worstUsd > remainingUsd + 1e-9) return { status: "error", message: M.overCap };
  if (await dailyCapReached(service, env.DAILY_COST_CAP_USD))
    return { status: "error", message: M.dailyCap };
  const nonce = new Date().toISOString();
  const row = {
    audit_id: auditId,
    collection_id: prev.collectionId,
    workspace_id: prev.workspaceId,
    site_id: prev.siteId,
    status: "confirme",
    plan: {
      model: estimate.model,
      budgetUsd: estimate.budgetUsd,
      limits: QUALIFY_LIMITS,
      afterFree: estimate.afterFree,
    } as unknown as Json,
    expected_cost_usd: estimate.expectedUsd,
    worst_case_usd: estimate.worstUsd,
    budget_usd: estimate.budgetUsd,
    actual_cost_usd: null,
    stats: {} as Json,
    stop_reason: null,
    error_message: null,
    confirmed_by: actorId,
    created_at: nonce,
    started_at: null,
    finished_at: null,
    // Une qualification refaite repart sans lot supplémentaire en cours.
    more_status: "aucun",
    more_requested_at: null,
    more_stats: {} as Json,
    // ... et sans lecture automatique de la réserve.
    auto_status: "aucun",
    auto_started_at: null,
    auto_lots: 0,
    auto_low_streak: 0,
    auto_added: 0,
    auto_cost_usd: 0,
    auto_stop: null,
  };
  // Relance (après échec ou nouvelle collecte) : la ligne repart de zéro.
  const { error } = await service
    .from("qualification_runs")
    .upsert(row, { onConflict: "audit_id" });
  if (error) return { status: "error", message: M.saveError };
  return { status: "ready", nonce };
}

/**
 * Lance la qualification après confirmation du coût annoncé : prépare la ligne
 * (`prepareQualification`), puis envoie l'événement Inngest. Aucun envoi, aucun achat.
 */
export async function startQualification(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
  actorId: string | null,
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };
  const prep = await prepareQualification(service, auditId, actorId);
  if (prep.status === "already") return { status: "ok", auditId, message: M.alreadyStarted };
  if (prep.status === "error") return { status: "error", message: prep.message };
  try {
    await sendEvent({
      id: `audit-qualification-${auditId}-${prep.nonce}`,
      name: QUALIFICATION_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
