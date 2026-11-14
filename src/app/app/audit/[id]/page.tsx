import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { confirmAuditAction } from "@/features/audits/actions";
import { AuditDetail, type AuditView } from "@/features/audits/audit-detail";
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
      <AuditDetail audit={view} confirmAction={confirmAuditAction.bind(null, audit.id)} />
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
