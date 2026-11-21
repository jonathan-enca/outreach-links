import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { CONTACTS_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.contacts.messages;

/**
 * Lance la recherche de contacts des cibles « à contacter » de la dernière version du plan.
 * Exige un tri terminé. Une exécution par plan : (absent | echoue) -> en_cours.
 */
export async function startContacts(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };

  const { data: plan } = await supabase
    .from("link_plans")
    .select("id, workspace_id")
    .eq("audit_id", auditId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return { status: "error", message: M.noPlan };
  const { data: triage } = await supabase
    .from("link_plan_triage_runs")
    .select("status")
    .eq("plan_id", plan.id)
    .maybeSingle();
  if (!triage || triage.status !== "termine") return { status: "error", message: M.needTriage };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const nonce = new Date().toISOString();
  const { data: existing } = await service
    .from("contact_runs")
    .select("status")
    .eq("plan_id", plan.id)
    .maybeSingle();
  if (existing && existing.status !== "echoue") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }
  const write = existing
    ? await service
        .from("contact_runs")
        .update({
          status: "en_cours",
          error_message: null,
          started_at: nonce,
          finished_at: null,
          requested_by: userId,
        })
        .eq("plan_id", plan.id)
        .eq("status", "echoue")
        .select("plan_id")
    : await service
        .from("contact_runs")
        .insert({
          plan_id: plan.id,
          workspace_id: plan.workspace_id,
          status: "en_cours",
          requested_by: userId,
          started_at: nonce,
        })
        .select("plan_id");
  if (write.error) return { status: "error", message: M.saveError };
  if (!write.data?.length) return { status: "ok", auditId, message: M.alreadyStarted };

  await supabase.from("events").insert({
    workspace_id: plan.workspace_id,
    actor_id: userId,
    type: "plan.contacts_started",
    payload: { audit_id: auditId, plan_id: plan.id },
  });
  try {
    await sendEvent({
      id: `plan-contacts-${plan.id}-${nonce}`,
      name: CONTACTS_EVENT,
      data: { planId: plan.id, workspaceId: plan.workspace_id },
    });
  } catch {
    await service
      .from("contact_runs")
      .update({ status: "echoue", error_message: M.sendFailed })
      .eq("plan_id", plan.id)
      .eq("status", "en_cours");
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}

export interface ContactRowView {
  itemId: string;
  status: string;
  email: string | null;
  verification: string;
  formUrl: string | null;
  reason: string;
  sendable: boolean;
}

export interface ContactsView {
  planId: string;
  /** Le tri des cibles est terminé : l'enquête peut être lancée. */
  triageDone: boolean;
  status: "aucun" | "en_cours" | "termine" | "echoue";
  error: string | null;
  rows: ContactRowView[];
  /** Cibles « ok » au tri, avec leur domaine. */
  items: { id: string; domain: string }[];
  openTasks: number;
}

/** État de la recherche de contacts (null : aucun plan validé). */
export async function loadContacts(
  supabase: Client,
  auditId: string,
): Promise<ContactsView | null> {
  const { data: plan } = await supabase
    .from("link_plans")
    .select("id")
    .eq("audit_id", auditId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const [triageRun, runRes, rowsRes, okRes, tasksRes] = await Promise.all([
    supabase.from("link_plan_triage_runs").select("status").eq("plan_id", plan.id).maybeSingle(),
    supabase
      .from("contact_runs")
      .select("status, error_message")
      .eq("plan_id", plan.id)
      .maybeSingle(),
    supabase.from("target_contacts_v").select("*").eq("plan_id", plan.id).limit(500),
    supabase
      .from("link_target_triage")
      .select("plan_item_id, link_plan_items(source_domain, position)")
      .eq("plan_id", plan.id)
      .eq("verdict", "ok")
      .limit(500),
    supabase
      .from("manual_tasks_v")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", plan.id)
      .eq("status", "a_faire"),
  ]);
  const items = (okRes.data ?? [])
    .map((r) => {
      const it = r.link_plan_items as unknown as { source_domain: string; position: number } | null;
      return it ? { id: r.plan_item_id, domain: it.source_domain, pos: it.position } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.pos - b.pos)
    .map(({ id, domain }) => ({ id, domain }));
  return {
    planId: plan.id,
    triageDone: triageRun.data?.status === "termine",
    status: (runRes.data?.status as ContactsView["status"] | undefined) ?? "aucun",
    error: runRes.data?.error_message ?? null,
    rows: (rowsRes.data ?? []).map((r) => ({
      itemId: r.plan_item_id,
      status: r.status,
      email: r.email,
      verification: r.verification,
      formUrl: r.form_url,
      reason: r.reason,
      sendable: r.sendable,
    })),
    items,
    openTasks: tasksRes.count ?? 0,
  };
}
