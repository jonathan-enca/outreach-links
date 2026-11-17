import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Target } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { legacyChainEnabled } from "@/features/audits/chain";
import { JourneySteps } from "@/features/shell/journey-steps";
import { loadSiteWithAudit, siteHref, UUID_RE } from "@/features/shell/next-step";
import {
  readMoreAction,
  saveMessageSettingsAction,
  startCollectionAction,
  startFindingsAction,
  startQualificationAction,
  validateRequestsAction,
} from "@/features/targets/actions";
import { loadTargets } from "@/features/targets/service";
import { TargetsScreen } from "@/features/targets/targets-screen";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: t.targets.title };

async function Targets({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const found = await loadSiteWithAudit(supabase, id);
  if (!found) notFound();
  if (!found.audit) redirect(siteHref.relecture(id));
  const auditId = found.audit.id;
  const analysis = found.audit.analysis_status;
  const notReady = analysis === "confirme" || analysis === "en_cours" || analysis === "echoue";
  if (notReady) {
    return (
      <>
        <JourneySteps current="cibles" />
        <PageHeader title={t.targets.title} description={t.targets.description} />
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            icon={Target}
            title={t.targets.notReady.title}
            body={t.targets.notReady[analysis === "echoue" ? "failed" : "running"]}
          />
          <Button asChild>
            <Link href={siteHref.analyse(id)}>{t.targets.notReady.cta}</Link>
          </Button>
        </div>
      </>
    );
  }
  const view = await loadTargets(supabase, createServiceClient, auditId);
  if (!view) notFound();
  return (
    <>
      <JourneySteps current="cibles" />
      <PageHeader title={t.targets.title} description={t.targets.description} />
      <TargetsScreen
        view={view}
        auditId={auditId}
        showSteps={legacyChainEnabled()}
        actions={{
          startCollection: startCollectionAction.bind(null, auditId),
          startQualification: startQualificationAction.bind(null, auditId),
          startFindings: startFindingsAction.bind(null, auditId),
          saveSettings: saveMessageSettingsAction.bind(null, auditId),
          validate: validateRequestsAction.bind(null, auditId),
          readMore: readMoreAction.bind(null, auditId),
        }}
      />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link
          href={`${siteHref.analyse(id)}?etapes=1`}
          className="text-primary underline underline-offset-4"
        >
          {t.targets.reviewSteps}
        </Link>
      </p>
    </>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Targets params={props.params} />
    </Suspense>
  );
}
