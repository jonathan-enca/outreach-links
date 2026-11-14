import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { DEADLINKS_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.deadlinks.messages;

/**
 * Lance le chasseur 404 (gratuit, aucun appel payant). Exige les opportunités terminées.
 * aucun/echoue -> en_cours, puis l'événement Inngest (id stable : audit + date de lancement).
 * Si l'envoi échoue, l'état revient à « echoue » pour que le bouton relance proprement.
 */
export async function startDeadlinks(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };

  const { data: audit } = await supabase
    .from("audits")
    .select("id, workspace_id, opportunities_status, deadlinks_status")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.opportunities_status !== "termine") {
    return { status: "error", message: M.opportunitiesNotDone };
  }
  if (audit.deadlinks_status === "en_cours" || audit.deadlinks_status === "termine") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const nonce = new Date().toISOString();
  const { data: moved, error } = await service
    .from("audits")
    .update({
      deadlinks_status: "en_cours",
      deadlinks_error: null,
      deadlinks_started_at: nonce,
      deadlinks_finished_at: null,
    })
    .eq("id", auditId)
    .in("deadlinks_status", ["aucun", "echoue"])
    .select("id");
  if (error) return { status: "error", message: M.saveError };
  if (!moved?.length) return { status: "ok", auditId, message: M.alreadyStarted };
  await supabase.from("events").insert({
    workspace_id: audit.workspace_id,
    actor_id: userId,
    type: "audit.deadlinks_started",
    payload: { audit_id: auditId },
  });
  try {
    await sendEvent({
      id: `audit-deadlinks-${auditId}-${nonce}`,
      name: DEADLINKS_EVENT,
      data: { auditId, workspaceId: audit.workspace_id },
    });
  } catch {
    await service
      .from("audits")
      .update({ deadlinks_status: "echoue", deadlinks_error: M.sendFailed })
      .eq("id", auditId)
      .eq("deadlinks_status", "en_cours");
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
