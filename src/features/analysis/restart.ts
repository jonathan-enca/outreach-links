import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { dailyCapReached, totalCostForAudit } from "@/lib/costs";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { ANALYSIS_EVENT } from "./service";
import type { AnalysisStepKey } from "./steps";

type Client = SupabaseClient<Database>;
const M = t.analysis.messages;

/** Étapes déroulées dans l'ordre, celles qu'on peut reprendre (l'état des lieux a sa propre vie). */
export const RESTART_ORDER = [
  "comprendre",
  "concurrents",
  "recherche",
  "tri",
  "contacts",
  "constats",
  "demandes",
] as const satisfies readonly AnalysisStepKey[];

/**
 * Étapes remises à zéro quand on reprend à partir de `key`. Le tri et la recherche de contact sont
 * un seul bloc de travail (une même qualification) : reprendre à « contacts » refait le bloc entier.
 * Null si l'étape ne peut pas être reprise.
 */
export function stepsToReset(key: string): AnalysisStepKey[] | null {
  if (!(RESTART_ORDER as readonly string[]).includes(key)) return null;
  const from = key === "contacts" ? "tri" : (key as (typeof RESTART_ORDER)[number]);
  return RESTART_ORDER.slice(RESTART_ORDER.indexOf(from));
}

/**
 * Efface les résultats dérivés de ces étapes (et seulement eux), garde tout ce qui précède, remet
 * leurs lignes de progression « en attente » : UNE fonction SQL, donc une transaction (tout ou rien).
 * Voir la migration `analysis_restart`.
 */
export async function resetSteps(
  service: Client,
  auditId: string,
  reset: readonly AnalysisStepKey[],
): Promise<void> {
  const { error } = await service.rpc("analysis_reset_steps", {
    p_audit: auditId,
    p_steps: [...reset],
  });
  if (error) throw new Error(`reprise : ${error.message}`);
}

/**
 * « Reprendre à partir d'ici » : remet cette étape et les suivantes à zéro, garde ce qui précède,
 * puis relance l'analyse (UN événement). Ce qui est gardé n'est ni refait ni repayé ; les appels
 * refaits retrouvent le cache du fournisseur quand ils sont identiques. Refusé tant que l'analyse
 * tourne. Mêmes contrôles de budget que le lancement.
 */
export async function restartFromStep(
  service: Client,
  auditId: string,
  stepKey: string,
  sendEvent: SendEvent,
  actorId: string | null,
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };
  const reset = stepsToReset(stepKey);
  if (!reset) return { status: "error", auditId, message: M.restartUnknownStep };
  const { data: audit } = await service
    .from("audits")
    .select("id, workspace_id, analysis_status, cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.analysis_status === "aucun")
    return { status: "error", auditId, message: M.notConfirmed };
  if (audit.analysis_status === "confirme" || audit.analysis_status === "en_cours") {
    return { status: "error", auditId, message: M.restartRunning };
  }
  const spent = await totalCostForAudit(service, auditId);
  if (spent >= Number(audit.cost_cap_usd)) return { status: "error", auditId, message: M.overCap };
  if (await dailyCapReached(service, env.DAILY_COST_CAP_USD)) {
    return { status: "error", auditId, message: M.dailyCap };
  }
  try {
    await resetSteps(service, auditId, reset);
  } catch {
    return { status: "error", auditId, message: M.saveError };
  }
  const nonce = new Date().toISOString();
  const { data, error } = await service
    .from("audits")
    .update({
      analysis_status: "confirme",
      analysis_confirmed_at: nonce,
      analysis_started_at: null,
      analysis_finished_at: null,
      analysis_error: null,
    })
    .eq("id", auditId)
    .eq("analysis_status", audit.analysis_status)
    .select("id");
  if (error) return { status: "error", auditId, message: M.saveError };
  if (!data?.length) return { status: "ok", auditId, message: M.alreadyStarted };
  await service.from("events").insert({
    workspace_id: audit.workspace_id,
    actor_id: actorId,
    type: "analysis.restarted",
    payload: { audit_id: auditId, from_step: stepKey, reset, spent_usd: spent },
  });
  try {
    await sendEvent({
      id: `analysis-${auditId}-${nonce}`,
      name: ANALYSIS_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.restarted };
}

/**
 * Démarrage bloqué : confirmée depuis plus de `afterMs` sans aucune étape commencée. Nouveau jeton
 * de lancement puis nouvel événement (le précédent, de même jeton, serait ignoré comme doublon).
 * Rien n'a été facturé tant qu'aucune étape n'a démarré.
 */
export async function relaunchStalled(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
  actorId: string | null,
  opts: { afterMs?: number; now?: () => Date } = {},
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };
  const now = (opts.now ?? (() => new Date()))();
  const { data: audit } = await service
    .from("audits")
    .select("id, analysis_status, analysis_confirmed_at")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.analysis_status !== "confirme")
    return { status: "ok", auditId, message: M.alreadyStarted };
  const since = audit.analysis_confirmed_at ? Date.parse(audit.analysis_confirmed_at) : 0;
  if (now.getTime() - since < (opts.afterMs ?? 2 * 60_000)) {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }
  const { data: steps } = await service
    .from("analysis_steps")
    .select("status")
    .eq("audit_id", auditId);
  if ((steps ?? []).some((s) => s.status !== "attente"))
    return { status: "ok", auditId, message: M.alreadyStarted };
  const nonce = now.toISOString();
  const { data, error } = await service
    .from("audits")
    .update({ analysis_confirmed_at: nonce })
    .eq("id", auditId)
    .eq("analysis_status", "confirme")
    .select("id");
  if (error) return { status: "error", auditId, message: M.saveError };
  if (!data?.length) return { status: "ok", auditId, message: M.alreadyStarted };
  try {
    await sendEvent({
      id: `analysis-${auditId}-${nonce}`,
      name: ANALYSIS_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
