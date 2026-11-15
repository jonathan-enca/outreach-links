import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { DRAFTS_EVENT } from "./run";
import type { LintIssue } from "./types";

type Client = SupabaseClient<Database>;
const M = t.drafts.messages;

/**
 * Lance la rédaction des messages des cibles contactables. Exige la recherche de contacts
 * terminée et un prénom de signature. Une exécution par plan : (absent | echoue) -> en_cours.
 */
export async function startDrafts(
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
  const { data: contacts } = await supabase
    .from("contact_runs")
    .select("status")
    .eq("plan_id", plan.id)
    .maybeSingle();
  if (!contacts || contacts.status !== "termine")
    return { status: "error", message: M.needContacts };
  const { data: audit } = await supabase
    .from("audits")
    .select("sites(signature_first_name)")
    .eq("id", auditId)
    .maybeSingle();
  const sig = (audit?.sites as unknown as { signature_first_name: string | null } | null)
    ?.signature_first_name;
  if (!sig?.trim()) return { status: "error", message: M.needSignature };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const nonce = new Date().toISOString();
  const { data: existing } = await service
    .from("draft_runs")
    .select("status")
    .eq("plan_id", plan.id)
    .maybeSingle();
  if (existing && existing.status !== "echoue") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }
  const write = existing
    ? await service
        .from("draft_runs")
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
        .from("draft_runs")
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
    type: "plan.drafts_started",
    payload: { audit_id: auditId, plan_id: plan.id },
  });
  try {
    await sendEvent({
      id: `plan-drafts-${plan.id}-${nonce}`,
      name: DRAFTS_EVENT,
      data: { planId: plan.id, workspaceId: plan.workspace_id },
    });
  } catch {
    await service
      .from("draft_runs")
      .update({ status: "echoue", error_message: M.sendFailed })
      .eq("plan_id", plan.id)
      .eq("status", "en_cours");
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}

export interface DraftRowView {
  itemId: string;
  domain: string;
  channel: "email" | "formulaire";
  subject: string | null;
  body: string;
  hook: string;
  targetingReason: string;
  proposedUrl: string;
  urlStatus: number | null;
  issues: LintIssue[];
  ready: boolean;
}

export interface DraftsView {
  planId: string;
  /** La recherche de contacts est terminée : la rédaction peut être lancée. */
  contactsDone: boolean;
  status: "aucun" | "en_cours" | "termine" | "echoue";
  error: string | null;
  rows: DraftRowView[];
}

export async function loadDrafts(supabase: Client, auditId: string): Promise<DraftsView | null> {
  const { data: plan } = await supabase
    .from("link_plans")
    .select("id")
    .eq("audit_id", auditId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const [contactRun, runRes, rowsRes] = await Promise.all([
    supabase.from("contact_runs").select("status").eq("plan_id", plan.id).maybeSingle(),
    supabase
      .from("draft_runs")
      .select("status, error_message")
      .eq("plan_id", plan.id)
      .maybeSingle(),
    supabase
      .from("target_drafts")
      .select("*, link_plan_items(source_domain, position)")
      .eq("plan_id", plan.id)
      .limit(500),
  ]);
  const rows = (rowsRes.data ?? [])
    .map((r) => {
      const it = r.link_plan_items as unknown as { source_domain: string; position: number } | null;
      return {
        pos: it?.position ?? 0,
        view: {
          itemId: r.plan_item_id,
          domain: it?.source_domain ?? "",
          channel: r.channel as "email" | "formulaire",
          subject: r.subject,
          body: r.body,
          hook: r.hook,
          targetingReason: r.targeting_reason,
          proposedUrl: r.proposed_url,
          urlStatus: r.url_status,
          issues: (Array.isArray(r.lint_issues) ? r.lint_issues : []) as unknown as LintIssue[],
          ready: r.ready,
        } satisfies DraftRowView,
      };
    })
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.view);
  return {
    planId: plan.id,
    contactsDone: contactRun.data?.status === "termine",
    status: (runRes.data?.status as DraftsView["status"] | undefined) ?? "aucun",
    error: runRes.data?.error_message ?? null,
    rows,
  };
}
