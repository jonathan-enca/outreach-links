import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SIGNATURE_COLUMNS,
  applySignature,
  signatureFromSite,
  type SignatureSiteRow,
} from "@/features/signature/signature";
import type { AuditActionState } from "@/features/audits/service";
import { SEND_LIMITS } from "@/features/sending/limits";
import { addDays } from "@/features/sending/schedule";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { buildFollowUpMessage } from "./followup-message";
import { planIdsOfSite } from "@/features/shell/site-scope";
import { taskState, type TaskView } from "./view";

type Client = SupabaseClient<Database>;
const M = t.tasks.messages;

type TaskRow = Database["public"]["Tables"]["manual_tasks"]["Row"];

/**
 * Tâches manuelles de l'utilisateur (la RLS limite à ses espaces). Seules les tâches dont le
 * message figure dans un lot VALIDÉ sont visibles : avant, rien n'est à faire.
 */
export async function listTasks(
  supabase: Client,
  siteId: string | null = null,
): Promise<TaskView[]> {
  const { data: tasks } = await supabase
    .from("manual_tasks")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(500);
  if (!tasks || tasks.length === 0) return [];
  const itemIds = tasks.map((x) => x.plan_item_id);
  const [{ data: items }, { data: drafts }] = await Promise.all([
    supabase.from("link_plan_items").select("id, source_domain, target_page_url").in("id", itemIds),
    supabase
      .from("target_drafts")
      .select("id, plan_id, plan_item_id, body, status")
      .in("plan_item_id", itemIds),
  ]);
  const validated = (drafts ?? []).filter((d) => d.status === "valide");
  // Signature des réglages « Vos messages », en texte : un formulaire n'accepte ni logo ni mise en forme.
  const planIds = [...new Set(validated.map((d) => d.plan_id))];
  const { data: plans } =
    planIds.length > 0
      ? await supabase
          .from("link_plans")
          .select(`id, sites(${SIGNATURE_COLUMNS})`)
          .in("id", planIds)
      : { data: [] };
  const signatureByPlan = new Map(
    ((plans ?? []) as unknown as { id: string; sites: SignatureSiteRow | null }[]).map((p) => [
      p.id,
      p.sites ? signatureFromSite(p.sites, "") : null,
    ]),
  );
  const { data: bi } =
    validated.length > 0
      ? await supabase
          .from("batch_items")
          .select("draft_id, batch_id")
          .in(
            "draft_id",
            validated.map((d) => d.id),
          )
      : { data: [] };
  const batchIds = [...new Set((bi ?? []).map((b) => b.batch_id))];
  const { data: batches } =
    batchIds.length > 0
      ? await supabase.from("batches").select("id, status").in("id", batchIds)
      : { data: [] };
  const validBatches = new Set(
    (batches ?? []).filter((b) => b.status === "valide").map((b) => b.id),
  );
  const okDrafts = new Set(
    (bi ?? []).filter((b) => validBatches.has(b.batch_id)).map((b) => b.draft_id),
  );
  const draftByItem = new Map(
    validated.filter((d) => okDrafts.has(d.id)).map((d) => [d.plan_item_id, d]),
  );
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const out: TaskView[] = [];
  // Filtre « un seul site » : une tâche se rattache au plan de son message.
  const sitePlans = siteId ? await planIdsOfSite(supabase, siteId) : null;
  for (const x of tasks) {
    if (sitePlans && !sitePlans.has(x.plan_id)) continue;
    const d = draftByItem.get(x.plan_item_id);
    const it = itemById.get(x.plan_item_id);
    if (!d || !it) continue;
    out.push({
      id: x.id,
      domain: it.source_domain,
      formUrl: x.form_url,
      targetUrl: it.target_page_url,
      message: applySignature(d.body, signatureByPlan.get(d.plan_id) ?? null),
      status: x.status,
      doneAt: x.done_at,
      // Relances à la main retirées (décision du 19/11/2026) : la page ne montre jamais de relance.
      followUpStatus: null,
      followUpDueAt: null,
      followUpMessage: null,
      followUpDoneAt: null,
      followUpCancelReason: null,
    });
  }
  return out;
}

/** Compteurs de rappel (écran, digest M6.3) : tâches à faire et relances dues. */
export async function countDueTasks(
  supabase: Client,
  now: Date = new Date(),
): Promise<{ toDo: number; followUps: number }> {
  const rows = await listTasks(supabase);
  let toDo = 0;
  let followUps = 0;
  for (const r of rows) {
    const s = taskState(r, now);
    if (s === "a_faire") toDo++;
    else if (s === "relance_due") followUps++;
  }
  return { toDo, followUps };
}

interface Loaded {
  task: TaskRow;
  userId: string;
}

async function load(supabase: Client, taskId: unknown): Promise<Loaded | AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  if (typeof taskId !== "string") return { status: "error", message: M.notFound };
  // Lecture par la RLS : l'utilisateur doit être membre de l'espace.
  const { data: task } = await supabase
    .from("manual_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { status: "error", message: M.notFound };
  return { task, userId: auth.user.id };
}

const isError = (x: Loaded | AuditActionState): x is AuditActionState => "status" in x;

/** Message d'erreur lisible pour un refus d'un garde-fou en base. */
function dbError(message: string): string {
  if (/lot n'est pas validé/.test(message)) return M.batchNotValidated;
  if (/trop tôt/.test(message)) return M.tooEarly;
  return M.saveError;
}

async function event(
  svc: Client,
  task: TaskRow,
  userId: string,
  type: string,
  extra: Record<string, string> = {},
) {
  await svc.from("events").insert({
    workspace_id: task.workspace_id,
    actor_id: userId,
    type,
    payload: { task_id: task.id, ...extra },
  });
}

/** « J'ai envoyé le message » : la tâche est faite, la relance est prévue à J+10. */
export async function completeTask(
  supabase: Client,
  serviceClient: () => Client,
  taskId: unknown,
  now: () => Date = () => new Date(),
): Promise<AuditActionState> {
  const l = await load(supabase, taskId);
  if (isError(l)) return l;
  const { task, userId } = l;
  if (task.status !== "a_faire") return { status: "error", message: M.notPending };

  const { data: item } = await supabase
    .from("link_plan_items")
    .select("target_page_url, plan_id")
    .eq("id", task.plan_item_id)
    .maybeSingle();
  const { data: plan } = item
    ? await supabase.from("link_plans").select("site_id").eq("id", item.plan_id).maybeSingle()
    : { data: null };
  const { data: site } = plan
    ? await supabase
        .from("sites")
        .select("signature_first_name")
        .eq("id", plan.site_id)
        .maybeSingle()
    : { data: null };
  const { data: draft } = await supabase
    .from("target_drafts")
    .select("proposed_url")
    .eq("plan_item_id", task.plan_item_id)
    .maybeSingle();
  const url = draft?.proposed_url ?? item?.target_page_url;
  if (!url) return { status: "error", message: M.notFound };

  const at = now();
  let svc: Client;
  try {
    svc = serviceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await svc
    .from("manual_tasks")
    .update({
      status: "fait",
      done_at: at.toISOString(),
      follow_up_status: "en_attente",
      follow_up_due_at: addDays(at, SEND_LIMITS.followUpDays).toISOString(),
      follow_up_message: buildFollowUpMessage({
        url,
        firstName: site?.signature_first_name ?? "",
      }),
    })
    .eq("id", task.id)
    .eq("status", "a_faire");
  if (error) return { status: "error", message: dbError(error.message) };
  await event(svc, task, userId, "task.done");
  return { status: "ok", message: M.done };
}

/** « J'ai envoyé la relance » : seulement quand elle est due (aussi refusé en base). */
export async function completeFollowUp(
  supabase: Client,
  serviceClient: () => Client,
  taskId: unknown,
  now: () => Date = () => new Date(),
): Promise<AuditActionState> {
  const l = await load(supabase, taskId);
  if (isError(l)) return l;
  const { task, userId } = l;
  if (task.status !== "fait" || task.follow_up_status !== "en_attente")
    return { status: "error", message: M.noFollowUp };
  const at = now();
  if (!task.follow_up_due_at || new Date(task.follow_up_due_at) > at)
    return { status: "error", message: M.tooEarly };
  let svc: Client;
  try {
    svc = serviceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await svc
    .from("manual_tasks")
    .update({ follow_up_status: "fait", follow_up_done_at: at.toISOString() })
    .eq("id", task.id)
    .eq("follow_up_status", "en_attente");
  if (error) return { status: "error", message: dbError(error.message) };
  await event(svc, task, userId, "task.follow_up_done");
  return { status: "ok", message: M.followUpDone };
}

export type CancelReason = "reponse" | "refus" | "abandon";
const REASONS: readonly string[] = ["reponse", "refus", "abandon"];

/** Réponse reçue, refus ou abandon : la relance est annulée, la tâche reste dans l'historique. */
export async function cancelFollowUp(
  supabase: Client,
  serviceClient: () => Client,
  taskId: unknown,
  reason: unknown,
): Promise<AuditActionState> {
  const l = await load(supabase, taskId);
  if (isError(l)) return l;
  const { task, userId } = l;
  if (typeof reason !== "string" || !REASONS.includes(reason))
    return { status: "error", message: M.saveError };
  if (task.status !== "fait" || task.follow_up_status !== "en_attente")
    return { status: "error", message: M.noFollowUp };
  let svc: Client;
  try {
    svc = serviceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await svc
    .from("manual_tasks")
    .update({ follow_up_status: "annulee", follow_up_cancel_reason: reason })
    .eq("id", task.id)
    .eq("follow_up_status", "en_attente");
  if (error) return { status: "error", message: dbError(error.message) };
  await event(svc, task, userId, "task.follow_up_cancelled", { reason });
  return { status: "ok", message: M.followUpCancelled };
}

/** Ignorer une cible : la tâche est close sans relance. */
export async function skipTask(
  supabase: Client,
  serviceClient: () => Client,
  taskId: unknown,
): Promise<AuditActionState> {
  const l = await load(supabase, taskId);
  if (isError(l)) return l;
  const { task, userId } = l;
  if (task.status !== "a_faire") return { status: "error", message: M.notPending };
  let svc: Client;
  try {
    svc = serviceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await svc
    .from("manual_tasks")
    .update({ status: "ignoree" })
    .eq("id", task.id)
    .eq("status", "a_faire");
  if (error) return { status: "error", message: dbError(error.message) };
  await event(svc, task, userId, "task.skipped");
  return { status: "ok", message: M.skipped };
}
