import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { launchJourneyAction, saveCorrectionsAction } from "@/features/onboarding/actions";
import { LaunchPanel } from "@/features/onboarding/launch-panel";
import { getLaunchPreview } from "@/features/onboarding/service";
import { JourneySteps } from "@/features/shell/journey-steps";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.onboarding.review.title };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Review({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  if (!UUID.test(siteId)) notFound();
  const preview = await getLaunchPreview(await createClient(), siteId);
  if (!preview) notFound();
  if (preview.auditId) {
    return (
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-xl font-semibold">{t.onboarding.review.alreadyTitle}</h2>
        <Button asChild className="self-start">
          <Link href={siteHref.analyse(siteId)}>{t.onboarding.review.alreadyOpen}</Link>
        </Button>
      </Card>
    );
  }
  return (
    <LaunchPanel
      preview={preview}
      action={launchJourneyAction.bind(null, siteId)}
      saveAction={saveCorrectionsAction.bind(null, siteId)}
    />
  );
}

export default function Page(props: { params: Promise<{ siteId: string }> }) {
  return (
    <>
      <JourneySteps current="verification" />
      <PageHeader
        title={t.onboarding.review.title}
        description={t.onboarding.review.pageDescription}
      />
      <Suspense>
        <Review params={props.params} />
      </Suspense>
    </>
  );
}
