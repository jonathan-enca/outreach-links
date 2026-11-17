import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SIGNATURE_COLUMNS,
  signatureFromSite,
  signatureLines,
  splitSignoff,
  type Signature,
  type SignatureLine,
  type SignatureSiteRow,
} from "@/features/signature/signature";
import type { AuditActionState } from "@/features/audits/service";
import { lintMessage } from "@/features/drafting/lint";
import { completeTask } from "@/features/tasks/service";
import { missingDrafts } from "@/features/drafting/service";
import type { LintIssue } from "@/features/drafting/types";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
const M = t.toValidate.messages;

/**
 * Le message tel qu'il partira : le texte sans le prénom final, suivi de la signature des réglages
 * « Vos messages ». Le logo ne part que par email (un formulaire n'accepte que du texte).
 */
export interface SignedView {
  content: string;
  lines: SignatureLine[];
  logoUrl: string | null;
}

function signedView(body: string, s: Signature | null, withLogo: boolean): SignedView | null {
  if (!s) return null;
  return {
    content: splitSignoff(body, s).content,
    lines: signatureLines(s),
    logoUrl: withLogo ? s.logoUrl : null,
  };
}

/** Un premier message (email ou formulaire) qui attend l'accord de la personne. */
export interface PendingMessage {
  kind: "message";
  id: string;
  planId: string;
  channel: "email" | "formulaire";
  domain: string;
  campaign: string;
  /** Adresse du destinataire (email) ou adresse du formulaire. */
  to: string | null;
  subject: string | null;
  body: string;
  signed: SignedView | null;
  hook: string;
  reason: string;
  ready: boolean;
  issues: LintIssue[];
}

/** Une réponse proposée à un prospect qui a écrit. */
export interface PendingReply {
  kind: "reponse";
  id: string;
  classificationId: string | null;
  to: string | null;
  subject: string | null;
  body: string;
  signed: SignedView | null;
  /** Ce que le prospect a écrit (extrait). */
  theirs: string;
}

/**
 * Un formulaire de contact à remplir à la main. Pas d'approbation : on ne « mail » pas un formulaire.
 * La personne copie le message, ouvre le formulaire, le colle, puis clique « C'est fait ».
 */
export interface PendingForm {
  kind: "formulaire";
  /** Le brouillon du message (modifiable). */
  id: string;
  taskId: string;
  domain: string;
  campaign: string;
  formUrl: string;
  body: string;
  ready: boolean;
  issues: LintIssue[];
}

export interface QueueView {
  messages: PendingMessage[];
  replies: PendingReply[];
  forms: PendingForm[];
  hasMailbox: boolean;
  /** Cibles validées sans message (plafond de rédaction atteint), et rédaction en cours. */
  missing: number;
  drafting: boolean;
  /** Cibles écartées à la rédaction : aucune raison honnête de demander un lien (motif lisible). */
  declined: { domain: string; pageUrl: string | null; reason: string }[];
}

/**
 * Admissible à l'approbation : prêt (URL 200, linter vert), encore en brouillon, et pour un email un
 * contact vérifié. Un formulaire n'est jamais envoyé : il devient une tâche (pur, testé).
 */
export function isApprovable(d: {
  status: string;
  ready: boolean;
  channel: string;
  sendable: boolean;
}): boolean {
  return d.status === "brouillon" && d.ready && (d.channel === "formulaire" || d.sendable);
}

/** Tout ce qui attend l'accord de la personne, toutes campagnes confondues (RLS). */
export async function loadQueue(supabase: Client): Promise<QueueView> {
  const [drafts, replyDrafts, tasks, boxes, missing, declines] = await Promise.all([
    supabase
      .from("target_drafts")
      .select(
        "id, plan_id, plan_item_id, channel, subject, body, hook, targeting_reason, ready, status, lint_issues",
      )
      .eq("status", "brouillon")
      .limit(300),
    supabase
      .from("reply_drafts")
      .select("id, inbound_message_id, sent_message_id, subject, body, created_at")
      .eq("status", "brouillon")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("manual_tasks")
      .select("id, plan_id, plan_item_id, form_url")
      .eq("status", "a_faire")
      .limit(500),
    supabase
      .from("mailboxes")
      .select("id", { count: "exact", head: true })
      .eq("status", "verifiee"),
    missingDrafts(supabase),
    supabase
      .from("draft_declines")
      .select("reason, page_url, created_at, link_plan_items(source_domain)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  // Les formulaires ne passent pas par l'approbation : ils vont directement dans « Formulaires à remplir ».
  const d = (drafts.data ?? []).filter((x) => x.channel === "email");
  const taskRows = tasks.data ?? [];
  const itemIds = [
    ...new Set([...d.map((x) => x.plan_item_id), ...taskRows.map((x) => x.plan_item_id)]),
  ];
  const planIds = [...new Set([...d.map((x) => x.plan_id), ...taskRows.map((x) => x.plan_id)])];
  const r = replyDrafts.data ?? [];
  const [items, contacts, plans, inbound, sent, cls] = await Promise.all([
    itemIds.length
      ? supabase.from("link_plan_items").select("id, source_domain, position").in("id", itemIds)
      : { data: [] },
    itemIds.length
      ? supabase
          .from("target_contacts")
          .select("plan_item_id, email, sendable, form_url")
          .in("plan_item_id", itemIds)
      : { data: [] },
    planIds.length
      ? supabase
          .from("link_plans")
          .select(`id, sites(country, ${SIGNATURE_COLUMNS})`)
          .in("id", planIds)
      : { data: [] },
    r.length
      ? supabase
          .from("inbound_messages")
          .select("id, body_excerpt")
          .in(
            "id",
            r.map((x) => x.inbound_message_id),
          )
      : { data: [] },
    r.length
      ? supabase
          .from("sent_messages")
          .select("id, to_email, plan_id")
          .in(
            "id",
            r.map((x) => x.sent_message_id),
          )
      : { data: [] },
    r.length
      ? supabase
          .from("reply_classifications")
          .select("id, inbound_message_id")
          .in(
            "inbound_message_id",
            r.map((x) => x.inbound_message_id),
          )
      : { data: [] },
  ]);
  const itemMap = new Map((items.data ?? []).map((i) => [i.id, i]));
  const contactMap = new Map((contacts.data ?? []).map((c) => [c.plan_item_id, c]));
  const countries = t.sites.countries as Record<string, string>;
  type PlanSite = (SignatureSiteRow & { country: string | null }) | null;
  const planRows = [...((plans.data ?? []) as unknown as { id: string; sites: PlanSite }[])];
  // Les réponses peuvent venir d'un plan qui n'a plus de premier message en attente.
  const otherPlans = [...new Set((sent.data ?? []).map((s) => s.plan_id))].filter(
    (id) => !planRows.some((p) => p.id === id),
  );
  if (otherPlans.length) {
    const more = await supabase
      .from("link_plans")
      .select(`id, sites(country, ${SIGNATURE_COLUMNS})`)
      .in("id", otherPlans);
    planRows.push(...((more.data ?? []) as unknown as { id: string; sites: PlanSite }[]));
  }
  const campaignMap = new Map(
    planRows.map((p) => {
      const s = p.sites;
      return [
        p.id,
        s ? `${s.domain}${s.country ? ` · ${countries[s.country] ?? s.country}` : ""}` : "",
      ];
    }),
  );
  // Adresse relative du logo : l'écran est servi par la même application.
  const signatureMap = new Map(
    planRows.map((p) => [p.id, p.sites ? signatureFromSite(p.sites, "") : null]),
  );
  const messages: PendingMessage[] = d
    .map((x) => {
      const it = itemMap.get(x.plan_item_id);
      const c = contactMap.get(x.plan_item_id);
      const channel = x.channel as "email" | "formulaire";
      // Un email dont l'adresse n'est pas vérifiée ne peut pas partir : il reste hors de la file.
      if (!it || (channel === "email" && !c?.sendable)) return null;
      return {
        kind: "message" as const,
        id: x.id,
        planId: x.plan_id,
        channel,
        domain: it.source_domain,
        campaign: campaignMap.get(x.plan_id) ?? "",
        to: channel === "email" ? (c?.email ?? null) : (c?.form_url ?? null),
        subject: x.subject,
        body: x.body,
        signed: signedView(x.body, signatureMap.get(x.plan_id) ?? null, channel === "email"),
        hook: x.hook,
        reason: x.targeting_reason,
        ready: x.ready,
        issues: (Array.isArray(x.lint_issues) ? x.lint_issues : []) as unknown as LintIssue[],
        pos: it.position,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.campaign.localeCompare(b.campaign) || a.pos - b.pos)
    .map((x) => {
      const { pos, ...rest } = x;
      void pos;
      return rest;
    });
  // Message de chaque formulaire à remplir (brouillon ou déjà validé), sans condition de lot.
  const formItemIds = taskRows.map((x) => x.plan_item_id);
  const formDrafts = formItemIds.length
    ? ((
        await supabase
          .from("target_drafts")
          .select("id, plan_item_id, body, ready, lint_issues")
          .in("plan_item_id", formItemIds)
      ).data ?? [])
    : [];
  const inMap = new Map((inbound.data ?? []).map((i) => [i.id, i.body_excerpt]));
  const toMap = new Map((sent.data ?? []).map((s) => [s.id, s.to_email]));
  const sentPlan = new Map((sent.data ?? []).map((s) => [s.id, s.plan_id]));
  const clsMap = new Map((cls.data ?? []).map((c) => [c.inbound_message_id, c.id]));
  return {
    messages,
    replies: r.map((x) => ({
      kind: "reponse",
      id: x.id,
      classificationId: clsMap.get(x.inbound_message_id) ?? null,
      to: toMap.get(x.sent_message_id) ?? null,
      subject: x.subject,
      body: x.body,
      signed: signedView(
        x.body,
        signatureMap.get(sentPlan.get(x.sent_message_id) ?? "") ?? null,
        true,
      ),
      theirs: inMap.get(x.inbound_message_id) ?? "",
    })),
    forms: formDrafts
      .map((f): PendingForm | null => {
        const task = taskRows.find((x) => x.plan_item_id === f.plan_item_id);
        const it = itemMap.get(f.plan_item_id);
        if (!task || !it) return null;
        return {
          kind: "formulaire",
          id: f.id,
          taskId: task.id,
          domain: it.source_domain,
          campaign: campaignMap.get(task.plan_id) ?? "",
          formUrl: task.form_url,
          body: f.body,
          ready: f.ready,
          issues: (Array.isArray(f.lint_issues) ? f.lint_issues : []) as unknown as LintIssue[],
        };
      })
      .filter((x): x is PendingForm => x !== null),
    hasMailbox: (boxes.count ?? 0) > 0,
    missing: missing.total,
    drafting: missing.running,
    declined: (declines.data ?? []).map((r) => ({
      domain:
        (r.link_plan_items as unknown as { source_domain: string } | null)?.source_domain ?? "",
      pageUrl: r.page_url,
      reason: r.reason,
    })),
  };
}

/**
 * Approuve des premiers messages : ils rejoignent un lot validé (le même mécanisme que la validation
 * par lot, garde-fous de la base compris), ce qui autorise l'envoi des emails et fait apparaître les
 * formulaires dans les tâches. Un lot encore ouvert du même plan est réutilisé : il ne garde que les
 * messages approuvés ici. Rien n'est approuvé s'il n'est pas prêt.
 */
export async function approveMessages(
  supabase: Client,
  getServiceClient: () => Client,
  rawIds: readonly string[],
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;
  if (!uid) return { status: "error", message: M.unauthenticated };
  const ids = [...new Set(rawIds)].slice(0, 200);
  if (ids.length === 0) return { status: "error", message: M.nothing };
  // Lecture avec les droits de la personne : elle ne peut approuver que ses propres messages.
  const { data: drafts } = await supabase
    .from("target_drafts")
    .select("id, plan_id, plan_item_id, workspace_id, channel, ready, status")
    .in("id", ids);
  if (!drafts?.length) return { status: "error", message: M.notFound };
  const { data: contacts } = await supabase
    .from("target_contacts")
    .select("plan_item_id, sendable")
    .in(
      "plan_item_id",
      drafts.map((d) => d.plan_item_id),
    );
  const sendable = new Map((contacts ?? []).map((c) => [c.plan_item_id, c.sendable]));
  const ok = drafts.filter((d) =>
    isApprovable({ ...d, sendable: sendable.get(d.plan_item_id) === true }),
  );
  if (ok.length === 0) return { status: "error", message: M.notReady };
  // Un email ne s'approuve qu'avec une boîte d'envoi connectée et vérifiée pour son site : sans elle,
  // « Approuver et envoyer » ne pourrait rien envoyer (retour de Jonathan, 18/11).
  const emailPlans = [...new Set(ok.filter((d) => d.channel === "email").map((d) => d.plan_id))];
  if (emailPlans.length > 0) {
    const { data: plans } = await supabase
      .from("link_plans")
      .select("id, site_id")
      .in("id", emailPlans);
    const siteIds = [...new Set((plans ?? []).map((p) => p.site_id))];
    const { data: boxes } = await supabase
      .from("mailboxes")
      .select("site_id")
      .in("site_id", siteIds)
      .eq("status", "verifiee");
    const withBox = new Set((boxes ?? []).map((b) => b.site_id));
    if (siteIds.some((s) => !withBox.has(s))) return { status: "error", message: M.needMailbox };
  }
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  let approved = 0;
  for (const planId of new Set(ok.map((d) => d.plan_id))) {
    const chosen = ok.filter((d) => d.plan_id === planId);
    const wsId = chosen[0]!.workspace_id;
    const [{ data: open }, { data: last }, { data: used }] = await Promise.all([
      service.from("batches").select("id").eq("plan_id", planId).eq("status", "brouillon"),
      service
        .from("batches")
        .select("number")
        .eq("plan_id", planId)
        .order("number", { ascending: false })
        .limit(1),
      service.from("batch_items").select("draft_id, batch_id").eq("plan_id", planId),
    ]);
    let batchId = open?.[0]?.id ?? null;
    const chosenIds = new Set(chosen.map((d) => d.id));
    if (batchId) {
      // Lot ouvert : on en retire ce qui n'est pas approuvé maintenant (ces messages restent en attente).
      const extra = (used ?? []).filter(
        (u) => u.batch_id === batchId && !chosenIds.has(u.draft_id),
      );
      if (extra.length > 0) {
        const { error } = await service
          .from("batch_items")
          .delete()
          .eq("batch_id", batchId)
          .in(
            "draft_id",
            extra.map((e) => e.draft_id),
          );
        if (error) return { status: "error", message: M.saveError };
      }
    } else {
      const { data: batch, error } = await service
        .from("batches")
        .insert({
          plan_id: planId,
          workspace_id: wsId,
          number: (last?.[0]?.number ?? 0) + 1,
          status: "brouillon",
          created_by: uid,
        })
        .select("id")
        .single();
      if (error || !batch) return { status: "error", message: M.saveError };
      batchId = batch.id;
    }
    const already = new Set((used ?? []).map((u) => u.draft_id));
    const toAdd = chosen.filter((d) => !already.has(d.id));
    if (toAdd.length > 0) {
      const { error } = await service.from("batch_items").insert(
        toAdd.map((d, i) => ({
          batch_id: batchId!,
          draft_id: d.id,
          plan_id: planId,
          workspace_id: wsId,
          position: i + 1 + already.size,
        })),
      );
      if (error) return { status: "error", message: M.saveError };
    }
    const { error: vErr } = await service
      .from("batches")
      .update({ status: "valide", validated_at: new Date().toISOString(), validated_by: uid })
      .eq("id", batchId)
      .eq("status", "brouillon");
    if (vErr) return { status: "error", message: M.saveError };
    approved += chosen.length;
    await supabase.from("events").insert({
      workspace_id: wsId,
      actor_id: uid,
      type: "batch.validated",
      payload: { plan_id: planId, batch_id: batchId, size: chosen.length, origin: "a_valider" },
    });
  }
  return { status: "ok", message: M.approved(approved) };
}

/** Modification d'un premier message en attente : relu par le linter, « prêt » seulement s'il passe. */
export async function editPendingMessage(
  supabase: Client,
  getServiceClient: () => Client,
  draftId: string,
  input: { subject: string; body: string },
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  const { data: draft } = await supabase
    .from("target_drafts")
    .select("id, plan_id, channel, hook, proposed_url, url_status, status")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || draft.status !== "brouillon") return { status: "error", message: M.notFound };
  const { data: plan } = await supabase
    .from("link_plans")
    .select("sites(signature_first_name)")
    .eq("id", draft.plan_id)
    .maybeSingle();
  const sig = (plan?.sites as unknown as { signature_first_name: string | null } | null)
    ?.signature_first_name;
  if (!sig?.trim()) return { status: "error", message: t.drafts.messages.needSignature };
  const body = input.body.replace(/\r\n/g, "\n").trim();
  const subject = draft.channel === "email" ? input.subject.trim() : null;
  const issues = lintMessage({
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
  return { status: "ok", message: ready ? M.saved : M.savedNotReady };
}

/**
 * « C'est fait » pour un formulaire : le message collé dans le formulaire du site. Si le message n'a pas
 * encore été validé, il l'est ici (même mécanisme que les emails, garde-fous de la base compris), puis la
 * tâche est marquée faite et la relance prévue à J+10. Un message qui n'est pas prêt ne peut pas l'être.
 */
export async function completeForm(
  supabase: Client,
  getServiceClient: () => Client,
  draftId: string,
  taskId: string,
): Promise<AuditActionState> {
  const { data: draft } = await supabase
    .from("target_drafts")
    .select("id, status, ready")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft) return { status: "error", message: M.notFound };
  if (draft.status === "brouillon") {
    if (!draft.ready) return { status: "error", message: M.notReady };
    const r = await approveMessages(supabase, getServiceClient, [draftId]);
    if (r.status === "error") return r;
  }
  return completeTask(supabase, getServiceClient, taskId);
}
