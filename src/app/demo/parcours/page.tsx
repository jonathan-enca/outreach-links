import { notFound } from "next/navigation";
import { AnalysisProgress } from "@/features/analysis/analysis-progress";
import { DEMO_STATES, demoSnapshot, type DemoState } from "@/features/analysis/demo-snapshots";
import type { StoredBrandProfile } from "@/features/brand/schema";
import { JourneyTop, Stage } from "@/features/onboarding/journey-stage";
import { LaunchPanel } from "@/features/onboarding/launch-panel";
import type { LaunchPreview } from "@/features/onboarding/service";
import { siteLine, verifyLine, youLine } from "@/features/onboarding/summary";
import { UrlForm } from "@/features/onboarding/url-form";

export const dynamic = "force-dynamic";

const DOMAIN = "exemple-coloriages.fr";

const BRAND: StoredBrandProfile = {
  version: 1,
  source: "llm",
  pagesRead: [],
  costUsd: 0,
  createdAt: "2026-11-20T00:00:00Z",
  profile: {
    activity: "Un site de coloriages gratuits à imprimer, classés par thème et par âge.",
    offer: "Plus de 3 000 coloriages, des fiches pour la classe, des coloriages magiques.",
    language: "fr",
    audience: ["Parents", "Enseignants de maternelle et de primaire", "Animateurs"],
    linkable_resources: [
      { url: `https://${DOMAIN}/`, title: "Page d'accueil", selected: true },
      { url: `https://${DOMAIN}/noel`, title: "Coloriages de Noël", selected: true },
      { url: `https://${DOMAIN}/magiques-cp`, title: "Coloriages magiques CP", selected: false },
    ],
    name_variants: ["Exemple Coloriages", DOMAIN],
    tone: "chaleureux",
    personas: [
      { label: "Enseignants", sites: "blogs de classe", reason: "citent des fiches gratuites" },
      { label: "Parents", sites: "blogs de parents", reason: "partagent des activités" },
    ],
    publisher_types: [
      { label: "Enseignants", category: "blog", terms: ["maîtresse"], origin: "persona" },
      { label: "Blogs de parents", category: "blog", terms: ["maman"], origin: "persona" },
      { label: "Médiathèques", category: "autre", terms: ["médiathèque"], origin: "voisin" },
      { label: "Centres de loisirs", category: "autre", terms: ["loisirs"], origin: "voisin" },
      { label: "Associations", category: "autre", terms: ["association"], origin: "voisin" },
    ],
    theme_terms: ["coloriages"],
  },
} as unknown as StoredBrandProfile;

/**
 * Démonstration du parcours de campagne en une page : `/demo/parcours?etape=1` (à 4), avec
 * `&sc=trouve|absent` à l'étape 1 et `&etat=lecture|terminee|…` à l'étape 4. Données d'exemple
 * seulement (aucune base, aucun appel) ; absente en production.
 */
export default async function DemoParcoursPage({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string; sc?: string; etat?: string; objectif?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { etape, sc, etat, objectif } = await searchParams;
  const step = Number(etape) || 1;
  const goal = objectif === "pages" ? "mots_cles" : "autorite_generale";

  async function idle() {
    "use server";
    return { status: "idle" as const };
  }
  async function lookup(url: string) {
    "use server";
    if (sc === "trouve")
      return { status: "found" as const, email: "vous@gmail.com", property: `sc-domain:${url}` };
    if (sc === "absent") return { status: "missing" as const, email: "vous@gmail.com" };
    return { status: "none" as const };
  }
  async function noStart() {
    "use server";
    return { status: "error" as const, message: "Démonstration : rien n'est lancé." };
  }

  const main = (children: React.ReactNode) => (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-6">{children}</main>
  );

  if (step === 1) {
    return main(
      <div className="mx-auto w-full max-w-3xl">
        <JourneyTop current={1} />
        <div className="flex flex-col gap-3.5">
          <Stage n={1} state="current">
            <UrlForm
              startAction={noStart}
              understandAction={noStart}
              searchConsoleSiteAction={noStart}
              searchConsole={{ connected: null }}
              lookupSearchConsole={sc ? lookup : undefined}
              linkSearchConsole={async () => {
                "use server";
                return false;
              }}
              defaultUrl={sc ? DOMAIN : ""}
            />
          </Stage>
          <Stage n={2} state="todo" />
          <Stage n={3} state="todo" />
          <Stage n={4} state="todo" />
        </div>
      </div>,
    );
  }

  const site = { domain: DOMAIN, country: "FR", goal };
  if (step <= 3) {
    const preview = {
      siteId: "demo",
      workspaceId: "demo",
      domain: DOMAIN,
      theme: "coloriages à imprimer pour enfants",
      language: "fr",
      country: "FR",
      queries: ["coloriage enfant"],
      goal,
      verified: false,
      totalUsd: 1,
      capUsd: 2,
      auditId: null,
      brand: BRAND,
    } as unknown as LaunchPreview;
    return main(
      <LaunchPanel
        preview={preview}
        action={idle}
        saveAction={idle}
        siteSummary={siteLine(site, sc === "trouve")}
        editSiteHref="/demo/parcours?etape=1"
        emailEnabled
      />,
    );
  }

  const state = (DEMO_STATES as readonly string[]).includes(etat ?? "")
    ? (etat as DemoState)
    : "lecture";
  return main(
    <div className="mx-auto w-full max-w-3xl">
      <JourneyTop current={4} />
      <div className="flex flex-col gap-3.5">
        <Stage n={1} state="done" summary={siteLine(site, true)} />
        <Stage
          n={2}
          state="done"
          summary={verifyLine("coloriages à imprimer pour enfants", BRAND, DOMAIN)}
        />
        <Stage n={3} state="done" summary={youLine(BRAND)} />
        <Stage n={4} state="current">
          <AnalysisProgress
            initial={demoSnapshot(state)}
            resumeAction={idle}
            restartAction={idle}
            relaunchAction={idle}
            emailEnabled
            autoOpen={false}
            variant="stage"
          />
        </Stage>
      </div>
    </div>,
  );
}
