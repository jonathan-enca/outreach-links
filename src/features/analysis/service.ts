import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { dailyCapReached, totalCostForAudit } from "@/lib/costs";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { estimateAnalysis } from "./estimate";

type Client = SupabaseClient<Database>;
const M = t.analysis.messages;

/** L'UNIQUE événement qui lance (ou reprend) toute l'analyse d'un audit. */
export const ANALYSIS_EVENT = "analysis/run.requested";
/** Envoyé par l'orchestrateur : état des lieux des liens du site, en parallèle. */
export const LINKS_STATE_EVENT = "analysis/links-state.requested";

/**
 * Lance ou reprend l'analyse unique d'un audit confirmé (MU.1) : UN contrôle de budget (coût attendu
 * dans le plafond de l'audit, plafond du jour), puis UN événement. Sert au premier lancement
 * (`confirmAudit`) comme à « Reprendre » après un échec : l'orchestrateur saute ce qui est déjà fait,
 * donc rien n'est refait ni repayé. Aucun envoi d'email, aucun achat de lien.
 */
export async function startAnalysis(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
  actorId: string | null,
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };
  const { data: audit } = await service
    .from("audits")
    .select(
      "id, workspace_id, status, analysis_status, analysis_confirmed_at, estimated_cost_usd, cost_cap_usd",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.status === "en_attente" || audit.status === "estime") {
    return { status: "error", message: M.notConfirmed };
  }
  if (audit.analysis_status === "termine") {
    return { status: "ok", auditId, message: M.alreadyDone };
  }
  if (audit.analysis_status === "en_cours") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }

  const resumed = audit.analysis_status === "echoue";
  let nonce = audit.analysis_status === "confirme" ? audit.analysis_confirmed_at : null;
  if (!nonce) {
    // Le seul contrôle de budget du lancement : ce qui est déjà dépensé, ou le coût attendu de toute
    // l'analyse s'il est plus grand, doit tenir dans le plafond de l'audit.
    const spent = await totalCostForAudit(service, auditId);
    const expected = estimateAnalysis(Number(audit.estimated_cost_usd ?? 0)).expectedUsd;
    const cap = Number(audit.cost_cap_usd);
    if (Math.max(spent, expected) > cap + 1e-9 || spent >= cap) {
      return { status: "error", auditId, message: M.overCap };
    }
    if (await dailyCapReached(service, env.DAILY_COST_CAP_USD)) {
      return { status: "error", auditId, message: M.dailyCap };
    }
    nonce = new Date().toISOString();
    const { data, error } = await service
      .from("audits")
      .update({
        analysis_status: "confirme",
        analysis_confirmed_at: nonce,
        analysis_error: null,
        analysis_finished_at: null,
        // Reprise après un échec de la découverte des concurrents : elle repart, sans rien repayer
        // (les recherches déjà faites sont en cache).
        ...(audit.status === "echoue"
          ? { status: "confirme", error_message: null, finished_at: null }
          : {}),
      })
      .eq("id", auditId)
      .eq("analysis_status", audit.analysis_status)
      .select("id");
    if (error) return { status: "error", auditId, message: M.saveError };
    if (!data?.length) return { status: "ok", auditId, message: M.alreadyStarted };
    await service.from("events").insert({
      workspace_id: audit.workspace_id,
      actor_id: actorId,
      type: resumed ? "analysis.resumed" : "analysis.requested",
      payload: { audit_id: auditId, expected_usd: expected, spent_usd: spent },
    });
  }

  try {
    await sendEvent({
      // Identifiant d'événement : Inngest ignore un doublon, donc pas de double lancement.
      id: `analysis-${auditId}-${nonce}`,
      name: ANALYSIS_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: resumed ? M.resumed : M.started };
}
