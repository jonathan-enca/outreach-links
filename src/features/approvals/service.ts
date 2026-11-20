import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
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
import { betaEnabled } from "@/features/audits/beta";
import { loadEntitlements, sendBlock } from "@/features/billing/entitlements";
import { lintMessage } from "@/features/drafting/lint";
import { completeTask } from "@/features/tasks/service";
import { missingDrafts } from "@/features/drafting/service";
import { formatSendTime } from "@/features/sending/queue-note";
import { planIdsOfSite } from "@/features/shell/site-scope";
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
  /**
   * Campagne de l'élément : le site. Plusieurs plans de liens d'un même site forment une seule campagne
   * (comme sur l'écran « Campagnes »). Absent : le plan lui-même.
   */
  campaignId?: string;
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
  /** Réserve du rédacteur à relire avant l'envoi (lien unique, ancre optimisée...), jamais bloquante. */
  reviewNote: string | null;
  /** Remis à plus tard jusqu'à cette date (ISO) : hors de la file tant qu'elle n'est pas passée. */
  snoozedUntil: string | null;
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
  snoozedUntil: string | null;
  planId: string;
  /**
   * Campagne de l'élément : le site. Plusieurs plans de liens d'un même site forment une seule campagne
   * (comme sur l'écran « Campagnes »). Absent : le plan lui-même.
   */
  campaignId?: string;
  campaign: string;
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
  snoozedUntil: string | null;
  planId: string;
  /**
   * Campagne de l'élément : le site. Plusieurs plans de liens d'un même site forment une seule campagne
   * (comme sur l'écran « Campagnes »). Absent : le plan lui-même.
   */
  campaignId?: string;
}

/** Un élément remis à plus tard : de quoi le reconnaître, sa campagne et quand il revient. */
export interface SnoozedItem {
  id: string;
  nature: "reponses" | "messages" | "formulaires";
  /** Site contacté, ou adresse du correspondant pour une réponse. */
  title: string;
  line: string;
  planId: string;
  /**
   * Campagne de l'élément : le site. Plusieurs plans de liens d'un même site forment une seule campagne
   * (comme sur l'écran « Campagnes »). Absent : le plan lui-même.
   */
  campaignId?: string;
  campaign: string;
  until: string;
  /** Moment du retour, en clair (« jeudi 19 novembre vers 14 h 30 »). */
  returns: string;
}

/** Fuseau d'affichage des retours de « Plus tard » : le produit est français d'abord. */
const DISPLAY_TIMEZONE = "Europe/Paris";

export interface QueueView {
  /** Campagnes présentes dans la file (une par site), pour filtrer et ne rien mélanger. */
  campaigns: { id: string; label: string }[];
  messages: PendingMessage[];
  replies: PendingReply[];
  forms: PendingForm[];
  hasMailbox: boolean;
  /** Éléments remis à plus tard (hors de la file et du compteur jusqu'à leur date). */
  snoozed: number;
  later: SnoozedItem[];
  /** Un message a déjà été approuvé un jour : une file vide veut alors dire « tout est traité ». */
  handled: boolean;
  /** Messages déjà approuvés (statut « valide »), pour le bloc de progression. */
  approved: number;
  /** Cibles validées sans message (plafond de rédaction atteint), et rédaction en cours. */
  missing: number;
  drafting: boolean;
  /** Cibles écartées à la rédaction : aucune raison honnête de demander un lien (motif lisible). */
  declined: { itemId: string; domain: string; pageUrl: string | null; reason: string }[];
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

/** Un élément est « remis à plus tard » tant que sa date n'est pas passée (pur, testé). */
export function isSnoozed(until: string | null, now: Date): boolean {
  return until !== null && Date.parse(until) > now.getTime();
}

/** Durée d'un « Plus tard » : jusqu'à demain à la même heure. */
export const SNOOZE_HOURS = 24;

/** Tout ce qui attend l'accord de la personne, toutes campagnes confondues (RLS). */
export async function loadQueue(
  supabase: Client,
  now: Date = new Date(),
  siteId: string | null = null,
): Promise<QueueView> {
  // Filtre « un seul site » : seuls les éléments dont le plan est à ce site restent (reportés compris).
  // Lu en même temps que le reste : chaque aller-retour vers la base compte dans le temps d'affichage.
  const [inSite, drafts, replyDrafts, tasks, boxes, missing, declines, handled] = await Promise.all(
    [
      siteId ? planIdsOfSite(supabase, siteId) : null,
      supabase
        .from("target_drafts")
        .select(
          "id, plan_id, plan_item_id, channel, subject, body, hook, targeting_reason, ready, status, lint_issues, review_note, snoozed_until",
        )
        .eq("status", "brouillon")
        .limit(300),
      supabase
        .from("reply_drafts")
        .select("id, inbound_message_id, sent_message_id, subject, body, created_at, snoozed_until")
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
        .select(
          "plan_id, plan_item_id, reason, page_url, created_at, link_plan_items(source_domain)",
        )
        .eq("declined_by", "utilisateur")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("target_drafts")
        .select("id", { count: "exact", head: true })
        .neq("status", "brouillon"),
    ],
  );
  const inScope = (x: { planId: string }) => !inSite || inSite.has(x.planId);
  // Cibles sans message et cibles écartées : comptées pour le site choisi seulement.
  const missingPlans = missing.plans.filter((p) => !inSite || inSite.has(p.planId));
  const missingTotal = missingPlans.reduce((s, p) => s + p.missing, 0);
  const missingRunning = missingPlans.some((p) => p.status === "en_cours");
  // Les formulaires ne passent pas par l'approbation : ils vont directement dans « Formulaires à remplir ».
  const d = (drafts.data ?? []).filter((x) => x.channel === "email");
  const taskRows = tasks.data ?? [];
  const itemIds = [
    ...new Set([...d.map((x) => x.plan_item_id), ...taskRows.map((x) => x.plan_item_id)]),
  ];
  const planIds = [...new Set([...d.map((x) => x.plan_id), ...taskRows.map((x) => x.plan_id)])];
  const r = replyDrafts.data ?? [];
  // Message de chaque formulaire à remplir (brouillon ou déjà validé), sans condition de lot.
  const formItemIds = taskRows.map((x) => x.plan_item_id);
  const [items, contacts, plans, inbound, sent, cls, formDraftRows] = await Promise.all([
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
          .select(`id, site_id, sites(country, ${SIGNATURE_COLUMNS})`)
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
    formItemIds.length
      ? supabase
          .from("target_drafts")
          .select("id, plan_item_id, body, ready, lint_issues, snoozed_until")
          .in("plan_item_id", formItemIds)
      : { data: [] },
  ]);
  const itemMap = new Map((items.data ?? []).map((i) => [i.id, i]));
  const contactMap = new Map((contacts.data ?? []).map((c) => [c.plan_item_id, c]));
  const countries = t.sites.countries as Record<string, string>;
  type PlanSite = (SignatureSiteRow & { country: string | null }) | null;
  type PlanRow = { id: string; site_id: string | null; sites: PlanSite };
  const planRows = [...((plans.data ?? []) as unknown as PlanRow[])];
  // Les réponses peuvent venir d'un plan qui n'a plus de premier message en attente.
  const otherPlans = [...new Set((sent.data ?? []).map((s) => s.plan_id))].filter(
    (id) => !planRows.some((p) => p.id === id),
  );
  if (otherPlans.length) {
    const more = await supabase
      .from("link_plans")
      .select(`id, site_id, sites(country, ${SIGNATURE_COLUMNS})`)
      .in("id", otherPlans);
    planRows.push(...((more.data ?? []) as unknown as PlanRow[]));
  }
  // Une campagne est un site : les plans d'un même site (une analyse relancée) n'en font qu'une.
  const siteOfPlan = new Map(planRows.map((p) => [p.id, p.site_id]));
  const campaignIdOf = (planId: string) => siteOfPlan.get(planId) ?? planId;
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
        campaignId: campaignIdOf(x.plan_id),
        channel,
        domain: it.source_domain,
        campaign: campaignMap.get(x.plan_id) ?? "",
        to: channel === "email" ? (c?.email ?? null) : (c?.form_url ?? null),
        subject: x.subject,
        body: x.body,
        signed: signedView(x.body, signatureMap.get(x.plan_id) ?? null, channel === "email"),
        hook: x.hook,
        reason: x.targeting_reason,
        reviewNote: x.review_note,
        snoozedUntil: x.snoozed_until,
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
  const formDrafts = formDraftRows.data ?? [];
  const inMap = new Map((inbound.data ?? []).map((i) => [i.id, i.body_excerpt]));
  const toMap = new Map((sent.data ?? []).map((s) => [s.id, s.to_email]));
  const sentPlan = new Map((sent.data ?? []).map((s) => [s.id, s.plan_id]));
  const clsMap = new Map((cls.data ?? []).map((c) => [c.inbound_message_id, c.id]));
  const allReplies: PendingReply[] = r.map((x) => ({
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
    snoozedUntil: x.snoozed_until,
    planId: sentPlan.get(x.sent_message_id) ?? "",
    campaignId: campaignIdOf(sentPlan.get(x.sent_message_id) ?? ""),
    campaign: campaignMap.get(sentPlan.get(x.sent_message_id) ?? "") ?? "",
  }));
  const allForms = formDrafts
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
        snoozedUntil: f.snoozed_until,
        planId: task.plan_id,
        campaignId: campaignIdOf(task.plan_id),
      };
    })
    .filter((x): x is PendingForm => x !== null);
  const due = (x: { snoozedUntil: string | null }) => !isSnoozed(x.snoozedUntil, now);
  const snoozedItem = (
    x: { id: string; planId: string; campaign: string; snoozedUntil: string | null },
    nature: SnoozedItem["nature"],
    title: string,
    line: string,
  ): SnoozedItem => ({
    id: x.id,
    nature,
    title,
    line,
    planId: x.planId,
    campaignId: campaignIdOf(x.planId),
    campaign: x.campaign,
    until: x.snoozedUntil ?? "",
    returns: x.snoozedUntil
      ? formatSendTime(new Date(x.snoozedUntil), DISPLAY_TIMEZONE, false)
      : "",
  });
  const later: SnoozedItem[] = [
    ...allReplies
      .filter((x) => !due(x))
      .map((x) => snoozedItem(x, "reponses", x.to ?? "", x.theirs ? `« ${x.theirs} »` : "")),
    ...messages
      .filter((x) => !due(x))
      .map((x) => snoozedItem(x, "messages", x.domain, x.subject ?? "")),
    ...allForms
      .filter((x) => !due(x))
      .map((x) => snoozedItem(x, "formulaires", x.domain, t.toValidate.formSubject)),
  ]
    .filter(inScope)
    .sort((a, b) => a.until.localeCompare(b.until));
  const seen = new Map<string, string>();
  for (const x of [...messages, ...allReplies, ...allForms].filter(inScope))
    if (x.planId && !seen.has(campaignIdOf(x.planId)))
      seen.set(campaignIdOf(x.planId), campaignMap.get(x.planId) ?? "");
  return {
    campaigns: [...seen]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    messages: messages.filter(due).filter(inScope),
    replies: allReplies.filter(due).filter(inScope),
    forms: allForms.filter(due).filter(inScope),
    snoozed: later.length,
    later,
    handled: (handled.count ?? 0) > 0,
    approved: handled.count ?? 0,
    hasMailbox: (boxes.count ?? 0) > 0,
    missing: missingTotal,
    drafting: missingRunning,
    declined: (declines.data ?? [])
      .filter((r) => !inSite || inSite.has(r.plan_id))
      .map((r) => ({
        itemId: r.plan_item_id,
        domain:
          (r.link_plan_items as unknown as { source_domain: string } | null)?.source_domain ?? "",
        pageUrl: r.page_url,
        reason: r.reason,
      })),
  };
}

/**
 * La file d'un rendu de page, calculée une seule fois : le menu (compteurs) et l'écran « À valider »
 * lisent la même (même client grâce à `createClient`, même site choisi).
 */
export const loadQueueOnce = cache((supabase: Client, siteId: string | null) =>
  loadQueue(supabase, new Date(), siteId),
);

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
  // Forfait (décision du 19/11/2026) : le gratuit prépare tout mais n'approuve aucun envoi ; un
  // abonné ne dépasse pas son plafond mensuel. Le contrôle est fait ici, au bouton, pas seulement
  // au moteur d'envoi.
  const ent = await loadEntitlements(supabase, ok[0].workspace_id, new Date(), betaEnabled());
  const blocked = sendBlock(ent);
  if (blocked) return { status: "error", message: blocked };
  // Un email ne s'approuve qu'avec une boîte d'envoi connectée et vérifiée pour son site : sans elle,
  // « Approuver et envoyer » ne pourrait rien envoyer (retour de Jonathan, 18/11).
  const emailPlans = [...new Set(ok.filter((d) => d.channel === "email").map((d) => d.plan_id))];
  if (emailPlans.length > 0) {
    const { data: plans } = await supabase
      .from("link_plans")
      .select("id, site_id")
      .in("id", emailPlans);
    const siteIds = [...new Set((plans ?? []).map((p) => p.site_id))];
    const { data: links } = await supabase
      .from("mailbox_sites")
      .select("site_id, mailboxes!inner(status)")
      .in("site_id", siteIds)
      .eq("mailboxes.status", "verifiee");
    const withBox = new Set((links ?? []).map((b) => b.site_id));
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

/**
 * « Plus tard » durable : les éléments choisis sortent de la file (et du compteur) pendant 24 h.
 * Les identifiants peuvent être ceux de messages, de réponses ou de formulaires (brouillons).
 * Lecture avec les droits de la personne : elle ne peut remettre à plus tard que ce qu'elle voit.
 */
export async function snoozeItems(
  supabase: Client,
  getServiceClient: () => Client,
  rawIds: readonly string[],
  now: Date = new Date(),
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  const ids = [...new Set(rawIds)].slice(0, 500);
  if (ids.length === 0) return { status: "error", message: M.nothing };
  const [d, r] = await Promise.all([
    supabase.from("target_drafts").select("id").in("id", ids).eq("status", "brouillon"),
    supabase.from("reply_drafts").select("id").in("id", ids).eq("status", "brouillon"),
  ]);
  const draftIds = (d.data ?? []).map((x) => x.id);
  const replyIds = (r.data ?? []).map((x) => x.id);
  if (draftIds.length + replyIds.length === 0) return { status: "error", message: M.notFound };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const until = new Date(now.getTime() + SNOOZE_HOURS * 3_600_000).toISOString();
  const [a, b] = await Promise.all([
    draftIds.length
      ? service
          .from("target_drafts")
          .update({ snoozed_until: until })
          .in("id", draftIds)
          .eq("status", "brouillon")
      : { error: null },
    replyIds.length
      ? service
          .from("reply_drafts")
          .update({ snoozed_until: until })
          .in("id", replyIds)
          .eq("status", "brouillon")
      : { error: null },
  ]);
  if (a.error || b.error) return { status: "error", message: M.saveError };
  return { status: "ok", message: M.snoozed(draftIds.length + replyIds.length) };
}

/** Remet dans la file ce qui avait été mis à plus tard : tout, ou seulement les éléments nommés. */
export async function wakeSnoozed(
  supabase: Client,
  getServiceClient: () => Client,
  onlyIds?: readonly string[],
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  const only = onlyIds ? new Set(onlyIds) : null;
  if (only && only.size === 0) return { status: "error", message: M.nothing };
  // Lecture avec les droits de la personne : elle ne réveille que ce qu'elle voit.
  const [d, r] = await Promise.all([
    supabase
      .from("target_drafts")
      .select("id")
      .eq("status", "brouillon")
      .not("snoozed_until", "is", null),
    supabase
      .from("reply_drafts")
      .select("id")
      .eq("status", "brouillon")
      .not("snoozed_until", "is", null),
  ]);
  const wanted = (x: { id: string }) => !only || only.has(x.id);
  const draftIds = (d.data ?? []).filter(wanted).map((x) => x.id);
  const replyIds = (r.data ?? []).filter(wanted).map((x) => x.id);
  if (only && draftIds.length + replyIds.length === 0)
    return { status: "error", message: M.notFound };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const [a, b] = await Promise.all([
    draftIds.length
      ? service.from("target_drafts").update({ snoozed_until: null }).in("id", draftIds)
      : { error: null },
    replyIds.length
      ? service.from("reply_drafts").update({ snoozed_until: null }).in("id", replyIds)
      : { error: null },
  ]);
  if (a.error || b.error) return { status: "error", message: M.saveError };
  return {
    status: "ok",
    message: only ? M.wokenSome(draftIds.length + replyIds.length) : M.woken,
  };
}

/**
 * Refuse des premiers messages : la cible est écartée avec le motif « refusé par vous » (elle garde le
 * bouton « Rédiger quand même ») et le brouillon est supprimé. Rien n'est envoyé.
 */
export async function refuseMessages(
  supabase: Client,
  getServiceClient: () => Client,
  rawIds: readonly string[],
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  const ids = [...new Set(rawIds)].slice(0, 300);
  if (ids.length === 0) return { status: "error", message: M.nothing };
  const { data: drafts } = await supabase
    .from("target_drafts")
    .select("id, plan_id, plan_item_id, workspace_id, proposed_url")
    .in("id", ids)
    .eq("status", "brouillon");
  if (!drafts?.length) return { status: "error", message: M.notFound };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error: declineError } = await service.from("draft_declines").upsert(
    drafts.map((x) => ({
      plan_item_id: x.plan_item_id,
      plan_id: x.plan_id,
      workspace_id: x.workspace_id,
      reason: M.refusedReason,
      declined_by: "utilisateur",
      page_url: null,
      retry_requested: false,
    })),
    { onConflict: "plan_item_id" },
  );
  if (declineError) return { status: "error", message: M.saveError };
  const { error } = await service
    .from("target_drafts")
    .delete()
    .in(
      "id",
      drafts.map((x) => x.id),
    )
    .eq("status", "brouillon");
  if (error) return { status: "error", message: M.saveError };
  return { status: "ok", message: M.refused(drafts.length) };
}
