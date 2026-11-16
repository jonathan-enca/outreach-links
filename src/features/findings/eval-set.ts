import { parseHtml, type PageRead } from "@/features/triage/page-reader";
import type { FindingContext } from "./types";

/**
 * Jeu d'évaluation annoté en français des constats par page (MT.5) : des pages HTML rédigées comme de
 * vraies pages (blog de parents, école, médiathèque, forum...) passées dans le VRAI analyseur
 * (`parseHtml`), pour le site de test mega-coloring.com. Trois familles de constats :
 * - mentions : le site est-il nommé sans être lié ? (règles) puis parle-t-on bien de lui ? (LLM) ;
 * - liens morts : seuls les 404/410 constatés comptent (500, délai ou robots.txt ne prouvent rien) ;
 * - liens inadaptés : quels liens du contenu méritent d'être jugés (règles), puis lequel est
 *   réellement inadapté ET remplaçable par une page du site (LLM).
 * Règle de travail : mesurer précision et rappel sur ce jeu AVANT et APRÈS tout changement de règle
 * ou de prompt (`pnpm test` pour les règles, `pnpm demo:findings-eval` pour le LLM).
 */
export interface FindingEvalCase {
  id: string;
  /** Contenu du `<body>` de la page. */
  body: string;
  title?: string;
  /** Statut HTTP de chaque lien sortant ; absent = 200 ; null = non vérifiable (robots, délai). */
  statuses?: Record<string, number | null>;
  expect: {
    /** Règles : la page nomme le site sans le lier, un passage est à juger. */
    mention: boolean;
    /** Règles : la page contient déjà un lien vers le site. */
    alreadyLinked: boolean;
    /** Règles : liens morts constatés (URL). */
    dead: string[];
    /** Règles : URL qui doivent être candidates à « inadapté ». */
    candidates: string[];
    /** Règles : URL présentes dans la page qui ne doivent PAS être candidates. */
    notCandidates: string[];
  };
  /** Langue déclarée par la page de destination de certains liens (absent = non déclarée). */
  destLangs?: Record<string, string>;
  /** Jugement attendu du LLM (cas jugés seulement). */
  llm?: {
    mentionAboutSite: boolean | null;
    /** URL du lien inadapté et remplaçable, null si aucun. */
    unsuitedUrl: string | null;
  };
}

export const FINDING_EVAL_CONTEXT: FindingContext = {
  ownDomain: "mega-coloring.com",
  brandName: "Mega Coloring",
  nameVariants: ["Mega Coloring", "megacoloring"],
  language: "fr",
  theme: "coloriages à imprimer",
  activity: "Site de coloriages gratuits à imprimer pour enfants, classés par thème et par âge.",
  competitorDomains: ["coloriez.com", "hugolescargot.com"],
  resources: [
    { url: "https://www.mega-coloring.com/fr/", title: "Accueil de Mega Coloring" },
    { url: "https://www.mega-coloring.com/fr/enseignants/", title: "Coloriages pour la classe" },
    { url: "https://www.mega-coloring.com/fr/animaux/", title: "Coloriages d'animaux à imprimer" },
  ],
};

const US = "https://www.colorpages-usa.com/free-printables";
const OLD = "https://www.mega-coloring.com/coloriages-ancienne-page";
const FR_BLOG = "https://www.maman-organisee.fr/idees-pluie";
const NAV = "https://www.agence-web-partenaire.fr/";

const none = { mention: false, alreadyLinked: false, dead: [], candidates: [], notCandidates: [] };

export const FINDING_EVAL_CASES: FindingEvalCase[] = [
  // ---------- Mentions de marque (12) ----------
  {
    id: "m01",
    title: "Idées pour un mercredi de pluie",
    body: `<article><h1>Idées pour un mercredi de pluie</h1><p>Quand il pleut, nous sortons les feutres. Pour les coloriages, j'utilise souvent Mega Coloring, un site gratuit où l'on imprime ce qu'on veut en deux clics.</p></article>`,
    expect: { ...none, mention: true },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },
  {
    id: "m02",
    body: `<article><p>Nos coloriages préférés viennent de <a href="https://www.mega-coloring.com/fr/">Mega Coloring</a>, très pratique pour la classe.</p></article>`,
    expect: { ...none, alreadyLinked: true },
  },
  {
    id: "m03",
    body: `<article><p>On cite souvent Mega Coloring pour les imprimables.</p></article><footer><a href="https://www.mega-coloring.com/">Coloriages gratuits</a></footer>`,
    expect: { ...none, alreadyLinked: true },
  },
  {
    id: "m04",
    body: `<article><p>Sur Mega Coloring on trouve des licornes et des dinosaures, voir <a href="https://fr.mega-coloring.com/animaux/">cette page</a>.</p></article>`,
    expect: { ...none, alreadyLinked: true },
  },
  {
    id: "m05",
    body: `<article><p>Adresses utiles pour les parents : mega-coloring.com pour les coloriages, ludotheque-du-quartier.fr pour les jeux.</p></article>`,
    expect: { ...none, mention: true },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },
  {
    id: "m06",
    body: `<article><p>Merci à megacoloring pour les dessins que les enfants ont coloriés pendant le goûter.</p></article>`,
    expect: { ...none, mention: true },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },
  {
    id: "m07",
    title: "Livres d'activités en anglais",
    body: `<article><p>Parmi les cahiers d'activités importés, la série Mega Coloring Books propose des pages à colorier en anglais pour les adultes.</p></article>`,
    expect: { ...none, mention: true },
    llm: { mentionAboutSite: false, unsuitedUrl: null },
  },
  {
    id: "m08",
    body: `<article><p>Retrouvez la fiche de <a href="https://www.annuaire-loisirs-enfants.fr/fiche/123">Mega Coloring</a> dans notre rubrique coloriages.</p></article>`,
    expect: {
      ...none,
      mention: true,
      notCandidates: ["https://www.annuaire-loisirs-enfants.fr/fiche/123"],
    },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },
  {
    id: "m09",
    body: `<article><p>Nos conseils pour organiser un goûter d'anniversaire sans stress.</p></article>`,
    expect: none,
  },
  {
    id: "m10",
    body: `<article><p>Pour imprimer des coloriages, essayez <a href="https://www.mega-coloring.com/" rel="nofollow">Mega Coloring</a>.</p></article>`,
    expect: { ...none, alreadyLinked: true },
  },
  {
    id: "m11",
    body: `<article><p>Mega Coloring, Mega Coloring : le site revient dans tous les messages des parents de la classe.</p></article>`,
    expect: { ...none, mention: true },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },
  {
    id: "m12",
    body: `<article><p>Les élèves ont adoré les modèles de Mega-Coloring, surtout les dessins d'animaux de la ferme.</p></article>`,
    expect: { ...none, mention: true },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },

  // ---------- Liens morts (9) ----------
  {
    id: "d01",
    body: `<article><p>Une bonne ressource : <a href="https://www.ancien-coloriages.fr/page">les coloriages de Lucie</a>.</p></article>`,
    statuses: { "https://www.ancien-coloriages.fr/page": 404 },
    expect: { ...none, dead: ["https://www.ancien-coloriages.fr/page"] },
  },
  {
    id: "d02",
    body: `<article><p>Voir aussi <a href="https://www.jeux-enfants-gratuits.fr/dino">les dinosaures à colorier</a>.</p></article>`,
    statuses: { "https://www.jeux-enfants-gratuits.fr/dino": 410 },
    expect: { ...none, dead: ["https://www.jeux-enfants-gratuits.fr/dino"] },
  },
  {
    id: "d03",
    body: `<article><p>Notre partenaire : <a href="https://www.atelier-creatif.fr/accueil">l'atelier créatif</a>.</p></article>`,
    statuses: { "https://www.atelier-creatif.fr/accueil": 500 },
    expect: none,
  },
  {
    id: "d04",
    body: `<article><p>Lien utile : <a href="https://www.site-lent.fr/ressources">ressources pour la classe</a>.</p></article>`,
    statuses: { "https://www.site-lent.fr/ressources": null },
    expect: none,
  },
  {
    id: "d05",
    body: `<article><p>Notre sélection : <a href="https://www.ecole-en-ligne.fr/fiches">fiches d'activités</a>.</p></article>`,
    expect: none,
  },
  {
    id: "d06",
    body: `<article><p>Pour les petits, voir <a href="${OLD}">les coloriages d'animaux</a> de Mega Coloring.</p></article>`,
    statuses: { [OLD]: 404 },
    expect: { ...none, mention: false, alreadyLinked: true, dead: [OLD] },
  },
  {
    id: "d07",
    body: `<article><p>Bienvenue sur le blog de la classe.</p></article><footer><a href="https://www.vieux-partenaire.fr/">Partenaire</a></footer>`,
    statuses: { "https://www.vieux-partenaire.fr/": 404 },
    expect: { ...none, dead: ["https://www.vieux-partenaire.fr/"] },
  },
  {
    id: "d08",
    body: `<article><p>Deux liens : <a href="https://www.bricolage-malin.fr/a">bricolage</a> et <a href="https://www.bricolage-malin.fr/b">pâte à sel</a>.</p></article>`,
    statuses: { "https://www.bricolage-malin.fr/a": 404, "https://www.bricolage-malin.fr/b": 200 },
    expect: { ...none, dead: ["https://www.bricolage-malin.fr/a"] },
  },
  {
    id: "d09",
    body: `<article><p>Écrivez-nous : <a href="mailto:contact@ecole-du-bourg.fr">contact@ecole-du-bourg.fr</a>.</p></article>`,
    expect: none,
  },

  // ---------- Liens inadaptés : candidats (règles) et jugement (LLM) (13) ----------
  {
    id: "u01",
    destLangs: { [US]: "en" },
    title: "Activités pour un mercredi de pluie",
    body: `<article><h1>Activités pour un mercredi de pluie</h1><p>Pour occuper les enfants, imprimez des feuilles à colorier, par exemple sur <a href="${US}">free printable coloring pages</a> (site américain, en anglais).</p></article>`,
    expect: { ...none, candidates: [US] },
    llm: { mentionAboutSite: null, unsuitedUrl: US },
  },
  {
    id: "u02",
    body: `<article><p>Les loups, expliqués aux enfants : <a href="https://fr.wikipedia.org/wiki/Loup">article Wikipédia</a>.</p></article>`,
    expect: { ...none, notCandidates: ["https://fr.wikipedia.org/wiki/Loup"] },
  },
  {
    id: "u03",
    body: `<article><p>Le programme officiel : <a href="https://www.education.gouv.fr/cycle-1">cycle 1 sur education.gouv.fr</a>.</p></article>`,
    expect: { ...none, notCandidates: ["https://www.education.gouv.fr/cycle-1"] },
  },
  {
    id: "u04",
    body: `<nav><a href="${NAV}">Site créé par notre agence</a></nav><article><p>Un article sur le jardinage.</p></article>`,
    expect: { ...none, notCandidates: [NAV] },
  },
  {
    id: "u05",
    body: `<article><p>Notre outil préféré : <a href="https://www.boutique-pinceaux.fr/promo" rel="sponsored nofollow">pinceaux à prix cassés</a>.</p></article>`,
    expect: { ...none, notCandidates: ["https://www.boutique-pinceaux.fr/promo"] },
  },
  {
    id: "u06",
    body: `<article><p>Bannière : <a href="https://www.annonceur-image.fr/"><img src="/b.png" alt="pub"></a></p></article>`,
    expect: { ...none, notCandidates: ["https://www.annonceur-image.fr/"] },
  },
  {
    id: "u07",
    body: `<article><p>Autre site de coloriages : <a href="https://www.coloriez.com/animaux">coloriez.com</a>.</p></article>`,
    expect: { ...none, notCandidates: ["https://www.coloriez.com/animaux"] },
  },
  {
    id: "u08",
    destLangs: { "https://www.printables-uk.co.uk/animals": "en" },
    title: "Ressources pour la classe",
    body: `<article><h1>Ressources pour la classe</h1><p>Nous utilisons <a href="https://www.printables-uk.co.uk/animals">animal colouring sheets</a> pour les ateliers de lecture.</p></article>`,
    expect: { ...none, candidates: ["https://www.printables-uk.co.uk/animals"] },
    llm: { mentionAboutSite: null, unsuitedUrl: "https://www.printables-uk.co.uk/animals" },
  },
  {
    id: "u09",
    destLangs: { [FR_BLOG]: "fr" },
    title: "Idées pour les jours de pluie",
    body: `<article><p>Pour d'autres idées, lisez <a href="${FR_BLOG}">les idées de Maman Organisée</a>.</p></article>`,
    expect: { ...none, candidates: [FR_BLOG] },
    llm: { mentionAboutSite: null, unsuitedUrl: null },
  },
  {
    id: "u10",
    body: `<article><p>Suivez-nous sur <a href="https://www.facebook.com/ecole-du-bourg">Facebook</a>.</p></article>`,
    expect: { ...none, notCandidates: ["https://www.facebook.com/ecole-du-bourg"] },
  },
  {
    id: "u11",
    destLangs: { "https://www.easter-kids-printables.com/bunny": "en" },
    title: "Coloriages de Pâques",
    body: `<article><h1>Coloriages de Pâques</h1><p>Pour les lapins et les œufs à colorier, rendez-vous <a href="https://www.easter-kids-printables.com/bunny">ici</a>.</p></article>`,
    expect: { ...none, candidates: ["https://www.easter-kids-printables.com/bunny"] },
    llm: { mentionAboutSite: null, unsuitedUrl: "https://www.easter-kids-printables.com/bunny" },
  },
  {
    id: "u12",
    destLangs: { "https://www.us-baking-blog.com/eggless-cake": "en" },
    title: "Gâteau d'anniversaire sans œufs",
    body: `<article><h1>Gâteau d'anniversaire sans œufs</h1><p>La recette vient de <a href="https://www.us-baking-blog.com/eggless-cake">ce blog de pâtisserie américain</a>, très bien expliquée.</p></article>`,
    expect: { ...none, candidates: ["https://www.us-baking-blog.com/eggless-cake"] },
    llm: { mentionAboutSite: null, unsuitedUrl: null },
  },
  {
    id: "u13",
    destLangs: { "https://www.sante-enfance.fr/etude-ecrans": "fr" },
    title: "Mon avis sur les écrans",
    body: `<article><h1>Mon avis sur les écrans</h1><p>Selon <a href="https://www.sante-enfance.fr/etude-ecrans">une étude d'un institut de santé</a>, deux heures par jour suffisent. Sinon, imprimez des coloriages (Mega Coloring en propose beaucoup).</p></article>`,
    expect: { ...none, mention: true, candidates: ["https://www.sante-enfance.fr/etude-ecrans"] },
    llm: { mentionAboutSite: true, unsuitedUrl: null },
  },
  {
    id: "u14",
    title: "Coloriage de printemps",
    body: `<article><h1>Coloriage de printemps</h1><p>Téléchargez le modèle : <a href="https://ed1.exemple-cible.fr/pdf/coloriage-1.pdf">coloriage 1 (PDF)</a>.</p></article>`,
    expect: { ...none, notCandidates: ["https://ed1.exemple-cible.fr/pdf/coloriage-1.pdf"] },
  },
  {
    id: "u15",
    destLangs: { "https://www.coloriages-des-petits.fr/": "fr" },
    title: "Blogs de coloriages que j'aime",
    body: `<article><h1>Blogs de coloriages que j'aime</h1><p>Pour d'autres dessins à colorier, il y a aussi <a href="https://www.coloriages-des-petits.fr/">un site français de coloriages</a> très complet pour les enfants.</p></article>`,
    expect: { ...none, candidates: ["https://www.coloriages-des-petits.fr/"] },
    llm: { mentionAboutSite: null, unsuitedUrl: null },
  },
];

export function evalRead(c: FindingEvalCase): PageRead {
  const url = `https://exemple-cible.fr/${c.id}`;
  const html = `<html lang="fr"><head><title>${c.title ?? "Page"}</title></head><body>${c.body}</body></html>`;
  return { ...parseHtml(html, url), status: 200, viaFallback: false };
}
