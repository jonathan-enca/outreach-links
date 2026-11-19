import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { type TrackedTarget } from "./tracking";

type Client = SupabaseClient<Database>;

/** Lignes brutes lues en base (noms de colonnes tels quels). */
export interface QualTargetRow {
  id: string;
  audit_id: string;
  domain: string;
  piste: string | null;
  niveau: number;
  site_type: string | null;
}
export interface PlanRow {
  id: string;
  audit_id: string;
}
export interface PlanItemRow {
  id: string;
  plan_id: string;
  source_domain: string;
}
export interface DraftRow {
  id: string;
  plan_item_id: string;
}
export interface SentRow {
  id: string;
  draft_id: string;
}
export interface ReplyRow {
  sent_message_id: string;
}
export interface LinkRow {
  plan_item_id: string;
}

/**
 * Relie les cibles retenues à ce qui leur est arrivé. Une cible = (audit, domaine) ; ses éléments
 * de plan sont ceux du même audit dont la source est ce domaine. Un envoi = premier message
 * réellement envoyé ; une réponse = message entrant de type « réponse » rattaché à cet envoi ; un
 * lien = lien en ligne rattaché à un de ces éléments.
 */
export function joinTracking(input: {
  targets: QualTargetRow[];
  plans: PlanRow[];
  items: PlanItemRow[];
  drafts: DraftRow[];
  sent: SentRow[];
  replies: ReplyRow[];
  liveLinks: LinkRow[];
}): TrackedTarget[] {
  const auditOfPlan = new Map(input.plans.map((p) => [p.id, p.audit_id]));
  const itemsByKey = new Map<string, string[]>();
  for (const it of input.items) {
    const audit = auditOfPlan.get(it.plan_id);
    if (!audit) continue;
    const key = `${audit}|${it.source_domain}`;
    itemsByKey.set(key, [...(itemsByKey.get(key) ?? []), it.id]);
  }
  const draftsByItem = new Map<string, string[]>();
  for (const d of input.drafts)
    draftsByItem.set(d.plan_item_id, [...(draftsByItem.get(d.plan_item_id) ?? []), d.id]);
  const sentByDraft = new Map(input.sent.map((s) => [s.draft_id, s.id]));
  const replied = new Set(input.replies.map((r) => r.sent_message_id));
  const live = new Set(input.liveLinks.map((l) => l.plan_item_id));

  return input.targets.map((t) => {
    const items = itemsByKey.get(`${t.audit_id}|${t.domain}`) ?? [];
    const sentIds: string[] = [];
    for (const item of items)
      for (const draft of draftsByItem.get(item) ?? []) {
        const s = sentByDraft.get(draft);
        if (s) sentIds.push(s);
      }
    return {
      piste: t.piste,
      niveau: t.niveau,
      siteType: t.site_type,
      sent: sentIds.length > 0,
      replied: sentIds.some((s) => replied.has(s)),
      linked: items.some((i) => live.has(i)),
    };
  });
}

/** Lit toute une table par pages de 1 000 (limite de PostgREST). */
async function pageAll<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await read(from, from + size - 1);
    if (error) throw new Error(`suivi des cibles : ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

/** Lecture interne (service_role) de tout le suivi des cibles retenues. */
export async function loadTrackedTargets(service: Client): Promise<TrackedTarget[]> {
  const [targets, plans, items, drafts, sent, replies, links] = await Promise.all([
    pageAll<QualTargetRow>((f, t) =>
      service
        .from("qualified_targets")
        .select("id, audit_id, domain, piste, niveau, site_type")
        .eq("status", "liste_courte")
        .order("id")
        .range(f, t),
    ),
    pageAll<PlanRow>((f, t) =>
      service.from("link_plans").select("id, audit_id").order("id").range(f, t),
    ),
    pageAll<PlanItemRow>((f, t) =>
      service.from("link_plan_items").select("id, plan_id, source_domain").order("id").range(f, t),
    ),
    pageAll<DraftRow>((f, t) =>
      service.from("target_drafts").select("id, plan_item_id").order("id").range(f, t),
    ),
    pageAll<SentRow>((f, t) =>
      service
        .from("sent_messages")
        .select("id, draft_id")
        .eq("status", "envoye")
        .eq("step", "initial")
        .order("id")
        .range(f, t),
    ),
    pageAll<ReplyRow>((f, t) =>
      service
        .from("inbound_messages")
        .select("sent_message_id")
        .eq("kind", "reponse")
        .order("id")
        .range(f, t),
    ),
    pageAll<LinkRow>((f, t) =>
      service
        .from("links")
        .select("plan_item_id")
        .eq("status", "live")
        .not("plan_item_id", "is", null)
        .order("id")
        .range(f, t),
    ),
  ]);
  return joinTracking({
    targets,
    plans,
    items,
    drafts,
    sent,
    replies,
    liveLinks: links,
  });
}
