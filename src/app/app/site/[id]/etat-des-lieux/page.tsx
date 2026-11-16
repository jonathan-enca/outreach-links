import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { loadSiteWithAudit, siteHref, UUID_RE } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.overview.title };

/** MU.2 : l'adresse et l'état vide. Le contenu (liens du site, concurrents, pages à pousser) vient en MU.10. */
async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const found = await loadSiteWithAudit(supabase, id);
  if (!found) notFound();
  const done = found.audit?.analysis_status === "termine";
  return (
    <>
      <PageHeader
        title={`${t.overview.title} · ${found.site.domain}`}
        description={t.overview.description}
      />
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={BarChart3}
          title={done ? t.overview.soonTitle : t.overview.waitingTitle}
          body={done ? t.overview.soonBody : t.overview.waitingBody}
        />
        <Button asChild>
          <Link
            href={
              done
                ? siteHref.cibles(id)
                : found.audit
                  ? siteHref.analyse(id)
                  : siteHref.relecture(id)
            }
          >
            {done ? t.overview.toTargets : t.overview.toAnalysis}
          </Link>
        </Button>
      </div>
    </>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Overview params={props.params} />
    </Suspense>
  );
}
