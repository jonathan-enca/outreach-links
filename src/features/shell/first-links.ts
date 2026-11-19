import { START_HREF, siteHref } from "./next-step";

/** Adresse de l'écran Search Console d'un site (la carte est sur la page du site). */
/** Lance directement l'autorisation Google de la Search Console pour ce site (pas de page intermédiaire). */
export const searchConsoleHref = (siteId: string) =>
  `/api/google/start?site=${siteId}&purpose=search_console`;

/**
 * « Vos premiers liens » : le fil des premières actions, visible dès l'arrivée (accueil et écrans
 * d'onboarding). Ordre voulu (décision du 19/11) : la Search Console, facultative, avant la première
 * campagne ; puis campagne, validation des cibles, boîte d'envoi, premiers emails.
 */
export type FirstLinkKey = "searchConsole" | "campaign" | "validate" | "mailbox" | "send";

export interface FirstLinkStep {
  key: FirstLinkKey;
  done: boolean;
  /** Étape facultative : elle ne devient jamais « la prochaine » mise en avant. */
  optional: boolean;
  href: string;
}

export interface FirstLinksInput {
  /** Premier site de la personne (ou null sans aucun site). */
  firstSiteId: string | null;
  /** Vrai quand la Search Console est ouverte pour ce déploiement (sinon l'étape est masquée). */
  searchConsoleShown: boolean;
  searchConsoleConnected: boolean;
  /** La campagne du premier site a une analyse terminée (cibles prêtes). */
  campaignDone: boolean;
  /** Où mène l'étape campagne (l'écran de son état courant). */
  campaignHref: string;
  /** Au moins une cible validée. */
  validated: boolean;
  /** Une boîte d'envoi est connectée. */
  mailbox: boolean;
  /** Au moins un premier message est parti. */
  sent: boolean;
}

/** Les étapes et leurs adresses, dans l'ordre d'affichage (pure, testée). */
export function firstLinkSteps(i: FirstLinksInput): FirstLinkStep[] {
  const site = i.firstSiteId;
  const steps: FirstLinkStep[] = [];
  if (i.searchConsoleShown) {
    steps.push({
      key: "searchConsole",
      done: i.searchConsoleConnected,
      optional: true,
      href: site ? searchConsoleHref(site) : START_HREF,
    });
  }
  steps.push({
    key: "campaign",
    done: i.campaignDone,
    optional: false,
    href: site ? i.campaignHref : START_HREF,
  });
  steps.push({
    key: "validate",
    done: i.validated,
    optional: false,
    href: site ? siteHref.cibles(site) : START_HREF,
  });
  steps.push({
    key: "mailbox",
    done: i.mailbox,
    optional: false,
    href: site ? `/app/reglages/boite?site=${site}` : START_HREF,
  });
  steps.push({ key: "send", done: i.sent, optional: false, href: "/app/a-valider" });
  return steps;
}

/** L'étape à mettre en avant : la première non cochée et non facultative. */
export function nextFirstLinkKey(steps: FirstLinkStep[]): FirstLinkKey | null {
  return steps.find((s) => !s.done && !s.optional)?.key ?? null;
}
