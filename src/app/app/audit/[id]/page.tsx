import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { confirmAuditAction } from "@/features/audits/actions";
import { AuditDetail, type AuditView } from "@/features/audits/audit-detail";
import { isPlanKey } from "@/features/audits/plans";
import { startBacklinksAction } from "@/features/backlinks/actions";
import type { BacklinksView } from "@/features/backlinks/backlinks-section";
import type { CleanStats } from "@/features/backlinks/clean";
import { estimateBacklinks } from "@/features/backlinks/limits";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.audits.title };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Audit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: audit } = await supabase
    .from("audits")
    .select("*, sites(domain)")
    .eq("id", id)
    .maybeSingle();
  if (!audit) notFound();
  const { data: competitors } = await supabase
    .from("competitors")
    .select("domain, queries_count, best_rank, appearances, selected, score")
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

  const details = (audit.estimate_details ?? {}) as { perQuery?: { query: string; usd: number }[] };
  const site = audit.sites as unknown as { domain: string } | null;
  const view: AuditView = {
    id: audit.id,
    domain: site?.domain ?? "",
    status: audit.status,
    plan: audit.plan,
    estimatedCostUsd: audit.estimated_cost_usd === null ? null : Number(audit.estimated_cost_usd),
    actualCostUsd: audit.actual_cost_usd === null ? null : Number(audit.actual_cost_usd),
    costCapUsd: Number(audit.cost_cap_usd),
    perQuery: details.perQuery ?? [],
    errorMessage: audit.error_message,
    backlinks,
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
      <PageHeader
        title={`${t.audits.detailTitle} ${view.domain}`}
        description={t.audits.description}
      />
      <AuditDetail
        audit={view}
        confirmAction={confirmAuditAction.bind(null, audit.id)}
        startBacklinksAction={startBacklinksAction.bind(null, audit.id)}
      />
    </>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Suspense>
        <Audit params={props.params} />
      </Suspense>
      <p className="mt-6">
        <Link href="/app/audit" className="text-primary underline">
          {t.audits.back}
        </Link>
      </p>
    </>
  );
}
