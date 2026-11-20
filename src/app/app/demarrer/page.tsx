import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  searchConsoleSiteAction,
  startSiteAction,
  understandSiteAction,
} from "@/features/onboarding/actions";
import { UrlForm, type StartSearchConsole } from "@/features/onboarding/url-form";
import { readSearchConsoleStatus, searchConsoleEnabled } from "@/features/search-console/load";
import { JourneySteps } from "@/features/shell/journey-steps";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Lecture du site (accueil, sitemap, quelques pages) et profil de marque : jusqu'à ~40 s. */
export const maxDuration = 60;

export const metadata: Metadata = { title: t.onboarding.title };

type Params = { site?: string; campagne?: string; sc?: string; langue?: string };

/**
 * Étape 1 (maquette validée le 20/11, `docs/mockups/demarrer-campagne.html`) : le formulaire et, dedans,
 * la Search Console. Plus de « Mise en route » ni de lien vers le formulaire complet sur cet écran.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  // Adresse déjà saisie ailleurs (ex. sur la page d'accueil) : on la reprend, sans rien lancer.
  const { site, campagne, sc, langue } = await searchParams;
  let defaultUrl = typeof site === "string" ? site.slice(0, 253) : "";
  let defaultCountry: string | undefined;
  let defaultGoal: string | undefined;
  let searchConsole: StartSearchConsole | null = null;

  if (searchConsoleEnabled()) {
    searchConsole = { connected: null };
    // Retour de Google : la campagne créée au clic sur « Connecter » remet le formulaire comme on l'a quitté.
    if (typeof campagne === "string" && /^[0-9a-f-]{36}$/i.test(campagne)) {
      const supabase = await createClient();
      const { data: row } = await supabase
        .from("sites")
        .select("id, domain, country, goal")
        .eq("id", campagne)
        .maybeSingle();
      if (row) {
        defaultUrl = row.domain;
        defaultCountry = row.country ?? undefined;
        defaultGoal = row.goal;
        const status = await readSearchConsoleStatus(createServiceClient(), row.id);
        if (status) {
          searchConsole.connected = {
            domain: row.domain,
            property: status.property,
            googleEmail: status.googleEmail,
          };
        } else if (typeof sc === "string" && sc !== "ok") {
          const errors = t.searchConsole.errors;
          searchConsole.error = errors[sc as keyof typeof errors] ?? errors.invalide;
        }
      }
    }
  }

  return (
    <>
      <JourneySteps current="site" />
      <PageHeader title={t.onboarding.title} description={t.onboarding.description} />
      <Card className="p-6">
        <UrlForm
          startAction={startSiteAction}
          understandAction={understandSiteAction}
          searchConsoleSiteAction={searchConsoleSiteAction}
          searchConsole={searchConsole}
          defaultUrl={defaultUrl}
          defaultCountry={defaultCountry}
          defaultLanguage={langue === "fr" || langue === "en" ? langue : "auto"}
          defaultGoal={defaultGoal}
        />
      </Card>
    </>
  );
}
