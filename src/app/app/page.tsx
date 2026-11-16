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
  START_HREF,
} from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/**
 * Accueil = prochaine étape (MU.2). Pas de site : étape 1. Un seul site : on va à son écran. Plusieurs
 * sites : la liste, chacun avec son état et son unique bouton.
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
                  <strong>{s.domain}</strong>
                  <span className="text-sm text-muted-foreground">{h.state[step.kind]}</span>
                </div>
                <Button asChild>
                  <Link href={step.href}>{h.action[step.kind]}</Link>
                </Button>
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
