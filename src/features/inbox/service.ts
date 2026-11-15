import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { applyEffects } from "@/features/classification/actions";
import { CATEGORIES, RISK_CATEGORIES, type Category } from "@/features/classification/types";
import type { LlmClient } from "@/lib/llm/client";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { checkReply } from "./check";
import { buildInsertion, buildInsertionMessage, type Insertion } from "./insertion";
import {
  buildPaymentDraft,
  DEFAULT_PAYMENT_OPTION,
  PAYMENT_OPTIONS,
  parseBudget,
  type PaymentOption,
} from "./payment";
import { writeReply } from "./reply-writer";
import { viewFor, VIEWS, type InboxView, type ThreadState } from "./views";

type Client = SupabaseClient<Database>;
const M = t.inbox.messages;

export interface ThreadRow {
  id: string;
  category: Category;
  validatedCategory: Category | null;
  confidence: number;
  justification: string;
  needsReview: boolean;
  injectionSuspected: boolean;
  proposedAction: string;
  fromEmail: string | null;
  subject: string | null;
  excerpt: string;
  receivedAt: string;
  sentMessageId: string;
  toEmail: string;
  state: ThreadState | null;
  view: InboxView;
  draftStatus: "brouillon" | "validee" | "rejetee" | null;
}

async function userId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Liste de l'inbox : classifications visibles par la RLS, rangées par vue. */
export async function listInbox(
  supabase: Client,
): Promise<{ rows: ThreadRow[]; counts: Record<InboxView, number> }> {
  const { data: cls } = await supabase
    .from("reply_classifications")
    .select(
      "id, category, validated_category, confidence, justification, needs_review, injection_suspected, proposed_action, sent_message_id, inbound_message_id, created_at",
    )
    .neq("category", "rebond")
    .order("created_at", { ascending: false })
    .limit(300);
  const counts = Object.fromEntries(VIEWS.map((v) => [v, 0])) as Record<InboxView, number>;
  if (!cls || cls.length === 0) return { rows: [], counts };
  const inboundIds = cls.map((c) => c.inbound_message_id);
  const sentIds = [...new Set(cls.map((c) => c.sent_message_id))];
  const [{ data: inbound }, { data: sent }, { data: states }, { data: drafts }] = await Promise.all(
    [
      supabase
        .from("inbound_messages")
        .select("id, from_email, subject, body_excerpt, received_at")
        .in("id", inboundIds),
      supabase.from("sent_messages").select("id, to_email").in("id", sentIds),
      supabase.from("inbox_states").select("sent_message_id, state").in("sent_message_id", sentIds),
      supabase
        .from("reply_drafts")
        .select("inbound_message_id, status")
        .in("inbound_message_id", inboundIds),
    ],
  );
  const inMap = new Map((inbound ?? []).map((i) => [i.id, i]));
  const sentMap = new Map((sent ?? []).map((s) => [s.id, s.to_email]));
  const stateMap = new Map(
    (states ?? [])
      .filter((s) => s.state !== "aucun")
      .map((s) => [s.sent_message_id, s.state as ThreadState]),
  );
  const draftMap = new Map<string, ThreadRow["draftStatus"]>();
  for (const d of drafts ?? []) {
    // « validee » l'emporte, puis « brouillon » : le statut le plus avancé.
    const prev = draftMap.get(d.inbound_message_id);
    if (prev !== "validee" && !(prev === "brouillon" && d.status === "rejetee"))
      draftMap.set(d.inbound_message_id, d.status as ThreadRow["draftStatus"]);
  }
  const rows: ThreadRow[] = [];
  for (const c of cls) {
    const i = inMap.get(c.inbound_message_id);
    if (!i) continue;
    const category = c.category as Category;
    const validated = (c.validated_category as Category | null) ?? null;
    const state = stateMap.get(c.sent_message_id) ?? null;
    const view = viewFor(category, validated, state);
    counts[view]++;
    rows.push({
      id: c.id,
      category,
      validatedCategory: validated,
      confidence: Number(c.confidence),
      justification: c.justification,
      needsReview: c.needs_review,
      injectionSuspected: c.injection_suspected,
      proposedAction: c.proposed_action,
      fromEmail: i.from_email,
      subject: i.subject,
      excerpt: i.body_excerpt,
      receivedAt: i.received_at,
      sentMessageId: c.sent_message_id,
      toEmail: sentMap.get(c.sent_message_id) ?? "",
      state,
      view,
      draftStatus: draftMap.get(c.inbound_message_id) ?? null,
    });
  }
  return { rows, counts };
}

export interface ReplyDraftRow {
  id: string;
  kind: "reponse" | "pret_a_inserer";
  subject: string | null;
  body: string;
  insertion: Insertion | null;
  paymentOption: PaymentOption | null;
  budgetCapEur: number | null;
  linkNature: string | null;
  status: "brouillon" | "validee" | "rejetee";
  edited: boolean;
  /** Statut de l'envoi (M5.2b), absent tant que rien n'a été tenté. */
  sendStatus: "en_cours" | "envoye" | "simule" | "a_reessayer" | "echec" | "ignore" | null;
  issues: { code: string; message: string }[];
}

export interface Thread {
  row: ThreadRow;
  ourSubject: string;
  ourBody: string;
  drafts: ReplyDraftRow[];
  autonomy: "manuel" | "assiste";
  workspaceId: string;
}

interface Context {
  workspaceId: string;
  siteDomain: string;
  signature: string;
  linkUrl: string;
  hook: string;
  anchor: string;
  targetType: string;
  pageUrl: string;
  ourBody: string;
  ourSubject: string;
}

/** Données de campagne liées à l'envoi initial (lecture par la RLS). */
async function loadContext(supabase: Client, sentMessageId: string): Promise<Context | null> {
  const { data: sent } = await supabase
    .from("sent_messages")
    .select("workspace_id, draft_id, subject, body")
    .eq("id", sentMessageId)
    .single();
  if (!sent) return null;
  const { data: d } = await supabase
    .from("target_drafts")
    .select("hook, proposed_url, plan_id, plan_item_id")
    .eq("id", sent.draft_id)
    .single();
  if (!d) return null;
  const [{ data: item }, { data: plan }] = await Promise.all([
    supabase
      .from("link_plan_items")
      .select("anchor_text, type, source_url, source_domain")
      .eq("id", d.plan_item_id)
      .single(),
    supabase.from("link_plans").select("site_id").eq("id", d.plan_id).single(),
  ]);
  if (!item || !plan) return null;
  const { data: site } = await supabase
    .from("sites")
    .select("domain, signature_first_name")
    .eq("id", plan.site_id)
    .single();
  if (!site) return null;
  return {
    workspaceId: sent.workspace_id,
    siteDomain: site.domain,
    signature: site.signature_first_name?.trim() || "",
    linkUrl: d.proposed_url,
    hook: d.hook,
    anchor: item.anchor_text,
    targetType: item.type,
    pageUrl: item.source_url ?? `https://${item.source_domain}/`,
    ourBody: sent.body,
    ourSubject: sent.subject,
  };
}

export async function getThread(
  supabase: Client,
  classificationId: string,
): Promise<Thread | null> {
  const { rows } = await listInbox(supabase);
  const row = rows.find((r) => r.id === classificationId);
  if (!row) return null;
  const ctx = await loadContext(supabase, row.sentMessageId);
  const { data: inb } = await supabase
    .from("reply_classifications")
    .select("inbound_message_id, workspace_id")
    .eq("id", classificationId)
    .single();
  if (!inb) return null;
  const [{ data: drafts }, { data: ws }] = await Promise.all([
    supabase.from("reply_drafts").select("*").eq("inbound_message_id", inb.inbound_message_id),
    supabase.from("workspaces").select("autonomy_level").eq("id", inb.workspace_id).single(),
  ]);
  const { data: sends } = await supabase
    .from("reply_sends")
    .select("reply_draft_id, status, dry_run")
    .in(
      "reply_draft_id",
      (drafts ?? []).map((d) => d.id),
    );
  const sendOf = (id: string) => {
    const mine = (sends ?? []).filter((x) => x.reply_draft_id === id);
    return (mine.find((x) => !x.dry_run) ?? mine[0])?.status ?? null;
  };
  const out: ReplyDraftRow[] = (drafts ?? []).map((d) => ({
    id: d.id,
    kind: d.kind as ReplyDraftRow["kind"],
    subject: d.subject,
    body: d.body,
    insertion: (d.insertion as unknown as Insertion | null) ?? null,
    paymentOption: d.payment_option as PaymentOption | null,
    budgetCapEur: d.budget_cap_eur === null ? null : Number(d.budget_cap_eur),
    linkNature: d.link_nature,
    status: d.status as ReplyDraftRow["status"],
    edited: d.edited,
    sendStatus: sendOf(d.id) as ReplyDraftRow["sendStatus"],
    issues: ctx
      ? checkReply({
          body: d.body,
          allowedUrls: [ctx.linkUrl, ctx.pageUrl],
          signatureFirstName: ctx.signature,
        })
      : [],
  }));
  return {
    row,
    ourSubject: ctx?.ourSubject ?? "",
    ourBody: ctx?.ourBody ?? "",
    drafts: out,
    autonomy: (ws?.autonomy_level as "manuel" | "assiste") ?? "assiste",
    workspaceId: inb.workspace_id,
  };
}

/** Catégories pour lesquelles on prépare un brouillon, selon l'action proposée par M5.1. */
export type DraftKind = "pret_a_inserer" | "llm" | "payant";
export function draftKindFor(action: string, category: Category): DraftKind | null {
  if (RISK_CATEGORIES.includes(category)) return null;
  if (action === "preparer_reponse_inseree") return "pret_a_inserer";
  if (action === "brouillon_reponse") return "llm";
  if (action === "politique_payant") return "payant";
  return null;
}

interface Target {
  classificationId: string;
  inboundId: string;
  sentId: string;
  workspaceId: string;
  category: Category;
  action: string;
  injection: boolean;
}

async function loadTarget(supabase: Client, classificationId: string): Promise<Target | null> {
  const { data } = await supabase
    .from("reply_classifications")
    .select(
      "id, inbound_message_id, sent_message_id, workspace_id, category, validated_category, proposed_action, injection_suspected",
    )
    .eq("id", classificationId)
    .single();
  if (!data) return null;
  return {
    classificationId: data.id,
    inboundId: data.inbound_message_id,
    sentId: data.sent_message_id,
    workspaceId: data.workspace_id,
    category: (data.validated_category ?? data.category) as Category,
    action: data.proposed_action,
    injection: data.injection_suspected,
  };
}

/** Écrit (ou remplace tant qu'il est en brouillon) le brouillon d'un message et d'une nature. */
async function upsertDraft(
  db: Client,
  r: {
    workspaceId: string;
    inboundId: string;
    sentId: string;
    kind: "reponse" | "pret_a_inserer";
    subject: string | null;
    body: string;
    insertion: Insertion | null;
    paymentOption: PaymentOption | null;
    budgetCapEur: number | null;
    linkNature: string | null;
    source: "modele" | "llm";
    costUsd: number;
  },
): Promise<string | null> {
  const { data: existing } = await db
    .from("reply_drafts")
    .select("id, status")
    .eq("inbound_message_id", r.inboundId)
    .eq("kind", r.kind)
    .maybeSingle();
  if (existing && existing.status !== "brouillon") return M.draftFrozen;
  const fields = {
    subject: r.subject,
    body: r.body,
    insertion: r.insertion as unknown as Json,
    payment_option: r.paymentOption,
    budget_cap_eur: r.budgetCapEur,
    link_nature: r.linkNature,
    edited: false,
  };
  if (existing) {
    const u = await db.from("reply_drafts").update(fields).eq("id", existing.id);
    return u.error ? u.error.message : null;
  }
  const i = await db.from("reply_drafts").insert({
    workspace_id: r.workspaceId,
    inbound_message_id: r.inboundId,
    sent_message_id: r.sentId,
    kind: r.kind,
    status: "brouillon",
    source: r.source,
    cost_usd: r.costUsd,
    ...fields,
  });
  // Doublon concurrent : l'autre passage a déjà écrit ce brouillon.
  if (i.error && i.error.code !== "23505") return i.error.message;
  return null;
}

export interface GenerateDeps {
  llm: () => LlmClient;
}

/**
 * Prépare le brouillon de réponse d'un message classé. Rien n'est envoyé : le brouillon attend la
 * validation de l'utilisateur. Un message suspecté d'injection n'est jamais confié au modèle.
 */
export async function generateDraft(
  supabase: Client,
  getServiceClient: () => Client,
  deps: GenerateDeps,
  classificationId: string,
): Promise<AuditActionState> {
  if (!(await userId(supabase))) return { status: "error", message: M.unauthenticated };
  const target = await loadTarget(supabase, classificationId);
  if (!target) return { status: "error", message: M.notFound };
  return buildDraft(supabase, getServiceClient(), deps, target);
}

async function buildDraft(
  reader: Client,
  db: Client,
  deps: GenerateDeps,
  target: Target,
): Promise<AuditActionState> {
  const kind = draftKindFor(target.action, target.category);
  if (!kind) return { status: "error", message: M.noDraftForCategory };
  const ctx = await loadContext(reader, target.sentId);
  if (!ctx) return { status: "error", message: M.noContext };
  if (!ctx.signature) return { status: "error", message: M.noSignature };
  const { data: inb } = await reader
    .from("inbound_messages")
    .select("from_email, subject, body_excerpt")
    .eq("id", target.inboundId)
    .single();
  if (!inb) return { status: "error", message: M.notFound };
  const base = {
    workspaceId: target.workspaceId,
    inboundId: target.inboundId,
    sentId: target.sentId,
  };

  if (kind === "pret_a_inserer") {
    const insertion = buildInsertion({
      pageUrl: ctx.pageUrl,
      anchor: ctx.anchor,
      linkUrl: ctx.linkUrl,
      hook: ctx.hook,
      targetType: ctx.targetType,
    });
    const msg = buildInsertionMessage(insertion, ctx.signature);
    const err = await upsertDraft(db, {
      ...base,
      kind: "pret_a_inserer",
      subject: null,
      body: msg.body,
      insertion,
      paymentOption: null,
      budgetCapEur: null,
      linkNature: "editorial_gratuit",
      source: "modele",
      costUsd: 0,
    });
    return err ? { status: "error", message: err } : { status: "ok", message: M.draftReady };
  }

  if (kind === "payant") {
    const p = buildPaymentDraft(DEFAULT_PAYMENT_OPTION, {
      signatureFirstName: ctx.signature,
      targetUrl: ctx.linkUrl,
    });
    const err = await upsertDraft(db, {
      ...base,
      kind: "reponse",
      subject: p.subject,
      body: p.body,
      insertion: null,
      paymentOption: p.option,
      budgetCapEur: p.budgetCapEur,
      linkNature: p.linkNature,
      source: "modele",
      costUsd: 0,
    });
    return err ? { status: "error", message: err } : { status: "ok", message: M.draftReady };
  }

  // Modèle : jamais sur un message qui tente de donner des consignes.
  if (target.injection) return { status: "error", message: M.injectionBlocked };
  let out;
  try {
    out = await writeReply(
      deps.llm(),
      {
        signatureFirstName: ctx.signature,
        siteDomain: ctx.siteDomain,
        ourMessage: ctx.ourBody,
        theirMessage: inb.body_excerpt,
        theirSubject: inb.subject,
        category: target.category,
        allowedUrls: [ctx.linkUrl, ctx.pageUrl],
      },
      { workspaceId: target.workspaceId },
    );
  } catch {
    return { status: "error", message: M.llmUnavailable };
  }
  const err = await upsertDraft(db, {
    ...base,
    kind: "reponse",
    subject: out.subject,
    body: out.body,
    insertion: null,
    paymentOption: null,
    budgetCapEur: null,
    linkNature: "editorial_gratuit",
    source: "llm",
    costUsd: out.costUsd,
  });
  return err ? { status: "error", message: err } : { status: "ok", message: M.draftReady };
}

/** Politique « c'est payant » : l'utilisateur choisit ; le défaut reste de décliner. */
export async function choosePaymentOption(
  supabase: Client,
  getServiceClient: () => Client,
  classificationId: string,
  rawOption: unknown,
  rawBudget: unknown,
): Promise<AuditActionState> {
  if (!(await userId(supabase))) return { status: "error", message: M.unauthenticated };
  const option = (PAYMENT_OPTIONS as readonly unknown[]).includes(rawOption)
    ? (rawOption as PaymentOption)
    : null;
  if (!option) return { status: "error", message: M.badOption };
  const budget = option === "achat_plafonne" ? parseBudget(rawBudget) : null;
  if (option === "achat_plafonne" && budget === null)
    return { status: "error", message: M.budgetRequired };
  const target = await loadTarget(supabase, classificationId);
  if (!target) return { status: "error", message: M.notFound };
  if (target.category !== "demande_paiement") return { status: "error", message: M.notPayment };
  const ctx = await loadContext(supabase, target.sentId);
  if (!ctx || !ctx.signature) return { status: "error", message: M.noContext };
  const p = buildPaymentDraft(
    option,
    { signatureFirstName: ctx.signature, targetUrl: ctx.linkUrl },
    budget,
  );
  const err = await upsertDraft(getServiceClient(), {
    workspaceId: target.workspaceId,
    inboundId: target.inboundId,
    sentId: target.sentId,
    kind: "reponse",
    subject: p.subject,
    body: p.body,
    insertion: null,
    paymentOption: p.option,
    budgetCapEur: p.budgetCapEur,
    linkNature: p.linkNature,
    source: "modele",
    costUsd: 0,
  });
  return err ? { status: "error", message: err } : { status: "ok", message: M.draftReady };
}

async function ownDraft(supabase: Client, draftId: string) {
  const { data } = await supabase
    .from("reply_drafts")
    .select("id, status, body, subject, kind, workspace_id, sent_message_id")
    .eq("id", draftId)
    .single();
  return data;
}

/** Modification par l'utilisateur d'un brouillon encore ouvert. */
export async function editReplyDraft(
  supabase: Client,
  getServiceClient: () => Client,
  draftId: string,
  input: { subject: string; body: string },
): Promise<AuditActionState> {
  if (!(await userId(supabase))) return { status: "error", message: M.unauthenticated };
  const d = await ownDraft(supabase, draftId);
  if (!d) return { status: "error", message: M.notFound };
  if (d.status !== "brouillon") return { status: "error", message: M.draftFrozen };
  const body = input.body.trim();
  if (body.length === 0) return { status: "error", message: M.emptyBody };
  const u = await getServiceClient()
    .from("reply_drafts")
    .update({
      body,
      subject: d.kind === "reponse" ? input.subject.trim() || d.subject : null,
      edited: true,
    })
    .eq("id", draftId);
  return u.error ? { status: "error", message: u.error.message } : { status: "ok" };
}

/**
 * Validation : seule l'utilisateur la fait, après un nouveau contrôle du texte. Valider ne PART
 * PAS : l'envoi d'une réponse validée est le sous-jalon M5.2b (dry run).
 */
export async function validateReplyDraft(
  supabase: Client,
  getServiceClient: () => Client,
  draftId: string,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  const d = await ownDraft(supabase, draftId);
  if (!d) return { status: "error", message: M.notFound };
  if (d.status !== "brouillon") return { status: "error", message: M.draftFrozen };
  const ctx = await loadContext(supabase, d.sent_message_id);
  if (!ctx) return { status: "error", message: M.noContext };
  const issues = checkReply({
    body: d.body,
    allowedUrls: [ctx.linkUrl, ctx.pageUrl],
    signatureFirstName: ctx.signature,
  });
  if (issues.length > 0)
    return { status: "error", message: `${M.mustFix} ${issues.map((i) => i.message).join(" ")}` };
  const u = await getServiceClient()
    .from("reply_drafts")
    .update({ status: "validee", validated_by: uid, validated_at: new Date().toISOString() })
    .eq("id", draftId);
  return u.error ? { status: "error", message: u.error.message } : { status: "ok" };
}

export async function rejectReplyDraft(
  supabase: Client,
  getServiceClient: () => Client,
  draftId: string,
): Promise<AuditActionState> {
  if (!(await userId(supabase))) return { status: "error", message: M.unauthenticated };
  const d = await ownDraft(supabase, draftId);
  if (!d) return { status: "error", message: M.notFound };
  if (d.status !== "brouillon") return { status: "error", message: M.draftFrozen };
  const u = await getServiceClient()
    .from("reply_drafts")
    .update({ status: "rejetee" })
    .eq("id", draftId);
  return u.error ? { status: "error", message: u.error.message } : { status: "ok" };
}

/** État manuel d'un fil (négociation, gagné, archivé) ; « aucun » le remet dans la vue de sa catégorie. */
export async function setThreadState(
  supabase: Client,
  getServiceClient: () => Client,
  classificationId: string,
  state: unknown,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  const valid =
    state === "aucun" || state === "en_negociation" || state === "gagne" || state === "archive";
  if (!valid) return { status: "error", message: M.badOption };
  const target = await loadTarget(supabase, classificationId);
  if (!target) return { status: "error", message: M.notFound };
  const db = getServiceClient();
  const { data: existing } = await db
    .from("inbox_states")
    .select("sent_message_id")
    .eq("sent_message_id", target.sentId)
    .maybeSingle();
  const fields = {
    state: state as ThreadState | "aucun",
    updated_by: uid,
    updated_at: new Date().toISOString(),
  };
  const u = existing
    ? await db.from("inbox_states").update(fields).eq("sent_message_id", target.sentId)
    : await db.from("inbox_states").insert({
        sent_message_id: target.sentId,
        workspace_id: target.workspaceId,
        ...fields,
      });
  return u.error ? { status: "error", message: u.error.message } : { status: "ok" };
}

/**
 * Correction de la catégorie par l'utilisateur. Une correction vers désinscription ou plainte
 * applique aussitôt les effets protecteurs (suppression de l'adresse, relance annulée).
 */
export async function correctCategory(
  supabase: Client,
  getServiceClient: () => Client,
  classificationId: string,
  raw: unknown,
): Promise<AuditActionState> {
  const uid = await userId(supabase);
  if (!uid) return { status: "error", message: M.unauthenticated };
  if (!(CATEGORIES as readonly unknown[]).includes(raw))
    return { status: "error", message: M.badOption };
  const category = raw as Category;
  const target = await loadTarget(supabase, classificationId);
  if (!target) return { status: "error", message: M.notFound };
  const db = getServiceClient();
  const u = await db
    .from("reply_classifications")
    .update({
      validated_category: category,
      validated_by: uid,
      validated_at: new Date().toISOString(),
    })
    .eq("id", classificationId);
  if (u.error) return { status: "error", message: u.error.message };
  if (RISK_CATEGORIES.includes(category)) {
    const [{ data: sent }, { data: inb }] = await Promise.all([
      db.from("sent_messages").select("to_email").eq("id", target.sentId).single(),
      db.from("inbound_messages").select("from_email").eq("id", target.inboundId).single(),
    ]);
    await applyEffects(
      db,
      {
        action: category === "plainte_hostile" ? "suppression_et_alerte" : "suppression",
        status: "appliquee",
        suppress: category === "plainte_hostile" ? "plainte" : "desinscription",
        signalOptOut: true,
        postponeDays: null,
        alert: category === "plainte_hostile",
      },
      {
        workspaceId: target.workspaceId,
        sentMessageId: target.sentId,
        toEmail: sent?.to_email ?? null,
        fromEmail: inb?.from_email ?? null,
        now: new Date(),
      },
    );
  }
  return { status: "ok" };
}

/** Niveau d'autonomie : manuel (rien de préparé sans clic) ou assisté (brouillons préparés). */
export async function setAutonomy(
  supabase: Client,
  getServiceClient: () => Client,
  workspaceId: string,
  level: unknown,
): Promise<AuditActionState> {
  if (!(await userId(supabase))) return { status: "error", message: M.unauthenticated };
  if (level !== "manuel" && level !== "assiste") return { status: "error", message: M.badOption };
  // L'accès est vérifié par la RLS : l'utilisateur doit voir ce workspace.
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .single();
  if (!ws) return { status: "error", message: M.notFound };
  const u = await getServiceClient()
    .from("workspaces")
    .update({ autonomy_level: level })
    .eq("id", workspaceId);
  return u.error ? { status: "error", message: u.error.message } : { status: "ok" };
}

export interface DraftTickDeps {
  db: Client;
  llm: () => LlmClient;
  max?: number;
}

/**
 * Préparation en arrière-plan des brouillons (workspaces « assisté » seulement). Ne valide ni
 * n'envoie rien. Une classification sans brouillon éligible est ignorée.
 */
export async function runDraftTick(
  deps: DraftTickDeps,
): Promise<{ examined: number; drafted: number; skipped: number }> {
  const { db } = deps;
  const out = { examined: 0, drafted: 0, skipped: 0 };
  const { data: cls } = await db
    .from("reply_classifications")
    .select(
      "id, inbound_message_id, sent_message_id, workspace_id, category, validated_category, proposed_action, injection_suspected",
    )
    .in("proposed_action", ["preparer_reponse_inseree", "brouillon_reponse", "politique_payant"])
    .order("created_at", { ascending: false })
    .limit(100);
  if (!cls || cls.length === 0) return out;
  const wsIds = [...new Set(cls.map((c) => c.workspace_id))];
  const { data: wss } = await db.from("workspaces").select("id, autonomy_level").in("id", wsIds);
  const assisted = new Set(
    (wss ?? []).filter((w) => w.autonomy_level === "assiste").map((w) => w.id),
  );
  const { data: existing } = await db
    .from("reply_drafts")
    .select("inbound_message_id")
    .in(
      "inbound_message_id",
      cls.map((c) => c.inbound_message_id),
    );
  const done = new Set((existing ?? []).map((d) => d.inbound_message_id));
  let budget = deps.max ?? 10;
  for (const c of cls) {
    if (budget <= 0) break;
    if (done.has(c.inbound_message_id) || !assisted.has(c.workspace_id)) continue;
    out.examined++;
    budget--;
    const r = await buildDraft(db, db, deps, {
      classificationId: c.id,
      inboundId: c.inbound_message_id,
      sentId: c.sent_message_id,
      workspaceId: c.workspace_id,
      category: (c.validated_category ?? c.category) as Category,
      action: c.proposed_action,
      injection: c.injection_suspected,
    });
    if (r.status === "ok") out.drafted++;
    else out.skipped++;
  }
  return out;
}
