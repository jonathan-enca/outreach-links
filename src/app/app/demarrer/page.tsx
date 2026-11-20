import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { startSiteAction, understandSiteAction } from "@/features/onboarding/actions";
import { UrlForm } from "@/features/onboarding/url-form";
import { FirstLinksPanel } from "@/features/shell/first-links-panel";
import { JourneySteps } from "@/features/shell/journey-steps";
import { loadOverview } from "@/features/shell/overview";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** Lecture du site (accueil, sitemap, quelques pages) et profil de marque : jusqu'à ~40 s. */
export const maxDuration = 60;

export const metadata: Metadata = { title: t.onboarding.title };

export default async function Page({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  // Adresse déjà saisie ailleurs (ex. sur la page d'accueil) : on la reprend, sans rien lancer.
  const { site } = await searchParams;
  const defaultUrl = typeof site === "string" ? site.slice(0, 253) : "";
  const overview = await loadOverview(await createClient(), null);
  return (
    <>
      <JourneySteps current="site" />
      <PageHeader title={t.onboarding.title} description={t.onboarding.description} />
      <Card className="p-6">
        <UrlForm
          startAction={startSiteAction}
          understandAction={understandSiteAction}
          defaultUrl={defaultUrl}
        />
      </Card>
      <div className="mt-6">
        <FirstLinksPanel o={overview} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {t.onboarding.advanced}{" "}
        <Link href="/app/site/nouveau" className="text-primary underline">
          {t.onboarding.advancedLink}
        </Link>
      </p>
    </>
  );
}
