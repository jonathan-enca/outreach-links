import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { lintMessage } from "@/features/drafting/lint";
import type { LintIssue } from "@/features/drafting/types";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { clampBatchSize } from "./limits";
import { pickEligible, type Candidate } from "./select";

type Client = SupabaseClient<Database>;
const M = t.batches.messages;

async function currentPlan(supabase: Client, auditId: string) {
  const { data } = await supabase
    .from("link_plans")
    .select("id, workspace_id")
    .eq("audit_id", auditId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function userId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Crée un lot avec les N premiers messages admissibles. Un seul lot en brouillon à la fois. */
export async function createBatch(
  supabase: Client,
  auditId: string,
  rawSize: unknown,
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  const plan = await currentPlan(supabase, auditId);
  if (!plan) return { status: "error", message: M.noPlan };
  const size = clampBatchSize(rawSize);

  const [{ data: open }, { data: last }, { data: drafts }, { data: contacts }, { data: used }] =
    await Promise.all([
      supabase.from("batches").select("id").eq("plan_id", plan.id).eq("status", "brouillon"),
      supabase
        .from("batches")
        .select("number")
        .eq("plan_id", plan.id)
        .order("number", { ascending: false })
        .limit(1),
      supabase
        .from("target_drafts")
        .select("id, plan_item_id, channel, ready, status, link_plan_items(position)")
        .eq("plan_id", plan.id)
        .limit(500),
      supabase.from("target_contacts").select("plan_item_id, sendable").eq("plan_id", plan.id),
      supabase.from("batch_items").select("draft_id").eq("plan_id", plan.id),
    ]);
  if (open && open.length > 0) return { status: "error", message: M.openExists };

  const sendable = new Map((contacts ?? []).map((c) => [c.plan_item_id, c.sendable]));
  const candidates: Candidate[] = (drafts ?? []).map((d) => ({
    draftId: d.id,
    position: (d.link_plan_items as unknown as { position: number } | null)?.position ?? 0,
    channel: d.channel as "email" | "formulaire",
    ready: d.ready,
    status: d.status,
    sendable: sendable.get(d.plan_item_id) === true,
  }));
  const picked = pickEligible(candidates, new Set((used ?? []).map((u) => u.draft_id)), size);
  if (picked.length === 0) return { status: "error", message: M.nothingEligible };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const number = (last?.[0]?.number ?? 0) + 1;
  const { data: batch, error } = await service
    .from("batches")
    .insert({
      plan_id: plan.id,
      workspace_id: plan.workspace_id,
      number,
      status: "brouillon",
      created_by: uid,
    })
    .select("id")
    .single();
  if (error || !batch) return { status: "error", message: M.saveError };
  const { error: itemsError } = await service.from("batch_items").insert(
    picked.map((p, i) => ({
      batch_id: batch.id,
      draft_id: p.draftId,
      plan_id: plan.id,
      workspace_id: plan.workspace_id,
      position: i + 1,
    })),
  );
  if (itemsError) {
    await service.from("batch_items").delete().eq("batch_id", batch.id);
    return { status: "error", message: M.saveError };
  }
  await supabase.from("events").insert({
    workspace_id: plan.workspace_id,
    actor_id: uid,
    type: "batch.created",
    payload: { audit_id: auditId, batch_id: batch.id, number, size: picked.length },
  });
  return { status: "ok", auditId, message: M.created.replace("{n}", String(picked.length)) };
}

/** Charge un brouillon d'un lot non validé (RLS : l'utilisateur doit voir le lot). */
async function editableDraft(supabase: Client, batchId: string, draftId: string) {
  const { data: batch } = await supabase
    .from("batches")
    .select("id, status, plan_id, workspace_id")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return { error: M.notFound } as const;
  if (batch.status !== "brouillon") return { error: M.locked } as const;
  const { data: item } = await supabase
    .from("batch_items")
    .select("draft_id")
    .eq("batch_id", batchId)
    .eq("draft_id", draftId)
    .maybeSingle();
  if (!item) return { error: M.notFound } as const;
  return { batch } as const;
}

/** Modification d'un message par l'utilisateur : relu par le linter, « prêt » seulement s'il passe. */
export async function editDraft(
  supabase: Client,
  auditId: string,
  batchId: string,
  draftId: string,
  input: { subject: string; body: string },
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  const found = await editableDraft(supabase, batchId, draftId);
  if ("error" in found) return { status: "error", message: found.error };
  const { data: draft } = await supabase
    .from("target_drafts")
    .select("id, channel, hook, proposed_url, url_status")
    .eq("id", draftId)
    .maybeSingle();
  const { data: audit } = await supabase
    .from("audits")
    .select("sites(signature_first_name)")
    .eq("id", auditId)
    .maybeSingle();
  const sig = (audit?.sites as unknown as { signature_first_name: string | null } | null)
    ?.signature_first_name;
  if (!draft || !sig?.trim()) return { status: "error", message: M.notFound };

  const body = input.body.replace(/\r\n/g, "\n").trim();
  const subject = draft.channel === "email" ? input.subject.trim() : null;
  const issues: LintIssue[] = lintMessage({
    channel: draft.channel as "email" | "formulaire",
    subject,
    body,
    proposedUrl: draft.proposed_url,
    allowAnyUrl: true,
    signatureFirstName: sig,
  });
  const ready = issues.length === 0 && draft.url_status === 200;
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await service
    .from("target_drafts")
    .update({
      subject,
      body,
      lint_issues: issues as unknown as never,
      ready,
      edited_by_user: true,
      edited_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("status", "brouillon");
  if (error) return { status: "error", message: M.saveError };
  await supabase.from("events").insert({
    workspace_id: found.batch.workspace_id,
    actor_id: uid,
    type: "batch.draft_edited",
    payload: { audit_id: auditId, batch_id: batchId, draft_id: draftId, ready },
  });
  return {
    status: "ok",
    auditId,
    message: ready ? M.savedReady : M.savedNotReady,
  };
}

/** Retire un message du lot (lot non validé). Le brouillon reste disponible pour un autre lot. */
export async function removeFromBatch(
  supabase: Client,
  auditId: string,
  batchId: string,
  draftId: string,
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  const found = await editableDraft(supabase, batchId, draftId);
  if ("error" in found) return { status: "error", message: found.error };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await service
    .from("batch_items")
    .delete()
    .eq("batch_id", batchId)
    .eq("draft_id", draftId);
  if (error) return { status: "error", message: M.saveError };
  await supabase.from("events").insert({
    workspace_id: found.batch.workspace_id,
    actor_id: uid,
    type: "batch.draft_removed",
    payload: { audit_id: auditId, batch_id: batchId, draft_id: draftId },
  });
  return { status: "ok", auditId, message: M.removed };
}

/** Validation du lot entier. Les gardes (lot non vide, tout prêt, verrouillage) sont en base. */
export async function validateBatch(
  supabase: Client,
  auditId: string,
  batchId: string,
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  const { data: batch } = await supabase
    .from("batches")
    .select("id, status, workspace_id")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return { status: "error", message: M.notFound };
  if (batch.status === "valide") return { status: "ok", auditId, message: M.alreadyValidated };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const now = new Date().toISOString();
  const { error } = await service
    .from("batches")
    .update({ status: "valide", validated_at: now, validated_by: uid })
    .eq("id", batchId)
    .eq("status", "brouillon");
  if (error) {
    if (/vide/.test(error.message)) return { status: "error", message: M.emptyBatch };
    if (/non prêts/.test(error.message)) return { status: "error", message: M.notAllReady };
    return { status: "error", message: M.saveError };
  }
  await supabase.from("events").insert({
    workspace_id: batch.workspace_id,
    actor_id: uid,
    type: "batch.validated",
    payload: { audit_id: auditId, batch_id: batchId },
  });
  return { status: "ok", auditId, message: M.validated };
}

export interface BatchItemView {
  draftId: string;
  domain: string;
  /** La demande à faire : page à proposer, ancre, nature du lien. */
  request: string;
  targetingReason: string;
  triageReason: string | null;
  hook: string;
  email: string | null;
  channel: "email" | "formulaire";
  /** Lien du formulaire de contact à remplir à la main (canal formulaire). */
  formUrl: string | null;
  subject: string | null;
  body: string;
  ready: boolean;
  edited: boolean;
  issues: LintIssue[];
}

export interface BatchView {
  id: string;
  number: number;
  status: "brouillon" | "valide";
  validatedAt: string | null;
  items: BatchItemView[];
}

export interface BatchesView {
  planId: string;
  draftsDone: boolean;
  eligible: number;
  batches: BatchView[];
}

export async function loadBatches(supabase: Client, auditId: string): Promise<BatchesView | null> {
  const plan = await currentPlan(supabase, auditId);
  if (!plan) return null;
  const [run, batches, items, drafts, contacts, triage, planItems] = await Promise.all([
    supabase.from("draft_runs").select("status").eq("plan_id", plan.id).maybeSingle(),
    supabase
      .from("batches")
      .select("id, number, status, validated_at")
      .eq("plan_id", plan.id)
      .order("number"),
    supabase.from("batch_items").select("batch_id, draft_id, position").eq("plan_id", plan.id),
    supabase.from("target_drafts").select("*").eq("plan_id", plan.id).limit(500),
    supabase
      .from("target_contacts")
      .select("plan_item_id, email, sendable, form_url")
      .eq("plan_id", plan.id),
    supabase.from("link_target_triage").select("plan_item_id, reason").eq("plan_id", plan.id),
    supabase
      .from("link_plan_items")
      .select("id, source_domain, position, target_page_url, anchor_text, expected_link_type")
      .eq("plan_id", plan.id),
  ]);
  const draftById = new Map((drafts.data ?? []).map((d) => [d.id, d]));
  const contactByItem = new Map((contacts.data ?? []).map((c) => [c.plan_item_id, c]));
  const triageByItem = new Map((triage.data ?? []).map((x) => [x.plan_item_id, x.reason]));
  const planItemById = new Map((planItems.data ?? []).map((p) => [p.id, p]));
  const usedDrafts = new Set((items.data ?? []).map((i) => i.draft_id));

  const candidates: Candidate[] = (drafts.data ?? []).map((d) => ({
    draftId: d.id,
    position: planItemById.get(d.plan_item_id)?.position ?? 0,
    channel: d.channel as "email" | "formulaire",
    ready: d.ready,
    status: d.status,
    sendable: contactByItem.get(d.plan_item_id)?.sendable === true,
  }));

  const views: BatchView[] = (batches.data ?? []).map((b) => ({
    id: b.id,
    number: b.number,
    status: b.status as "brouillon" | "valide",
    validatedAt: b.validated_at,
    items: (items.data ?? [])
      .filter((i) => i.batch_id === b.id)
      .sort((x, y) => x.position - y.position)
      .flatMap((i) => {
        const d = draftById.get(i.draft_id);
        if (!d) return [];
        const p = planItemById.get(d.plan_item_id);
        return [
          {
            draftId: d.id,
            domain: p?.source_domain ?? "",
            request: t.batches.request
              .replace("{url}", p?.target_page_url ?? d.proposed_url)
              .replace("{anchor}", p?.anchor_text ?? ""),
            targetingReason: d.targeting_reason,
            triageReason: triageByItem.get(d.plan_item_id) ?? null,
            hook: d.hook,
            email: contactByItem.get(d.plan_item_id)?.email ?? null,
            channel: d.channel as "email" | "formulaire",
            formUrl: contactByItem.get(d.plan_item_id)?.form_url ?? null,
            subject: d.subject,
            body: d.body,
            ready: d.ready,
            edited: d.edited_by_user,
            issues: (Array.isArray(d.lint_issues) ? d.lint_issues : []) as unknown as LintIssue[],
          } satisfies BatchItemView,
        ];
      }),
  }));
  return {
    planId: plan.id,
    draftsDone: run.data?.status === "termine",
    eligible: pickEligible(candidates, usedDrafts, Number.MAX_SAFE_INTEGER).length,
    batches: views,
  };
}
