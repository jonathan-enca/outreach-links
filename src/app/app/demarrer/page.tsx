import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PENDING_SITE_COOKIE, pendingSite } from "@/features/auth/pending-site";
import {
  searchConsoleSiteAction,
  startSiteAction,
  understandSiteAction,
} from "@/features/onboarding/actions";
import { JourneyTop, Stage } from "@/features/onboarding/journey-stage";
import { UrlForm, type StartSearchConsole } from "@/features/onboarding/url-form";
import {
  linkSearchConsoleAction,
  lookupSearchConsoleAction,
} from "@/features/search-console/actions";
import { readSearchConsoleStatus, searchConsoleEnabled } from "@/features/search-console/load";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Lecture du site (accueil, sitemap, quelques pages) et profil de marque : jusqu'à ~40 s. */
export const maxDuration = 60;

export const metadata: Metadata = { title: t.onboarding.title };

type Params = { site?: string; campagne?: string; sc?: string; langue?: string };

/**
 * Étape 1 (maquettes validées le 20/11, `docs/mockups/demarrer-campagne.html` puis
 * `parcours-campagne-v2.html`) : les quatre étapes sur une seule page, l'étape 1 ouverte. Une Search
 * Console déjà connectée est reconnue dès que l'adresse est tapée. « Modifier » depuis l'étape 2 revient
 * ici avec la campagne (`?campagne=`) : le formulaire est rempli comme on l'a laissé.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  // Adresse déjà saisie ailleurs (ex. sur la page d'accueil) : on la reprend, sans rien lancer.
  const { site, campagne, sc, langue } = await searchParams;
  let defaultUrl = typeof site === "string" ? site.slice(0, 253) : "";
  // Site tapé dans un article avant l'inscription (cookie posé à la création du compte).
  if (!defaultUrl) {
    defaultUrl = pendingSite((await cookies()).get(PENDING_SITE_COOKIE)?.value) ?? "";
  }
  let defaultCountry: string | undefined;
  let defaultGoal: string | undefined;
  let searchConsole: StartSearchConsole | null = null;

  const scOn = searchConsoleEnabled();
  if (scOn) searchConsole = { connected: null };
  // Retour de Google, ou « Modifier » depuis l'étape 2 : le formulaire est remis comme on l'a quitté.
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
      if (searchConsole) {
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
    <div className="mx-auto w-full max-w-3xl">
      <JourneyTop current={1} />
      <div className="flex flex-col gap-3.5">
        <Stage n={1} state="current">
          <UrlForm
            startAction={startSiteAction}
            understandAction={understandSiteAction}
            searchConsoleSiteAction={searchConsoleSiteAction}
            searchConsole={searchConsole}
            lookupSearchConsole={scOn ? lookupSearchConsoleAction : undefined}
            linkSearchConsole={scOn ? linkSearchConsoleAction : undefined}
            defaultUrl={defaultUrl}
            defaultCountry={defaultCountry}
            defaultLanguage={langue === "fr" || langue === "en" ? langue : "auto"}
            defaultGoal={defaultGoal}
          />
        </Stage>
        <Stage n={2} state="todo" />
        <Stage n={3} state="todo" />
        <Stage n={4} state="todo" />
      </div>
    </div>
  );
}
