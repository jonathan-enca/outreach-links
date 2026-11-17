import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  homeDestination,
  loadSiteSnapshots,
  nextStep,
  siteHref,
  START_HREF,
} from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/**
 * Accueil (MU.2, revu le 18/11). Pas de site : étape 1. Sinon la liste des sites, chacun avec son état,
 * sa prochaine étape et, une fois les cibles prêtes, un lien pour revoir l'analyse.
 */
async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const sites = await loadSiteSnapshots(supabase);
  const destination = homeDestination(sites);
  if (destination) redirect(destination);
  const h = t.shell.home;
  return (
    <>
      <PageHeader title={h.title} description={h.description} />
      <ul className="flex flex-col gap-3">
        {sites.map((s) => {
          const step = nextStep(s);
          return (
            <li key={s.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <strong>
                    {s.domain}
                    {s.country
                      ? ` · ${t.sites.countries[s.country as keyof typeof t.sites.countries] ?? s.country}`
                      : ""}
                  </strong>
                  <span className="text-sm text-muted-foreground">{h.state[step.kind]}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`${START_HREF}?site=${encodeURIComponent(s.domain)}`}
                    className="text-sm text-primary underline underline-offset-4"
                  >
                    {t.onboarding.market.addCountry}
                  </Link>
                  {step.kind === "cibles" ? (
                    <Link
                      href={`${siteHref.analyse(s.id)}?etapes=1`}
                      className="text-sm text-primary underline underline-offset-4"
                    >
                      {h.review}
                    </Link>
                  ) : null}
                  <Button asChild>
                    <Link href={step.href}>{h.action[step.kind]}</Link>
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
      <p className="mt-4">
        <Link href={START_HREF} className="text-primary underline underline-offset-4">
          {h.add}
        </Link>
      </p>
    </>
  );
}

export default function AppPage() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
