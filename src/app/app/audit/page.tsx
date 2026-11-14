import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createAuditAction } from "@/features/audits/actions";
import { AuditStatusBadge } from "@/features/audits/audit-status-badge";
import { PrepareAuditForm } from "@/features/audits/prepare-audit-form";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.audits.title };

const ACTIVE = ["en_attente", "estime", "confirme", "en_cours"];

async function Audits() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: sites }, { data: audits }] = await Promise.all([
    supabase
      .from("sites")
      .select("id, domain, priority_queries")
      .order("created_at", { ascending: true }),
    supabase
      .from("audits")
      .select("id, site_id, status, estimated_cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!sites?.length) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState icon={Search} title={t.audits.noSitesTitle} body={t.audits.noSitesBody} />
        <Button asChild>
          <Link href="/app/site/nouveau">{t.audits.addSite}</Link>
        </Button>
      </div>
    );
  }

  const domainById = new Map(sites.map((s) => [s.id, s.domain]));
  const activeBySite = new Map(
    (audits ?? []).filter((a) => ACTIVE.includes(a.status)).map((a) => [a.site_id, a.id]),
  );
  const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">{t.audits.sitesTitle}</h2>
        <ul className="flex flex-col gap-3">
          {sites.map((s) => {
            const activeId = activeBySite.get(s.id);
            return (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <strong>{s.domain}</strong>
                  {activeId ? (
                    <Button asChild size="sm">
                      <Link href={`/app/audit/${activeId}`}>{t.audits.openCurrent}</Link>
                    </Button>
                  ) : s.priority_queries.length ? (
                    <PrepareAuditForm action={createAuditAction.bind(null, s.id)} />
                  ) : (
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <p className="text-sm text-muted-foreground">{t.audits.noQueriesHint}</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/app/site/${s.id}`}>{t.audits.editSite}</Link>
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
      {audits?.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">{t.audits.historyTitle}</h2>
          <ul className="flex flex-col gap-2">
            {audits.map((a) => (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex flex-col">
                    <strong>{domainById.get(a.site_id) ?? "-"}</strong>
                    <span className="text-sm text-muted-foreground">
                      {dateFmt.format(new Date(a.created_at))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <AuditStatusBadge status={a.status} />
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app/audit/${a.id}`}>{t.audits.open}</Link>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title={t.audits.title} description={t.audits.description} />
      <Suspense>
        <Audits />
      </Suspense>
    </>
  );
}
