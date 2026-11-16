import { notFound, redirect } from "next/navigation";
import { JourneySteps } from "@/features/shell/journey-steps";
import { PageHeader } from "@/components/page-header";
import { confirmAuditAction } from "@/features/audits/actions";
import { AuditDetail, type AuditView } from "@/features/audits/audit-detail";
import { legacyChainEnabled, type ChainEstimate } from "@/features/audits/chain";
import { chainProgressView } from "@/features/audits/chain-progress";
import { isPlanKey } from "@/features/audits/plans";
import { startBacklinksAction } from "@/features/backlinks/actions";
import type { BacklinksView } from "@/features/backlinks/backlinks-section";
import type { CleanStats } from "@/features/backlinks/clean";
import { estimateBacklinks } from "@/features/backlinks/limits";
import { startDeadlinksAction } from "@/features/deadlinks/actions";
import type { DeadlinksView } from "@/features/deadlinks/deadlinks-section";
import { startOpportunitiesAction } from "@/features/opportunities/actions";
import type { OpportunitiesView } from "@/features/opportunities/opportunities-section";
import { estimateForSite } from "@/features/opportunities/service";
import { startProfileAction } from "@/features/profile/actions";
import { estimateProfile } from "@/features/profile/limits";
import type { ProfileView } from "@/features/profile/profile-section";
import type { ProfileData } from "@/features/profile/run";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export async function AuditContent({ id }: { id: string }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: audit } = await supabase
    .from("audits")
    .select("*, sites(domain, niche, priority_queries, offered_asset)")
    .eq("id", id)
    .maybeSingle();
  if (!audit) notFound();
  const { data: competitors } = await supabase
    .from("competitors")
    .select("domain, queries_count, best_rank, appearances, selected, score, referring_domains")
    .eq("audit_id", id)
    .order("selected", { ascending: false })
    .order("queries_count", { ascending: false })
    .order("score", { ascending: false })
    .limit(50);

  let backlinks: BacklinksView | undefined;
  if (audit.status === "termine") {
    const selected = (competitors ?? []).filter((c) => c.selected).length;
    const remaining = Number(audit.cost_cap_usd) - Number(audit.actual_cost_usd ?? 0);
    const est = estimateBacklinks(
      selected,
      isPlanKey(audit.plan) ? audit.plan : "gratuit",
      remaining,
    );
    const done = audit.backlinks_status === "termine";
    const { data: sample } = done
      ? await supabase
          .from("competitor_backlinks")
          .select("source_domain, source_url, anchor, spam_score, dofollow")
          .eq("audit_id", id)
          .eq("clean_status", "garde")
          .order("source_rank", { ascending: false, nullsFirst: false })
          .limit(15)
      : { data: [] };
    const base = `/app/audit/${id}/export`;
    backlinks = {
      status: audit.backlinks_status,
      estimate: est
        ? {
            totalUsd: audit.backlinks_estimated_cost_usd ?? est.totalUsd,
            perCompetitorUsd: est.perCompetitorUsd,
            competitors: est.competitors,
            limit: audit.backlinks_limit ?? est.limit,
          }
        : null,
      stats: done ? (audit.backlinks_stats as unknown as CleanStats) : null,
      costUsd: audit.backlinks_cost_usd === null ? null : Number(audit.backlinks_cost_usd),
      errorMessage: audit.backlinks_error,
      sample: (sample ?? []).map((b) => ({
        sourceDomain: b.source_domain,
        sourceUrl: b.source_url,
        anchor: b.anchor,
        spamScore: b.spam_score,
        dofollow: b.dofollow,
      })),
      exportKeptHref: `${base}?portee=propres`,
      exportAllHref: `${base}?portee=tout`,
    };
  }

  let profile: ProfileView | undefined;
  if (audit.status === "termine" && audit.backlinks_status === "termine") {
    const selected = (competitors ?? []).filter((c) => c.selected).length;
    const spent =
      Number(audit.actual_cost_usd ?? 0) +
      Number(audit.backlinks_cost_usd ?? 0) +
      Number(audit.profile_cost_usd ?? 0);
    const est = estimateProfile(
      selected,
      isPlanKey(audit.plan) ? audit.plan : "gratuit",
      Number(audit.cost_cap_usd) - spent,
      (competitors ?? []).filter((c) => c.selected && c.referring_domains != null).length,
    );
    const done = audit.profile_status === "termine";
    const [pagesRes, gapRes, rankedRes] = done
      ? await Promise.all([
          supabase
            .from("audit_pages")
            .select("*")
            .eq("audit_id", id)
            .eq("is_priority", true)
            .order("priority_rank", { ascending: true })
            .limit(20),
          supabase
            .from("audit_gap_domains")
            .select("domain, competitors_count, competitors, sample_url")
            .eq("audit_id", id)
            .order("competitors_count", { ascending: false })
            .order("best_rank", { ascending: false, nullsFirst: false })
            .limit(25),
          supabase.from("audit_pages").select("best_position").eq("audit_id", id).limit(1000),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];
    profile = {
      status: audit.profile_status,
      estimate: est
        ? {
            totalUsd: audit.profile_estimated_cost_usd ?? est.totalUsd,
            competitors: est.limits.benchmarkCompetitors,
            rows: Math.max(
              est.limits.keywords,
              est.limits.referringDomains,
              est.limits.backlinksSample,
            ),
            pages: est.limits.onpagePages,
          }
        : null,
      data: done ? (audit.profile_data as unknown as ProfileData) : null,
      summary: audit.profile_summary,
      summarySource: audit.profile_summary_source as "llm" | "modele" | null,
      costUsd: audit.profile_cost_usd === null ? null : Number(audit.profile_cost_usd),
      errorMessage: audit.profile_error,
      pagesRanked: {
        total: (rankedRes.data ?? []).length,
        top10: (rankedRes.data ?? []).filter((p) => (p.best_position ?? 99) <= 10).length,
      },
      pages: (pagesRes.data ?? []).map((p) => ({
        url: p.url,
        avgPosition: p.avg_position === null ? null : Number(p.avg_position),
        totalVolume: p.total_volume,
        pageDomains: p.referring_domains,
        neededLow: p.required_domains_low,
        neededHigh: p.required_domains_high,
        neededEstimated: p.required_domains_estimated,
        techStatus: p.tech_status,
        techIssues: p.tech_issues,
      })),
      gap: (gapRes.data ?? []).map((g) => ({
        domain: g.domain,
        competitorsCount: g.competitors_count,
        competitors: g.competitors,
        sampleUrl: g.sample_url,
      })),
    };
  }

  let opportunities: OpportunitiesView | undefined;
  if (audit.profile_status === "termine") {
    const siteRow = audit.sites as unknown as {
      domain: string;
      niche: string | null;
      priority_queries: string[];
      offered_asset: string | null;
    } | null;
    const est = siteRow ? estimateForSite(siteRow, audit.plan) : null;
    const done = audit.opportunities_status === "termine";
    const { data: opps } = done
      ? await supabase
          .from("link_opportunities")
          .select("source_domain, type, priority, target_page_url, rationale")
          .eq("audit_id", id)
          .order("priority_score", { ascending: false })
          .limit(50)
      : { data: [] };
    const stats = (audit.opportunities_stats ?? {}) as {
      total?: number;
      byType?: Record<string, number>;
    };
    opportunities = {
      status: audit.opportunities_status,
      estimate: est
        ? {
            totalUsd: audit.opportunities_estimated_cost_usd ?? est.totalUsd,
            queries: est.queries.length,
            capUsd: est.capUsd,
          }
        : null,
      errorMessage: audit.opportunities_error,
      costUsd: audit.opportunities_cost_usd === null ? null : Number(audit.opportunities_cost_usd),
      total: stats.total ?? 0,
      byType: stats.byType ?? {},
      items: (opps ?? []).map((o) => ({
        domain: o.source_domain,
        type: o.type,
        priority: o.priority,
        targetPageUrl: o.target_page_url,
        rationale: o.rationale,
      })),
    };
  }

  let deadlinks: DeadlinksView | undefined;
  if (audit.opportunities_status === "termine") {
    const ds = (audit.deadlinks_stats ?? {}) as Partial<NonNullable<DeadlinksView["stats"]>>;
    deadlinks = {
      status: audit.deadlinks_status,
      errorMessage: audit.deadlinks_error,
      stats:
        audit.deadlinks_status === "termine"
          ? {
              requests: ds.requests ?? 0,
              competitorUrlsChecked: ds.competitorUrlsChecked ?? 0,
              resourcePagesCrawled: ds.resourcePagesCrawled ?? 0,
              linksChecked: ds.linksChecked ?? 0,
              blockedByRobots: ds.blockedByRobots ?? 0,
              created: ds.created ?? 0,
              truncated: ds.truncated ?? false,
            }
          : null,
    };
  }

  const details = (audit.estimate_details ?? {}) as {
    perQuery?: { query: string; usd: number }[];
    chain?: ChainEstimate;
  };
  // MU.1 (décision D2) : l'ancienne chaîne sort du parcours. Ses blocs (backlinks des concurrents,
  // profil de liens, opportunités, chasseur 404) ne s'affichent plus que si le réglage `LEGACY_CHAIN`
  // la remet, ou pour un ancien audit qui l'a réellement utilisée.
  const showLegacy =
    audit.analysis_status === "aucun" &&
    (legacyChainEnabled() || audit.backlinks_status !== "aucun");
  const chainProgress =
    showLegacy && audit.auto_chain && audit.status !== "estime"
      ? chainProgressView({
          auditStatus: audit.status,
          backlinks: audit.backlinks_status,
          profile: audit.profile_status,
          opportunities: audit.opportunities_status,
          uncovered: details.chain?.uncovered ?? [],
        })
      : null;
  const site = audit.sites as unknown as { domain: string } | null;
  const view: AuditView = {
    id: audit.id,
    siteId: audit.site_id,
    analysisStatus: audit.analysis_status,
    domain: site?.domain ?? "",
    status: audit.status,
    plan: audit.plan,
    estimatedCostUsd: audit.estimated_cost_usd === null ? null : Number(audit.estimated_cost_usd),
    actualCostUsd: audit.actual_cost_usd === null ? null : Number(audit.actual_cost_usd),
    costCapUsd: Number(audit.cost_cap_usd),
    perQuery: details.perQuery ?? [],
    chain: details.chain ?? null,
    chainProgress,
    errorMessage: audit.error_message,
    backlinks: showLegacy ? backlinks : undefined,
    profile: showLegacy ? profile : undefined,
    opportunities: showLegacy ? opportunities : undefined,
    deadlinks: showLegacy ? deadlinks : undefined,
    competitors: (competitors ?? []).map((c) => ({
      domain: c.domain,
      queriesCount: c.queries_count,
      bestRank: c.best_rank,
      appearances: c.appearances,
      selected: c.selected,
    })),
  };
  return (
    <>
      <JourneySteps current="analyse" />
      <PageHeader
        title={`${t.audits.analysisTitle} ${view.domain}`}
        description={t.audits.analysisDescription}
      />
      <AuditDetail
        audit={view}
        confirmAction={confirmAuditAction.bind(null, audit.id)}
        startBacklinksAction={startBacklinksAction.bind(null, audit.id)}
        startProfileAction={startProfileAction.bind(null, audit.id)}
        startOpportunitiesAction={startOpportunitiesAction.bind(null, audit.id)}
        startDeadlinksAction={startDeadlinksAction.bind(null, audit.id)}
      />
    </>
  );
}
