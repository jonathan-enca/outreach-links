import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { getLatestBrandProfile } from "@/features/brand/service";
import { startDrafts } from "@/features/drafting/service";
import { previewFindings, type FindingsPreview } from "@/features/findings/service";
import { siteResources } from "@/features/findings/run";
import { FINDING_KINDS } from "@/features/findings/types";
import { previewCollection, type CollectionPreview } from "@/features/collection/service";
import { previewQualification, type QualificationPreview } from "@/features/qualification/service";
import { SITE_TYPES } from "@/features/qualification/types";
import { TACTICS } from "@/features/queries/schema";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { resolvePublishers } from "@/features/brand/publishers";
import type { PublisherType } from "@/features/brand/schema";
import { STOCK_REASONS } from "@/features/qualification/more";
import { buildBridge, type BridgeContext } from "./bridge";
import { assignPublisher } from "./publishers";
import {
  isFounderRole,
  type FindingView,
  type FounderRole,
  type FunnelView,
  type MessageState,
  type MoreView,
  type SkippedView,
  type TargetCard,
  type TargetContact,
  type TargetsRunView,
} from "./types";

type Client = SupabaseClient<Database>;
const M = t.targets.messages;

const OPENING = z.object({ opening: z.string() }).catch({ opening: "" });
const RESOURCE = z.object({ resource: z.number().int().min(0).max(9) }).catch({ resource: 0 });

const siteType = (v: string | null) =>
  (SITE_TYPES as readonly string[]).includes(v ?? "") ? (v as TargetCard["siteType"]) : null;

type QRow = Database["public"]["Tables"]["qualified_targets"]["Row"];
type FRow = Database["public"]["Tables"]["target_findings"]["Row"];

export function contactOf(
  r: Pick<QRow, "contact_status" | "contact_email" | "contact_url" | "form_url">,
): TargetContact {
  if (r.contact_status === "email_verifie" && r.contact_email)
    return { kind: "email", verified: true, email: r.contact_email, url: r.contact_url };
  if (r.contact_status === "email_a_verifier" && r.contact_email)
    return { kind: "email", verified: false, email: r.contact_email, url: r.contact_url };
  const form = r.form_url ?? r.contact_url;
  if (r.contact_status === "formulaire" && form)
    return { kind: "formulaire", verified: false, email: null, url: form };
  return { kind: "aucun", verified: false, email: null, url: null };
}

export function findingView(r: FRow): FindingView {
  return {
    id: r.id,
    kind: r.kind as FindingView["kind"],
    quote: r.quote,
    pageUrl: r.page_url,
    linkUrl: r.link_url,
    httpStatus: r.http_status,
    anchor: r.anchor,
    resourceUrl: r.resource_url,
    resourceTitle: r.resource_title,
    proposedSentence: r.proposed_sentence,
    reason: r.reason,
    requestLines: r.request_lines,
    opening: OPENING.parse(r.brief).opening,
  };
}

/** Une ligne `qualified_targets` (+ constats) -> une carte. Pur : testable sans base. */
export function toCard(
  r: QRow,
  findings: readonly FRow[],
  resources: readonly { url: string; title: string }[],
  validated: ReadonlySet<string>,
): TargetCard {
  const pageTitle = z.object({ title: z.string() }).safeParse(r.page).data?.title?.trim() || null;
  const res = resources[RESOURCE.parse(r.judgement).resource];
  return {
    id: r.id,
    rank: r.rank,
    domain: r.domain,
    pageUrl: r.url,
    pageTitle,
    siteType: siteType(r.site_type),
    tactics: r.tactics.filter((x): x is TargetCard["tactics"][number] =>
      (TACTICS as readonly string[]).includes(x),
    ),
    why: r.why,
    hook: r.hook,
    contact: contactOf(r),
    requestLines: r.request_lines ?? [],
    findings: findings
      .filter((f) => f.target_id === r.id && (FINDING_KINDS as readonly string[]).includes(f.kind))
      .map(findingView),
    contactless: r.status !== "liste_courte",
    domainRank: r.domain_rank === null ? null : Number(r.domain_rank),
    platformHosted: r.platform_hosted,
    alreadyValidated: validated.has(r.id),
    resource: res ? { url: res.url, title: res.title } : null,
    addedAt: r.created_at,
  };
}

/** Ce que le plan figé n'a pas lancé (absent des plans d'avant le 18/11/2026 : rien d'écarté). */
function skippedOf(plan: unknown): SkippedView {
  const sk = (plan as { skipped?: Partial<SkippedView> } | null)?.skipped;
  return {
    mentions: typeof sk?.mentions === "string" ? sk.mentions : null,
    deadPages: Array.isArray(sk?.deadPages) ? sk.deadPages : [],
  };
}

const runView = (
  row: {
    status: string;
    actual_cost_usd: number | null;
    stop_reason: string | null;
    error_message: string | null;
  } | null,
): TargetsRunView =>
  row
    ? {
        status: row.status as TargetsRunView["status"],
        costUsd: row.actual_cost_usd === null ? null : Number(row.actual_cost_usd),
        stop: row.stop_reason,
        error: row.error_message,
      }
    : { status: "aucun", costUsd: null, stop: null, error: null };

export interface TargetsView {
  auditId: string;
  siteId: string;
  siteDomain: string;
  founderRole: FounderRole | null;
  hasSignature: boolean;
  /** Prénom de signature enregistré (pré-remplit le réglage des messages). */
  signatureFirstName: string | null;
  collectionDone: boolean;
  collection: TargetsRunView & { preview: CollectionPreview | null; skipped: SkippedView };
  qualification: TargetsRunView & { preview: QualificationPreview | null };
  findings: TargetsRunView & { preview: FindingsPreview | null; count: number };
  /** Liste courte, dans l'ordre du rang. */
  cards: TargetCard[];
  /** État du message de chaque cible retenue (id de la cible → état), pour la section « Retenues ». */
  messages: Record<string, RetainedMessage>;
  /** Une rédaction tourne pour cette campagne : l'écran se met à jour seul. */
  drafting: boolean;
  /** Cibles « mentions » sans contact (mention seulement) : visibles, jamais validées. */
  contactless: TargetCard[];
  /**
   * Chantier D.1 : sites jugés pertinents mais sans email ni formulaire trouvé. Gardés à part,
   * visibles avec le lien de leur page, jamais perdus ni validés.
   */
  noContact: TargetCard[];
  /** Sites écartés par la personne (« Écarter ») : hors de la liste à décider, et réversibles. */
  dismissed?: TargetCard[];
  competitors: { domain: string; queries: number; bestRank: number | null }[];
  /** Chantier H : types d'éditeurs cherchés (étiquettes actives du profil). */
  publisherTypes: PublisherType[];
  /** Chantier G : ce que l'analyse a examiné, le stock, et l'état de « Lire d'autres sites ». */
  funnel: FunnelView | null;
  more: MoreView;
}

/**
 * État du message d'une cible retenue (maquette `docs/mockups/cibles-apres-validation.html`) :
 * approuvé, à relire, refusé par la personne, en rédaction, ou en attente d'une rédaction (plafond
 * atteint, rédaction interrompue). Pur, testé.
 */
export function messageStateOf(x: {
  draftStatus: string | null;
  refused: boolean;
  running: boolean;
}): MessageState {
  if (x.draftStatus === "valide") return "approuve";
  if (x.draftStatus) return "a_relire";
  if (x.refused) return "refuse";
  return x.running ? "en_redaction" : "a_rediger";
}

/** Message d'une cible retenue : son état et l'élément de plan qui le porte (« Rédiger quand même »). */
export interface RetainedMessage {
  state: MessageState;
  itemId: string;
}

/** Phrase d'introduction de l'écran Cibles : elle change dès qu'au moins une cible est retenue. */
export function targetsLead(view: Pick<TargetsView, "cards">): string {
  const kept = view.cards.filter((c) => c.alreadyValidated).length;
  if (kept === 0) return t.targets.description;
  const left = view.cards.length - kept;
  return left > 0 ? t.targets.after.leadSome(left) : t.targets.after.leadAll;
}

/**
 * Étape « Cibles » du menu pour le site choisi : sites encore à décider, et si toutes les cibles sont
 * retenues (coche). Mêmes données que l'écran, pour que les deux disent le même nombre. Null sans
 * analyse terminée.
 */
export async function targetsMenuState(
  supabase: Client,
  siteId: string,
): Promise<{ toDecide: number; done: boolean } | null> {
  const { data: audit } = await supabase
    .from("audits")
    .select("id, analysis_status, status")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!audit) return null;
  const finished =
    audit.analysis_status === "termine" ||
    (audit.analysis_status === "aucun" && audit.status === "termine");
  if (!finished) return null;
  const view = await loadTargets(
    supabase,
    () => {
      throw new Error("sans service");
    },
    audit.id,
    { previews: false },
  );
  if (!view) return null;
  const kept = view.cards.filter((c) => c.alreadyValidated).length;
  const toDecide = view.cards.length - kept;
  return { toDecide, done: kept > 0 && toDecide === 0 };
}

interface MessageStates {
  byTarget: Record<string, RetainedMessage>;
  drafting: boolean;
}

/** États des messages des cibles retenues : brouillons, refus de la personne et rédactions en cours. */
async function loadMessageStates(
  supabase: Client,
  briefs: readonly { target_id: string | null; plan_item_id: string; plan_id: string }[],
): Promise<MessageStates> {
  const kept = briefs.filter((b) => b.target_id);
  if (kept.length === 0) return { byTarget: {}, drafting: false };
  const itemIds = kept.map((b) => b.plan_item_id);
  const planIds = [...new Set(kept.map((b) => b.plan_id))];
  const [drafts, refusals, runs] = await Promise.all([
    supabase.from("target_drafts").select("plan_item_id, status").in("plan_item_id", itemIds),
    supabase
      .from("draft_declines")
      .select("plan_item_id, retry_requested")
      .eq("declined_by", "utilisateur")
      .in("plan_item_id", itemIds),
    supabase.from("draft_runs").select("plan_id, status").in("plan_id", planIds),
  ]);
  const draftOf = new Map((drafts.data ?? []).map((d) => [d.plan_item_id, d.status]));
  const refused = new Set(
    (refusals.data ?? []).filter((r) => !r.retry_requested).map((r) => r.plan_item_id),
  );
  const running = new Set(
    (runs.data ?? []).filter((r) => r.status === "en_cours").map((r) => r.plan_id),
  );
  const byTarget: Record<string, RetainedMessage> = {};
  for (const b of kept)
    byTarget[b.target_id!] = {
      itemId: b.plan_item_id,
      state: messageStateOf({
        draftStatus: draftOf.get(b.plan_item_id) ?? null,
        refused: refused.has(b.plan_item_id),
        running: running.has(b.plan_id),
      }),
    };
  return { byTarget, drafting: running.size > 0 };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Chiffres de l'entonnoir tels qu'on les montre (pur). */
export function funnelView(stats: unknown, shortlist: number, stock: number): FunnelView | null {
  if (!stats || typeof stats !== "object") return null;
  const s = stats as Record<string, unknown>;
  if (!("candidates" in s)) return null;
  const pre = (s.preRead && typeof s.preRead === "object" ? s.preRead : {}) as Record<
    string,
    unknown
  >;
  const preRead = Object.entries(pre)
    .map(([reason, n]) => ({ reason, count: num(n) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
  return {
    candidates: num(s.candidates),
    preRead,
    preReadTotal: preRead.reduce((n, x) => n + x.count, 0),
    pagesRead: num(s.pagesRead),
    judged: num(s.judged),
    relevant: num(s.relevant),
    shortlist,
    stock,
  };
}

/**
 * Tout ce que l'écran « Vos cibles » montre, lu avec les droits de l'utilisateur (RLS). Les coûts
 * annoncés (`previewQualification` / `previewFindings`) viennent du client de service : ils ne
 * lancent rien et ne facturent rien. Null si l'audit n'est pas visible par l'utilisateur.
 */
export async function loadTargets(
  supabase: Client,
  getServiceClient: () => Client,
  auditId: string,
  opts: { previews?: boolean } = {},
): Promise<TargetsView | null> {
  const { data: audit } = await supabase
    .from("audits")
    .select("id, workspace_id, site_id, sites(domain, founder_role, signature_first_name)")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return null;
  const site = audit.sites as unknown as {
    domain: string;
    founder_role: string | null;
    signature_first_name: string | null;
  } | null;
  if (!site) return null;

  const [col, qrunRes, frunRes, comps] = await Promise.all([
    supabase
      .from("candidate_collections")
      .select("status, actual_cost_usd, stop_reason, error_message, plan")
      .eq("audit_id", auditId)
      .maybeSingle(),
    supabase
      .from("qualification_runs")
      .select(
        "id, status, actual_cost_usd, stop_reason, error_message, stats, more_status, more_stats, auto_status, auto_added, auto_lots, auto_stop, auto_started_at, auto_cost_usd",
      )
      .eq("audit_id", auditId)
      .maybeSingle(),
    supabase
      .from("findings_runs")
      .select("id, status, actual_cost_usd, stop_reason, error_message")
      .eq("audit_id", auditId)
      .maybeSingle(),
    supabase
      .from("competitors")
      .select("domain, queries_count, best_rank, selected")
      .eq("audit_id", auditId)
      .order("queries_count", { ascending: false })
      .limit(30),
  ]);
  const qrun = qrunRes.data;
  const collectionDone = col.data?.status === "termine";

  let cards: TargetCard[] = [];
  let contactless: TargetCard[] = [];
  let noContact: TargetCard[] = [];
  let dismissed: TargetCard[] = [];
  let findingsCount = 0;
  let publisherTypes: PublisherType[] = [];
  let stock = 0;
  let messages: MessageStates = { byTarget: {}, drafting: false };
  if (qrun && qrun.status === "termine") {
    const [short, extra, lost, fnd, profile, stockRes] = await Promise.all([
      supabase
        .from("qualified_targets")
        .select("*")
        .eq("run_id", qrun.id)
        .eq("status", "liste_courte")
        .order("rank", { ascending: true })
        .limit(200),
      supabase
        .from("qualified_targets")
        .select("*")
        .eq("run_id", qrun.id)
        .eq("status", "exclu")
        .contains("tactics", ["mentions"])
        .limit(200),
      supabase
        .from("qualified_targets")
        .select("*")
        .eq("run_id", qrun.id)
        .eq("exclusion_reason", "sans_contact")
        .order("fit", { ascending: false })
        .limit(100),
      supabase.from("target_findings").select("*").eq("audit_id", auditId).limit(500),
      getLatestBrandProfile(supabase, audit.site_id),
      supabase
        .from("qualified_targets")
        .select("id", { count: "exact", head: true })
        .eq("run_id", qrun.id)
        .in("exclusion_reason", [...STOCK_REASONS]),
    ]);
    stock = stockRes.count ?? 0;
    const findings = fnd.data ?? [];
    findingsCount = findings.length;
    const ids = (short.data ?? []).map((r) => r.id);
    const briefs = ids.length
      ? await supabase
          .from("plan_item_briefs")
          .select("target_id, plan_item_id, plan_id")
          .in("target_id", ids)
      : { data: [] as { target_id: string | null; plan_item_id: string; plan_id: string }[] };
    const validated = new Set(
      (briefs.data ?? []).flatMap((b) => (b.target_id ? [b.target_id] : [])),
    );
    messages = await loadMessageStates(supabase, briefs.data ?? []);
    const resources = siteResources(site.domain, profile?.profile);
    // Chantier H : chaque cible est rangée sous le type d'éditeur cherché auquel elle correspond.
    publisherTypes = profile ? resolvePublishers(profile.profile, "").types : [];
    const foundBy = new Map<string, string[]>();
    const domains = (short.data ?? []).map((r) => r.domain);
    if (publisherTypes.length > 0 && domains.length > 0) {
      const { data: cands } = await supabase
        .from("collection_candidates")
        .select("domain, sources")
        .eq("audit_id", auditId)
        .in("domain", domains);
      for (const c of cands ?? []) {
        const labels = (Array.isArray(c.sources) ? c.sources : []).flatMap((x) => {
          const p = (x as { persona?: unknown } | null)?.persona;
          return typeof p === "string" ? [p] : [];
        });
        foundBy.set(c.domain, labels);
      }
    }
    // Un site écarté par la personne sort de la liste (sauf s'il a déjà été retenu).
    const isDismissed = (r: QRow) => r.dismissed_at !== null && !validated.has(r.id);
    dismissed = (short.data ?? [])
      .filter(isDismissed)
      .map((r) => toCard(r, findings, resources, validated));
    cards = (short.data ?? [])
      .filter((r) => !isDismissed(r))
      .map((r) => {
        const card = toCard(r, findings, resources, validated);
        return {
          ...card,
          publisher: assignPublisher(
            {
              domain: card.domain,
              pageTitle: card.pageTitle,
              siteType: card.siteType,
              foundBy: foundBy.get(card.domain) ?? [],
            },
            publisherTypes,
          ),
        };
      });
    // Mentions sans contact : seulement celles où l'on a PROUVÉ une mention sans lien.
    const withMention = new Set(
      findings.filter((f) => f.kind === "mention_sans_lien").map((f) => f.target_id),
    );
    contactless = (extra.data ?? [])
      .filter((r) => withMention.has(r.id))
      .map((r) => toCard(r, findings, resources, validated));
    const shown = new Set(contactless.map((c) => c.id));
    noContact = (lost.data ?? [])
      .filter((r) => !shown.has(r.id))
      .map((r) => toCard(r, findings, resources, validated));
  }

  // Coûts annoncés : seulement quand l'étape est possible et pas déjà en cours.
  let cPreview: CollectionPreview | null = null;
  let qPreview: QualificationPreview | null = null;
  let fPreview: FindingsPreview | null = null;
  try {
    if (opts.previews === false) throw new Error("sans aperçu");
    const service = getServiceClient();
    if (!collectionDone && col.data?.status !== "en_cours") {
      const p = await previewCollection(service, auditId);
      if (p.ok) cPreview = p.preview;
    }
    if (collectionDone && (!qrun || qrun.status !== "en_cours")) {
      const p = await previewQualification(service, auditId);
      if (p.ok) qPreview = p.preview;
    }
    if (qrun?.status === "termine" && frunRes.data?.status !== "en_cours") {
      const p = await previewFindings(service, auditId);
      if (p.ok) fPreview = p.preview;
    }
  } catch {
    // Service indisponible : l'écran montre l'état sans le coût, et les boutons restent masqués.
  }

  return {
    auditId,
    siteId: audit.site_id,
    siteDomain: site.domain,
    founderRole: isFounderRole(site.founder_role) ? site.founder_role : null,
    hasSignature: Boolean(site.signature_first_name?.trim()),
    signatureFirstName: site.signature_first_name?.trim() || null,
    collectionDone,
    collection: { ...runView(col.data), preview: cPreview, skipped: skippedOf(col.data?.plan) },
    qualification: { ...runView(qrun), preview: qPreview },
    findings: { ...runView(frunRes.data), preview: fPreview, count: findingsCount },
    cards,
    messages: messages.byTarget,
    drafting: messages.drafting,
    contactless,
    noContact,
    dismissed,
    competitors: (comps.data ?? [])
      .filter((c) => c.selected)
      .map((c) => ({ domain: c.domain, queries: c.queries_count, bestRank: c.best_rank })),
    publisherTypes,
    funnel: qrun?.status === "termine" ? funnelView(qrun.stats, cards.length, stock) : null,
    more: {
      status: (["demande", "en_cours", "termine", "echoue"] as const).includes(
        qrun?.more_status as never,
      )
        ? (qrun!.more_status as MoreView["status"])
        : "aucun",
      added:
        typeof (qrun?.more_stats as { added?: unknown } | null)?.added === "number"
          ? ((qrun!.more_stats as { added: number }).added ?? null)
          : null,
      auto: {
        status: (["en_cours", "termine", "echoue"] as const).includes(qrun?.auto_status as never)
          ? (qrun!.auto_status as MoreView["auto"]["status"])
          : "aucun",
        added: qrun?.auto_added ?? 0,
        lots: qrun?.auto_lots ?? 0,
        startedAt: qrun?.auto_started_at ?? null,
        costUsd: Number(qrun?.auto_cost_usd ?? 0),
        stop: (qrun?.auto_stop as MoreView["auto"]["stop"]) ?? null,
      },
    },
  };
}

/** Enregistre la réponse « comment vous présentez-vous » (jamais supposée). */
export async function setFounderRole(
  supabase: Client,
  auditId: string,
  rawRole: unknown,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  if (!isFounderRole(rawRole)) return { status: "error", message: M.founderMissing };
  const { data: audit } = await supabase
    .from("audits")
    .select("site_id")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  const { data, error } = await supabase
    .from("sites")
    .update({ founder_role: rawRole, founder_confirmed_at: new Date().toISOString() })
    .eq("id", audit.site_id)
    .select("id");
  if (error || !data?.length) return { status: "error", message: M.saveError };
  return { status: "ok", auditId, message: M.founderSaved };
}

/**
 * Réglages des messages (rôle de l'utilisateur et prénom de signature) : demandés une seule fois, au
 * moment de valider les cibles et avant la rédaction, jamais pendant la lecture de la liste.
 */
export async function saveMessageSettings(
  supabase: Client,
  auditId: string,
  rawRole: unknown,
  rawFirstName: unknown,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  if (!isFounderRole(rawRole)) return { status: "error", message: M.founderMissing };
  const name = typeof rawFirstName === "string" ? rawFirstName.trim() : "";
  if (name.length < 1 || name.length > 60)
    return { status: "error", message: t.sites.validation.signatureFirstName };
  const { data: audit } = await supabase
    .from("audits")
    .select("site_id")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  const { data, error } = await supabase
    .from("sites")
    .update({
      founder_role: rawRole,
      founder_confirmed_at: new Date().toISOString(),
      signature_first_name: name,
    })
    .eq("id", audit.site_id)
    .select("id");
  if (error || !data?.length) return { status: "error", message: M.saveError };
  return { status: "ok", auditId, message: M.founderSaved };
}

/**
 * « Valider ces demandes » : crée un plan de liens depuis les cibles retenues (mêmes tables que M2.3, pour que
 * contacts, rédaction et lots existants s'appliquent), enregistre le brief de chaque demande (point précis
 * cité, ressource, ancre, présentation choisie par l'utilisateur) et lance la rédaction. Aucun envoi.
 */
export async function validateRequests(
  supabase: Client,
  auditId: string,
  rawIds: readonly string[],
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };
  const ids = [...new Set(rawIds)].slice(0, 100);
  if (ids.length === 0) return { status: "error", message: M.nothingSelected };

  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, workspace_id, site_id, sites(domain, founder_role, offered_asset, signature_first_name)",
    )
    .eq("id", auditId)
    .maybeSingle();
  const site = audit?.sites as unknown as {
    domain: string;
    founder_role: string | null;
    offered_asset: string | null;
    signature_first_name: string | null;
  } | null;
  if (!audit || !site) return { status: "error", message: M.notFound };
  if (!isFounderRole(site.founder_role)) return { status: "error", message: M.founderMissing };
  if (!site.signature_first_name?.trim())
    return { status: "error", message: t.drafts.messages.needSignature };

  const view = await loadTargets(supabase, getServiceClient, auditId, { previews: false });
  if (!view) return { status: "error", message: M.notFound };
  const chosen = view.cards.filter((c) => ids.includes(c.id));
  const profile = await getLatestBrandProfile(supabase, audit.site_id);
  const ctx: BridgeContext = {
    siteDomain: site.domain,
    brandName: profile?.profile.name_variants[0] ?? site.domain,
    resources: siteResources(site.domain, profile?.profile),
    role: site.founder_role,
    offeredAsset: site.offered_asset,
  };
  const { items, skipped } = buildBridge(chosen, ctx);
  if (items.length === 0) return { status: "error", message: M.noneEligible };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const created = await service.rpc("create_link_plan", {
    p_audit_id: auditId,
    p_user_id: userId,
    p_items: items.map((i) => i.planItem) as Json,
  });
  const planId = created.data?.[0]?.plan_id;
  if (created.error || !planId) return { status: "error", message: M.planError };

  const planItems = await service
    .from("link_plan_items")
    .select("id, position")
    .eq("plan_id", planId)
    .order("position", { ascending: true });
  if (planItems.error || (planItems.data ?? []).length !== items.length)
    return { status: "error", message: M.planError };
  const wsId = audit.workspace_id;
  const now = new Date().toISOString();
  const rows = items.map((it, i) => ({ it, id: planItems.data![i]!.id }));

  const writes = await Promise.all([
    service.from("link_plan_triage_runs").insert({
      plan_id: planId,
      workspace_id: wsId,
      status: "termine",
      requested_by: userId,
      finished_at: now,
      stats: { origin: "cibles", targets: items.length } as unknown as Json,
    }),
    service.from("contact_runs").insert({
      plan_id: planId,
      workspace_id: wsId,
      status: "termine",
      requested_by: userId,
      finished_at: now,
      stats: { origin: "cibles", targets: items.length } as unknown as Json,
    }),
    service.from("link_target_triage").insert(
      rows.map(({ it, id }) => ({
        plan_item_id: id,
        plan_id: planId,
        workspace_id: wsId,
        verdict: "ok",
        reason: "Retenue par la qualification des cibles et validée par l'utilisateur.",
        needs_review: false,
        source: "llm",
        resolved_url: it.triage.resolvedUrl,
        url_status: 200,
        url_origin: "recherche",
        hook: it.triage.hook,
        page_title: it.triage.pageTitle,
      })),
    ),
    service.from("target_contacts").insert(
      rows.map(({ it, id }) => ({
        plan_item_id: id,
        plan_id: planId,
        workspace_id: wsId,
        status: it.contact.status,
        email: it.contact.email,
        email_source: it.contact.email ? "page" : null,
        verification: it.contact.verified ? "valide" : "non_verifie",
        contact_url: it.contact.contactUrl,
        form_url: it.contact.formUrl,
        reason: "Contact trouvé à la qualification des cibles.",
        sendable: it.contact.verified,
      })),
    ),
    service.from("plan_item_briefs").insert(
      rows.map(({ it, id }) => ({
        plan_item_id: id,
        plan_id: planId,
        workspace_id: wsId,
        target_id: it.card.id,
        finding_id: it.request.finding?.id ?? null,
        kind: it.request.kind,
        quote: it.request.quote,
        brief: it.brief as unknown as Json,
        request_lines: it.request.lines,
        presentation: ctx.role,
      })),
    ),
  ]);
  if (writes.some((w) => w.error)) return { status: "error", message: M.planError };

  const forms = rows.filter(({ it }) => it.contact.status === "formulaire" && it.contact.formUrl);
  if (forms.length > 0) {
    const tasks = await service.from("manual_tasks").insert(
      forms.map(({ it, id }) => ({
        plan_item_id: id,
        plan_id: planId,
        workspace_id: wsId,
        type: "formulaire",
        form_url: it.contact.formUrl!,
      })),
    );
    if (tasks.error) return { status: "error", message: M.planError };
  }
  await supabase.from("events").insert({
    workspace_id: wsId,
    actor_id: userId,
    type: "targets.validated",
    payload: { audit_id: auditId, plan_id: planId, items: items.length, presentation: ctx.role },
  });

  const n = String(items.length);
  const drafts = await startDrafts(supabase, auditId, getServiceClient, sendEvent);
  const extra = skipped.length ? ` ${M.skipped.replace("{n}", String(skipped.length))}` : "";
  if (drafts.status === "error")
    return {
      status: "ok",
      auditId,
      message:
        M.validatedNoDrafts.replace("{n}", n).replace("{reason}", drafts.message ?? "") + extra,
    };
  return { status: "ok", auditId, message: M.validated.replace("{n}", n) + extra };
}

/**
 * « Écarter » (ou « Remettre ») des sites de la liste à décider. Rien n'est supprimé : la date d'écart
 * suffit à les sortir de la liste, et « Remettre » l'efface. Un site déjà retenu n'est pas touché.
 * Droits vérifiés avec le client de la personne (RLS) avant d'écrire avec le client de service.
 */
export async function dismissTargets(
  supabase: Client,
  getServiceClient: () => Client,
  auditId: string,
  rawIds: readonly string[],
  dismiss: boolean,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  const ids = [...new Set(rawIds)].slice(0, 300);
  if (ids.length === 0) return { status: "error", message: M.nothingSelected };
  const { data: rows } = await supabase
    .from("qualified_targets")
    .select("id")
    .eq("audit_id", auditId)
    .in("id", ids);
  const visible = (rows ?? []).map((r) => r.id);
  if (visible.length === 0) return { status: "error", message: M.notFound };
  const { data: briefs } = await supabase
    .from("plan_item_briefs")
    .select("target_id")
    .in("target_id", visible);
  const kept = new Set((briefs ?? []).flatMap((b) => (b.target_id ? [b.target_id] : [])));
  const targets = visible.filter((id) => !kept.has(id));
  if (targets.length === 0) return { status: "error", message: M.notFound };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { error } = await service
    .from("qualified_targets")
    .update({ dismissed_at: dismiss ? new Date().toISOString() : null })
    .in("id", targets);
  if (error) return { status: "error", message: M.unavailable };
  return {
    status: "ok",
    message: dismiss ? M.dismissed(targets.length) : M.restored(targets.length),
  };
}
