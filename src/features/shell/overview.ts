import type { SupabaseClient } from "@supabase/supabase-js";
import { loadQueue } from "@/features/approvals/service";
import type { Database } from "@/lib/supabase/database.types";
import { nextStep, type NextStep, type SiteSnapshot } from "./next-step";

type Client = SupabaseClient<Database>;

/** Une campagne = l'analyse complète d'un site pour un pays, puis les messages envoyés à ses cibles. */
export interface CampaignView {
  siteId: string;
  domain: string;
  country: string | null;
  auditId: string | null;
  /** Date de l'analyse (dernier audit). */
  analysedAt: string | null;
  step: NextStep;
  targets: number;
  validated: number;
  contacted: number;
  replies: number;
  liveLinks: number;
}

export interface OverviewView {
  campaigns: CampaignView[];
  totals: { targets: number; validated: number; contacted: number; replies: number; links: number };
  /** Ce qui attend l'utilisateur. */
  pending: { drafts: number; replies: number; forms: number };
  hasMailbox: boolean;
}

export interface OverviewRows {
  sites: { id: string; domain: string; country: string | null }[];
  audits: {
    id: string;
    site_id: string;
    status: string;
    analysis_status: string;
    created_at: string;
  }[];
  /** Cibles en liste courte, par audit. */
  targetsByAudit: Record<string, number>;
  plans: { id: string; site_id: string; item_count: number }[];
  /** Messages réellement partis (premier message), par plan. */
  sent: { id: string; plan_id: string }[];
  /** Réponses reçues (hors rebonds et réponses automatiques) : le message envoyé auquel elles répondent. */
  replies: { sent_message_id: string }[];
  links: { site_id: string }[];
  pendingDrafts: number;
  pendingReplies: number;
  pendingForms: number;
  mailboxes: number;
}

/** Assemble les compteurs par campagne et les totaux (pur, testé). */
export function buildOverview(r: OverviewRows): OverviewView {
  const latest = new Map<string, OverviewRows["audits"][number]>();
  for (const a of [...r.audits].sort((x, y) => y.created_at.localeCompare(x.created_at))) {
    if (!latest.has(a.site_id)) latest.set(a.site_id, a);
  }
  const siteOfPlan = new Map(r.plans.map((p) => [p.id, p.site_id]));
  const planOfSent = new Map(r.sent.map((s) => [s.id, s.plan_id]));
  const count = <T>(items: readonly T[], siteOf: (x: T) => string | undefined) => {
    const out = new Map<string, number>();
    for (const x of items) {
      const s = siteOf(x);
      if (s) out.set(s, (out.get(s) ?? 0) + 1);
    }
    return out;
  };
  const contacted = count(r.sent, (s) => siteOfPlan.get(s.plan_id));
  const replies = count(r.replies, (x) => siteOfPlan.get(planOfSent.get(x.sent_message_id) ?? ""));
  const links = count(r.links, (l) => l.site_id);
  const validated = new Map<string, number>();
  for (const p of r.plans) validated.set(p.site_id, (validated.get(p.site_id) ?? 0) + p.item_count);

  const campaigns = r.sites.map((s): CampaignView => {
    const a = latest.get(s.id) ?? null;
    const snap: SiteSnapshot = {
      id: s.id,
      domain: s.domain,
      country: s.country,
      audit: a ? { id: a.id, status: a.status, analysisStatus: a.analysis_status } : null,
    };
    return {
      siteId: s.id,
      domain: s.domain,
      country: s.country,
      auditId: a?.id ?? null,
      analysedAt: a?.created_at ?? null,
      step: nextStep(snap),
      targets: a ? (r.targetsByAudit[a.id] ?? 0) : 0,
      validated: validated.get(s.id) ?? 0,
      contacted: contacted.get(s.id) ?? 0,
      replies: replies.get(s.id) ?? 0,
      liveLinks: links.get(s.id) ?? 0,
    };
  });
  const sum = (f: (c: CampaignView) => number) => campaigns.reduce((n, c) => n + f(c), 0);
  return {
    campaigns,
    totals: {
      targets: sum((c) => c.targets),
      validated: sum((c) => c.validated),
      contacted: sum((c) => c.contacted),
      replies: sum((c) => c.replies),
      links: sum((c) => c.liveLinks),
    },
    pending: { drafts: r.pendingDrafts, replies: r.pendingReplies, forms: r.pendingForms },
    hasMailbox: r.mailboxes > 0,
  };
}

/** Tout ce que l'accueil, le menu et la liste des campagnes montrent (la RLS limite à l'espace de la personne). */
export async function loadOverview(
  supabase: Client,
  siteId: string | null = null,
): Promise<OverviewView> {
  const head = { count: "exact" as const, head: true };
  const [sites, audits, plans, sent, replies, links, queue] = await Promise.all([
    supabase.from("sites").select("id, domain, country").order("created_at", { ascending: true }),
    supabase
      .from("audits")
      .select("id, site_id, status, analysis_status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("link_plans").select("id, site_id, item_count").limit(500),
    supabase
      .from("sent_messages")
      .select("id, plan_id")
      .eq("step", "initial")
      .eq("dry_run", false)
      .not("sent_at", "is", null)
      .limit(5000),
    supabase.from("inbound_messages").select("sent_message_id").eq("kind", "reponse").limit(5000),
    supabase
      .from("links")
      .select("site_id")
      .not("first_live_at", "is", null)
      .is("lost_at", null)
      .limit(5000),
    // Les compteurs « à valider » sont ceux de la file elle-même : le menu, l'accueil et l'écran
    // affichent toujours le même nombre (retour de Jonathan, 18/11 : 50 au menu, 31 à l'écran).
    loadQueue(supabase, new Date(), siteId),
  ]);
  // Filtre « un seul site » : sites, analyses, plans, envois, réponses et liens se rattachent à ce site.
  const onlySite = <T extends { site_id: string }>(rows: T[]) =>
    siteId ? rows.filter((r) => r.site_id === siteId) : rows;
  const sitePlans = onlySite(plans.data ?? []);
  const sitePlanIds = new Set(sitePlans.map((p) => p.id));
  const siteSent = (sent.data ?? []).filter((s) => !siteId || sitePlanIds.has(s.plan_id));
  const siteSentIds = new Set(siteSent.map((s) => s.id));
  const siteReplies = (replies.data ?? []).filter(
    (r) => !siteId || siteSentIds.has(r.sent_message_id),
  );
  const siteAudits = onlySite(audits.data ?? []);
  const siteSites = (sites.data ?? []).filter((s) => !siteId || s.id === siteId);
  const latestIds = [
    ...new Map(siteAudits.map((a) => [a.site_id, a.id] as const).reverse()).values(),
  ];
  const targetsByAudit: Record<string, number> = {};
  await Promise.all(
    latestIds.map(async (auditId) => {
      const { count } = await supabase
        .from("qualified_targets")
        .select("id", head)
        .eq("audit_id", auditId)
        .eq("status", "liste_courte");
      targetsByAudit[auditId] = count ?? 0;
    }),
  );
  return buildOverview({
    sites: siteSites,
    audits: siteAudits,
    targetsByAudit,
    plans: sitePlans,
    sent: siteSent,
    replies: siteReplies,
    links: onlySite(links.data ?? []),
    pendingDrafts: queue.messages.length,
    pendingReplies: queue.replies.length,
    pendingForms: queue.forms.length,
    mailboxes: queue.hasMailbox ? 1 : 0,
  });
}
