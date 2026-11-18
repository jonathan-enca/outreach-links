import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { CATEGORY_LABELS, type Category } from "@/features/classification/types";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { loadSendQueue, queuedMessageText, type QueueNote } from "@/features/sending/queue-note";
import { cleanTag, isArchived, isUnread, threadStatus, type ThreadStatus } from "./status";

type Client = SupabaseClient<Database>;
const M = t.conversations.messages;

export interface ThreadMessage {
  from: "nous" | "eux" | "systeme";
  at: string | null;
  subject: string | null;
  text: string;
}

/** Un fil = tous les échanges avec un prospect, à partir du premier message envoyé. */
export interface ConversationView {
  id: string;
  domain: string;
  email: string;
  campaign: string;
  campaignId: string;
  status: ThreadStatus;
  category: string | null;
  unread: boolean;
  /** Traité : hors de la boîte de réception jusqu'à une nouvelle réponse. */
  archived: boolean;
  tags: string[];
  lastAt: string;
  preview: string;
  /** Pourquoi ce site (accroche tirée de sa page). */
  hook: string;
  messages: ThreadMessage[];
  /** Réponse proposée qui attend l'accord de la personne. */
  draft: { id: string; subject: string | null; body: string } | null;
  /** Écran complet du fil (choix « c'est payant », réponse prête à insérer, correction de catégorie). */
  classificationId: string | null;
}

export interface ConversationsView {
  threads: ConversationView[];
  campaigns: { id: string; label: string }[];
  tags: string[];
  /** Emails approuvés pas encore partis : pourquoi, et quand ils partiront. */
  queue: QueueNote | null;
}

export interface ConversationsOptions {
  now: Date;
  /** L'envoi réel est-il activé sur ce serveur (sinon : simulation). */
  realSending: boolean;
}

const ids = <T extends { id: string }>(rows: readonly T[]) => rows.map((r) => r.id);

/** Tous les fils de la personne, toutes campagnes confondues (RLS), le plus récent d'abord. */
export async function loadConversations(
  supabase: Client,
  opts: ConversationsOptions = { now: new Date(), realSending: false },
): Promise<ConversationsView> {
  const { data: sentRows } = await supabase
    .from("sent_messages")
    .select("id, plan_id, draft_id, step, to_email, subject, body, sent_at, follow_up_due_at")
    .eq("dry_run", false)
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(1000);
  const all = sentRows ?? [];
  const initial = all.filter((s) => s.step === "initial");
  const { threads: queued, note } = await loadQueued(
    supabase,
    new Set(all.map((s) => s.draft_id)),
    opts,
  );
  if (initial.length === 0) return finish(queued, note);
  const threadIds = ids(initial);
  const draftIds = [...new Set(initial.map((s) => s.draft_id))];
  const planIds = [...new Set(initial.map((s) => s.plan_id))];
  const [inbound, cls, states, replyDrafts, replySends, reads, tags, drafts, plans] =
    await Promise.all([
      supabase
        .from("inbound_messages")
        .select("id, sent_message_id, kind, subject, body_excerpt, received_at")
        .in("sent_message_id", threadIds)
        .order("received_at", { ascending: true }),
      supabase
        .from("reply_classifications")
        .select("id, sent_message_id, inbound_message_id, category, validated_category, created_at")
        .in("sent_message_id", threadIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("inbox_states")
        .select("sent_message_id, state")
        .in("sent_message_id", threadIds),
      supabase
        .from("reply_drafts")
        .select("id, sent_message_id, kind, subject, body, status, created_at")
        .in("sent_message_id", threadIds),
      supabase
        .from("reply_sends")
        .select("sent_message_id, subject, body, sent_at, dry_run")
        .in("sent_message_id", threadIds)
        .not("sent_at", "is", null),
      supabase
        .from("thread_reads")
        .select("sent_message_id, read_at, archived_at")
        .in("sent_message_id", threadIds),
      supabase.from("thread_tags").select("sent_message_id, tag").in("sent_message_id", threadIds),
      supabase.from("target_drafts").select("id, plan_item_id, hook").in("id", draftIds),
      supabase.from("link_plans").select("id, site_id, sites(domain, country)").in("id", planIds),
    ]);
  const itemIds = [...new Set((drafts.data ?? []).map((d) => d.plan_item_id))];
  const [items, links] = await Promise.all([
    supabase.from("link_plan_items").select("id, source_domain").in("id", itemIds),
    supabase
      .from("links")
      .select("plan_item_id")
      .in("plan_item_id", itemIds)
      .not("first_live_at", "is", null)
      .is("lost_at", null),
  ]);
  const group = <T>(rows: readonly T[] | null, key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return m;
  };
  const draftMap = new Map((drafts.data ?? []).map((d) => [d.id, d]));
  const itemMap = new Map((items.data ?? []).map((i) => [i.id, i.source_domain]));
  const live = new Set((links.data ?? []).map((l) => l.plan_item_id));
  const countries = t.sites.countries as Record<string, string>;
  const planMap = new Map(
    (plans.data ?? []).map((p) => {
      const s = p.sites as unknown as { domain: string; country: string | null } | null;
      const label = s
        ? `${s.domain}${s.country ? ` · ${countries[s.country] ?? s.country}` : ""}`
        : "";
      return [p.id, { id: p.site_id, label }];
    }),
  );
  const inboundBy = group(inbound.data, (r) => r.sent_message_id);
  const clsBy = group(cls.data, (r) => r.sent_message_id);
  const replyDraftsBy = group(replyDrafts.data, (r) => r.sent_message_id);
  const replySendsBy = group(replySends.data, (r) => r.sent_message_id);
  const tagsBy = group(tags.data, (r) => r.sent_message_id);
  const followUps = group(
    all.filter((s) => s.step === "relance"),
    (r) => r.draft_id,
  );
  const stateMap = new Map((states.data ?? []).map((s) => [s.sent_message_id, s.state]));
  const readMap = new Map((reads.data ?? []).map((r) => [r.sent_message_id, r.read_at]));
  const archivedMap = new Map((reads.data ?? []).map((r) => [r.sent_message_id, r.archived_at]));

  const threads = initial.map((s): ConversationView => {
    const d = draftMap.get(s.draft_id);
    const inb = inboundBy.get(s.id) ?? [];
    const replies = inb.filter((i) => i.kind === "reponse");
    const lastReply = replies.at(-1) ?? null;
    const lastCls = (clsBy.get(s.id) ?? []).at(-1) ?? null;
    const category =
      ((lastCls?.validated_category ?? lastCls?.category) as Category | null) ?? null;
    const relances = followUps.get(s.draft_id) ?? [];
    const ours = (replySendsBy.get(s.id) ?? []).filter((r) => !r.dry_run);
    const pending =
      (replyDraftsBy.get(s.id) ?? []).find(
        (r) => r.status === "brouillon" && r.kind === "reponse",
      ) ?? null;
    const rawState = stateMap.get(s.id);
    const state =
      rawState === "en_negociation" || rawState === "gagne" || rawState === "archive"
        ? rawState
        : null;
    const answered =
      lastReply !== null &&
      ours.some((o) => o.sent_at && Date.parse(o.sent_at) > Date.parse(lastReply.received_at));
    const status = threadStatus({
      category,
      state,
      hasReply: replies.length > 0,
      bounced: inb.some((i) => i.kind === "rebond"),
      followedUp: relances.length > 0,
      pendingDraft: pending !== null,
      answered,
      liveLink: d ? live.has(d.plan_item_id) : false,
    });
    const messages: ThreadMessage[] = [
      { from: "nous" as const, at: s.sent_at, subject: s.subject, text: s.body },
      ...relances.map((r) => ({
        from: "nous" as const,
        at: r.sent_at,
        subject: r.subject,
        text: r.body,
      })),
      ...inb.map((i) => ({
        from: i.kind === "reponse" ? ("eux" as const) : ("systeme" as const),
        at: i.received_at,
        subject: i.subject,
        text:
          i.kind === "reponse" ? i.body_excerpt : (M.system[i.kind as "rebond"] ?? i.body_excerpt),
      })),
      ...ours.map((o) => ({
        from: "nous" as const,
        at: o.sent_at,
        subject: o.subject,
        text: o.body,
      })),
    ].sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
    if (status === "envoye" && s.follow_up_due_at) {
      messages.push({
        from: "systeme",
        at: null,
        subject: null,
        text: M.followUpPlanned(
          new Date(s.follow_up_due_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
          }),
        ),
      });
    }
    const last = messages.filter((m) => m.at).at(-1)!;
    const campaign = planMap.get(s.plan_id);
    return {
      id: s.id,
      domain: (d && itemMap.get(d.plan_item_id)) ?? s.to_email.split("@")[1] ?? s.to_email,
      email: s.to_email,
      campaign: campaign?.label ?? "",
      campaignId: campaign?.id ?? "",
      status,
      category: category ? CATEGORY_LABELS[category] : null,
      unread: isUnread(lastReply?.received_at ?? null, readMap.get(s.id) ?? null),
      archived: isArchived(archivedMap.get(s.id) ?? null, lastReply?.received_at ?? null),
      tags: (tagsBy.get(s.id) ?? []).map((x) => x.tag).sort(),
      lastAt: last.at ?? s.sent_at ?? "",
      preview: last.text.replace(/\s+/g, " ").slice(0, 140),
      hook: d?.hook ?? "",
      messages,
      draft: pending ? { id: pending.id, subject: pending.subject, body: pending.body } : null,
      classificationId: lastCls?.id ?? null,
    };
  });
  return finish([...threads, ...queued], note);
}

function finish(threads: ConversationView[], queue: QueueNote | null): ConversationsView {
  threads.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  const campaigns = [...new Map(threads.map((x) => [x.campaignId, x.campaign])).entries()]
    .filter(([id]) => id)
    .map(([id, label]) => ({ id, label }));
  return { threads, campaigns, tags: [...new Set(threads.flatMap((x) => x.tags))].sort(), queue };
}

/**
 * Emails approuvés mais pas encore partis : ils apparaissent tout de suite dans les conversations,
 * avec le statut « approuvé, en attente d'envoi » (retour de Jonathan, 18/11 : un message approuvé
 * disparaissait de « À valider » sans réapparaître nulle part).
 */
async function loadQueued(
  supabase: Client,
  sentDraftIds: ReadonlySet<string>,
  opts: ConversationsOptions,
): Promise<{ threads: ConversationView[]; note: QueueNote | null }> {
  const { data: drafts } = await supabase
    .from("target_drafts")
    .select("id, plan_id, plan_item_id, subject, body, hook, generated_at, edited_at")
    .eq("status", "valide")
    .eq("channel", "email")
    .limit(500);
  const waiting = (drafts ?? []).filter((d) => !sentDraftIds.has(d.id));
  if (waiting.length === 0) return { threads: [], note: null };
  const itemIds = waiting.map((d) => d.plan_item_id);
  const [items, contacts, plans] = await Promise.all([
    supabase.from("link_plan_items").select("id, source_domain").in("id", itemIds),
    supabase.from("target_contacts").select("plan_item_id, email").in("plan_item_id", itemIds),
    supabase
      .from("link_plans")
      .select("id, site_id, sites(domain, country)")
      .in("id", [...new Set(waiting.map((d) => d.plan_id))]),
  ]);
  const itemMap = new Map((items.data ?? []).map((i) => [i.id, i.source_domain]));
  const mailMap = new Map((contacts.data ?? []).map((c) => [c.plan_item_id, c.email]));
  const countries = t.sites.countries as Record<string, string>;
  const planMap = new Map(
    (plans.data ?? []).map((p) => {
      const s = p.sites as unknown as { domain: string; country: string | null } | null;
      const label = s
        ? `${s.domain}${s.country ? ` · ${countries[s.country] ?? s.country}` : ""}`
        : "";
      return [p.id, { id: p.site_id, label }];
    }),
  );
  const { note, eta } = await loadSendQueue(
    supabase,
    waiting.map((d) => ({ id: d.id, siteId: planMap.get(d.plan_id)?.id ?? "" })),
    opts.now,
    opts.realSending,
  );
  const threads = waiting.map((d): ConversationView => {
    const when = eta.get(d.id);
    return {
      id: `attente-${d.id}`,
      domain: itemMap.get(d.plan_item_id) ?? "",
      email: mailMap.get(d.plan_item_id) ?? "",
      campaign: planMap.get(d.plan_id)?.label ?? "",
      campaignId: planMap.get(d.plan_id)?.id ?? "",
      status: "en_attente",
      category: null,
      unread: false,
      archived: false,
      tags: [],
      lastAt: d.edited_at ?? d.generated_at,
      preview: d.body.replace(/\s+/g, " ").slice(0, 140),
      hook: d.hook,
      messages: [
        { from: "nous", at: null, subject: d.subject, text: d.body },
        {
          from: "systeme",
          at: null,
          subject: null,
          text: when ? queuedMessageText(when) : M.queued,
        },
      ],
      draft: null,
      classificationId: null,
    };
  });
  return { threads, note };
}

/** Le fil appartient-il à la personne ? (lecture par la RLS, avant toute écriture par le serveur). */
async function ownThread(supabase: Client, threadId: unknown) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || typeof threadId !== "string") return null;
  const { data } = await supabase
    .from("sent_messages")
    .select("id, workspace_id")
    .eq("id", threadId)
    .maybeSingle();
  return data ? { ...data, userId: auth.user.id } : null;
}

/** Marque le fil comme lu (à l'ouverture). */
export async function markRead(
  supabase: Client,
  getServiceClient: () => Client,
  threadId: unknown,
): Promise<AuditActionState> {
  const own = await ownThread(supabase, threadId);
  if (!own) return { status: "error", message: M.notFound };
  const { error } = await getServiceClient().from("thread_reads").upsert(
    {
      sent_message_id: own.id,
      workspace_id: own.workspace_id,
      read_at: new Date().toISOString(),
      read_by: own.userId,
    },
    { onConflict: "sent_message_id" },
  );
  return error ? { status: "error", message: M.saveError } : { status: "ok" };
}

/** Ajoute ou retire une étiquette libre sur un fil (10 au plus par fil). */
export async function setTag(
  supabase: Client,
  getServiceClient: () => Client,
  threadId: unknown,
  rawTag: unknown,
  on: boolean,
): Promise<AuditActionState> {
  const own = await ownThread(supabase, threadId);
  if (!own) return { status: "error", message: M.notFound };
  const tag = cleanTag(rawTag);
  if (!tag) return { status: "error", message: M.emptyTag };
  const service = getServiceClient();
  if (!on) {
    const { error } = await service
      .from("thread_tags")
      .delete()
      .eq("sent_message_id", own.id)
      .eq("tag", tag);
    return error ? { status: "error", message: M.saveError } : { status: "ok" };
  }
  const { count } = await service
    .from("thread_tags")
    .select("tag", { count: "exact", head: true })
    .eq("sent_message_id", own.id);
  if ((count ?? 0) >= 10) return { status: "error", message: M.tooManyTags };
  const { error } = await service.from("thread_tags").upsert(
    {
      sent_message_id: own.id,
      workspace_id: own.workspace_id,
      tag,
      created_by: own.userId,
    },
    { onConflict: "sent_message_id,tag", ignoreDuplicates: true },
  );
  return error ? { status: "error", message: M.saveError } : { status: "ok" };
}

/** Archive (« traité ») ou désarchive un fil : il sort de la boîte de réception, ou y revient. */
export async function setArchived(
  supabase: Client,
  getServiceClient: () => Client,
  threadId: unknown,
  on: boolean,
): Promise<AuditActionState> {
  const own = await ownThread(supabase, threadId);
  if (!own) return { status: "error", message: M.notFound };
  const { error } = await getServiceClient()
    .from("thread_reads")
    .upsert(
      {
        sent_message_id: own.id,
        workspace_id: own.workspace_id,
        read_by: own.userId,
        // Archiver vaut lecture : la pastille « non lu » disparaît aussi.
        ...(on ? { read_at: new Date().toISOString() } : {}),
        archived_at: on ? new Date().toISOString() : null,
      },
      { onConflict: "sent_message_id" },
    );
  return error
    ? { status: "error", message: M.saveError }
    : { status: "ok", message: on ? M.archived : M.unarchived };
}
