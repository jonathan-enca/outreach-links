import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { t } from "@/lib/messages";
import { planIdsOfSite } from "@/features/shell/site-scope";
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
  reviewNote: string | null;
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
          reviewNote: r.review_note,
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

export interface MissingDrafts {
  /** Cibles validées et contactables qui n'ont pas encore de message. */
  total: number;
  plans: { planId: string; workspaceId: string; missing: number; status: string | null }[];
  /** Une rédaction tourne en ce moment. */
  running: boolean;
}

/**
 * Cibles sans message qu'une rédaction peut encore traiter, par plan (pur, testé) : contact trouvé, page
 * lue au tri, ni message écrit ni cible écartée faute d'angle.
 */
export function countMissing(
  contacts: readonly { plan_id: string; plan_item_id: string }[],
  triage: readonly { plan_item_id: string }[],
  drafts: readonly { plan_item_id: string }[],
  declines: readonly { plan_item_id: string; retry_requested?: boolean }[] = [],
): Map<string, number> {
  const draftable = new Set(triage.map((x) => x.plan_item_id));
  // Une cible écartée est traitée, sauf si la personne a demandé « rédiger quand même ».
  const done = new Set(
    [...drafts, ...declines.filter((d) => !d.retry_requested)].map((d) => d.plan_item_id),
  );
  const out = new Map<string, number>();
  for (const c of contacts) {
    if (!draftable.has(c.plan_item_id) || done.has(c.plan_item_id)) continue;
    out.set(c.plan_id, (out.get(c.plan_id) ?? 0) + 1);
  }
  return out;
}

/** Messages qui restent à rédiger pour la personne, toutes campagnes confondues (RLS). */
export async function missingDrafts(supabase: Client): Promise<MissingDrafts> {
  const [contacts, triage, drafts, runs, declines] = await Promise.all([
    supabase
      .from("target_contacts")
      .select("plan_id, plan_item_id, workspace_id")
      .in("status", ["email_verifie", "email_a_verifier", "formulaire"])
      .limit(3000),
    supabase
      .from("link_target_triage")
      .select("plan_item_id")
      .eq("verdict", "ok")
      .not("resolved_url", "is", null)
      .limit(3000),
    supabase.from("target_drafts").select("plan_item_id").limit(3000),
    supabase.from("draft_runs").select("plan_id, status").limit(500),
    supabase.from("draft_declines").select("plan_item_id, retry_requested").limit(3000),
  ]);
  const missing = countMissing(
    contacts.data ?? [],
    triage.data ?? [],
    drafts.data ?? [],
    declines.data ?? [],
  );
  const wsOf = new Map((contacts.data ?? []).map((c) => [c.plan_id, c.workspace_id]));
  const statusOf = new Map((runs.data ?? []).map((r) => [r.plan_id, r.status]));
  const plans = [...missing.entries()].map(([planId, n]) => ({
    planId,
    workspaceId: wsOf.get(planId) ?? "",
    missing: n,
    status: statusOf.get(planId) ?? null,
  }));
  return {
    total: plans.reduce((s, p) => s + p.missing, 0),
    plans,
    running: (runs.data ?? []).some((r) => r.status === "en_cours"),
  };
}

/**
 * Lance (ou relance) la rédaction d'un plan : une seule exécution à la fois, (absent | termine | echoue)
 * -> en_cours. Vrai si l'événement est parti.
 */
async function launchRun(
  service: Client,
  p: { planId: string; workspaceId: string; status: string | null },
  userId: string,
  sendEvent: SendEvent,
): Promise<boolean> {
  const nonce = new Date().toISOString();
  const write = p.status
    ? await service
        .from("draft_runs")
        .update({
          status: "en_cours",
          error_message: null,
          started_at: nonce,
          finished_at: null,
          requested_by: userId,
        })
        .eq("plan_id", p.planId)
        .in("status", ["termine", "echoue"])
        .select("plan_id")
    : await service
        .from("draft_runs")
        .insert({
          plan_id: p.planId,
          workspace_id: p.workspaceId,
          status: "en_cours",
          requested_by: userId,
          started_at: nonce,
        })
        .select("plan_id");
  if (write.error || !write.data?.length) return false;
  try {
    await sendEvent({
      id: `plan-drafts-${p.planId}-${nonce}`,
      name: DRAFTS_EVENT,
      data: { planId: p.planId, workspaceId: p.workspaceId },
    });
    return true;
  } catch {
    await service
      .from("draft_runs")
      .update({ status: "echoue", error_message: M.sendFailed })
      .eq("plan_id", p.planId)
      .eq("status", "en_cours");
    return false;
  }
}

/**
 * « Rédiger quand même » (MC.6e, décision du 18/11/2026) : la personne demande un message pour une cible
 * que la rédaction a écartée. La cible est marquée, puis la rédaction du plan est relancée ; elle saute
 * le tri et écrit avec la page du site la plus proche. Une rédaction déjà en cours reprendra la cible à
 * la prochaine exécution (« Rédiger les messages manquants »).
 */
export async function draftAnyway(
  supabase: Client,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
  itemId: string,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };
  // Lecture avec la session de la personne : la politique d'accès (RLS) vérifie qu'elle voit cette cible.
  const { data: decline } = await supabase
    .from("draft_declines")
    .select("plan_id, workspace_id")
    .eq("plan_item_id", itemId)
    .maybeSingle();
  if (!decline) return { status: "error", message: M.anywayUnknown };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await service
    .from("draft_declines")
    .update({ retry_requested: true })
    .eq("plan_item_id", itemId);
  if (error) return { status: "error", message: M.saveError };
  const { data: run } = await service
    .from("draft_runs")
    .select("status")
    .eq("plan_id", decline.plan_id)
    .maybeSingle();
  if (run?.status === "en_cours") return { status: "ok", message: M.anywayQueued };
  const sent = await launchRun(
    service,
    { planId: decline.plan_id, workspaceId: decline.workspace_id, status: run?.status ?? null },
    userId,
    sendEvent,
  );
  if (!sent) return { status: "error", message: M.sendFailed };
  await supabase.from("events").insert({
    workspace_id: decline.workspace_id,
    actor_id: userId,
    type: "plan.draft_anyway_requested",
    payload: { plan_item_id: itemId, plan_id: decline.plan_id },
  });
  return { status: "ok", message: M.anywayStarted };
}

/**
 * « Rédiger les messages manquants » : relance la rédaction des plans où des cibles validées n'ont pas
 * de message (plafond atteint, rédaction interrompue). Les messages déjà écrits ne sont jamais refaits
 * (`loadDraftInput` les saute). Mêmes plafonds de dépense que la première rédaction, par plan.
 */
export async function draftMissing(
  supabase: Client,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
  siteId: string | null = null,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };
  const m = await missingDrafts(supabase);
  // Le site choisi limite la rédaction à ses plans : on ne lance pas les autres sites à son insu.
  const sitePlans = siteId ? await planIdsOfSite(supabase, siteId) : null;
  const todo = m.plans.filter(
    (p) => p.status !== "en_cours" && (!sitePlans || sitePlans.has(p.planId)),
  );
  if (todo.length === 0)
    return { status: "ok", message: m.running ? M.alreadyStarted : M.nothingMissing };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  let started = 0;
  for (const p of todo) {
    if (await launchRun(service, p, userId, sendEvent)) started += p.missing;
  }
  if (started === 0) return { status: "error", message: M.sendFailed };
  await supabase.from("events").insert({
    workspace_id: todo[0]!.workspaceId,
    actor_id: userId,
    type: "plan.drafts_missing_started",
    payload: { plans: todo.map((p) => p.planId), missing: started },
  });
  return { status: "ok", message: M.missingStarted(started) };
}
