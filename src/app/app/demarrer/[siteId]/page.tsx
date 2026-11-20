import { env } from "@/env";
import { ANALYSIS_EMAIL_VERIFIED } from "@/features/analysis/email-promise";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { launchJourneyAction, saveCorrectionsAction } from "@/features/onboarding/actions";
import { LaunchPanel } from "@/features/onboarding/launch-panel";
import { getLaunchPreview } from "@/features/onboarding/service";
import { siteSummary } from "@/features/onboarding/summary";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.onboarding.title };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Étapes 2 et 3 du parcours en une page (maquette validée le 20/11, `docs/mockups/parcours-campagne-v2.html`) :
 * même mise en page que l'étape 1, qui est repliée en haut. Une analyse déjà lancée mène à l'étape 4.
 */
async function Review({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  if (!UUID.test(siteId)) notFound();
  const supabase = await createClient();
  const preview = await getLaunchPreview(supabase, siteId);
  if (!preview) notFound();
  if (preview.auditId) redirect(siteHref.analyse(siteId));
  return (
    <LaunchPanel
      preview={preview}
      action={launchJourneyAction.bind(null, siteId)}
      saveAction={saveCorrectionsAction.bind(null, siteId)}
      siteSummary={await siteSummary(siteId, {
        domain: preview.domain,
        country: preview.country,
        goal: preview.goal,
      })}
      editSiteHref={`/app/demarrer?campagne=${siteId}`}
      emailEnabled={ANALYSIS_EMAIL_VERIFIED && Boolean(env.RESEND_API_KEY)}
    />
  );
}

export default function Page(props: { params: Promise<{ siteId: string }> }) {
  return (
    <Suspense>
      <Review params={props.params} />
    </Suspense>
  );
}
