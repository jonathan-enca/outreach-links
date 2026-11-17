import type { PageRead } from "@/features/triage/page-reader";
import type { ExclusionReason, QualCandidate, QualContext, SiteType } from "./types";

/**
 * Jeu d'évaluation annoté en français (MT.4), 50 cas pour le site de test mega-coloring.com
 * (coloriages à imprimer pour enfants). Chaque cas décrit un candidat de la collecte, la page lue et
 * ce qu'un humain en ferait. Deux familles :
 * - `byRules: true` : la décision doit tomber dans les étages gratuits 1 à 3 (preuve nette), avec ce
 *   motif précis ;
 * - `byRules: false` : les règles ne doivent PAS l'exclure ; c'est au LLM de juger (type de site,
 *   adéquation, vendeur de liens). `keep` dit si la cible doit finir dans la liste.
 * Règle de travail : mesurer précision et rappel sur ce jeu AVANT et APRÈS tout changement de règle
 * ou de prompt (`pnpm test` pour les règles, `pnpm demo:qualify-eval` pour le LLM).
 */
export interface QualEvalCase {
  id: string;
  candidate: Partial<QualCandidate> & { domain: string };
  /** Page lue (fusionnée avec une page vivante par défaut) ; null = jamais lue (exclue avant). */
  page: Partial<PageRead> | null;
  /** Page d'accueil si la page trouvée est morte. */
  home?: Partial<PageRead>;
  byRules: boolean;
  keep: boolean;
  reason?: ExclusionReason;
  siteType?: SiteType;
  sellsLinks?: boolean;
}

export const EVAL_CONTEXT: QualContext = {
  ownDomain: "mega-coloring.com",
  competitorDomains: ["coloriez.com", "hugolescargot.com", "tete-a-modeler.com", "momes.net"],
  language: "fr",
  theme: "coloriages à imprimer",
  brandName: "Mega Coloring",
  activity: "Site de coloriages gratuits à imprimer pour enfants, classés par thème et par âge.",
  audience: [
    "parents",
    "enseignants de maternelle et primaire",
    "animateurs",
    "assistantes maternelles",
  ],
  resources: [
    { url: "https://www.mega-coloring.com/fr/", title: "Accueil de Mega Coloring" },
    { url: "https://www.mega-coloring.com/fr/enseignants/", title: "Coloriages pour la classe" },
    { url: "https://www.mega-coloring.com/fr/animaux/", title: "Coloriages d'animaux" },
  ],
  contactedElsewhere: ["ecole-du-centre-ville.fr"],
  suppressedDomains: ["ne-pas-ecrire.fr"],
  suppressedEmails: [],
};

/** Page vivante avec un éditeur identifiable (lien contact + mentions légales). */
const P = (title: string, text: string, extra: Partial<PageRead> = {}): Partial<PageRead> => ({
  status: 200,
  title,
  description: "",
  headings: [title],
  text,
  lang: "fr",
  links: [
    { href: "https://exemple/contact", text: "Contact" },
    { href: "https://exemple/mentions-legales", text: "Mentions légales" },
  ],
  ...extra,
});

const NO_PUBLISHER = { links: [], mailtos: [], hasContactForm: false };

export const QUAL_EVAL_CASES: QualEvalCase[] = [
  // ---------- Étage 1 : exclusions gratuites (10) ----------
  {
    id: "e01",
    candidate: { domain: "fr.mega-coloring.com" },
    page: null,
    byRules: true,
    keep: false,
    reason: "propre_site",
  },
  {
    id: "e02",
    candidate: { domain: "coloriez.com" },
    page: null,
    byRules: true,
    keep: false,
    reason: "concurrent",
  },
  {
    id: "e03",
    candidate: { domain: "blog.hugolescargot.com" },
    page: null,
    byRules: true,
    keep: false,
    reason: "concurrent",
  },
  {
    id: "e04",
    candidate: { domain: "eklablog.com", competitorsCount: 3 },
    page: null,
    byRules: true,
    keep: false,
    reason: "plateforme",
  },
  {
    id: "e05",
    candidate: { domain: "pinterest.fr" },
    page: null,
    byRules: true,
    keep: false,
    reason: "plateforme",
  },
  {
    id: "e06",
    candidate: { domain: "lemonde.fr" },
    page: null,
    byRules: true,
    keep: false,
    reason: "geant",
  },
  {
    id: "e07",
    candidate: { domain: "192.168.1.20" },
    page: null,
    byRules: true,
    keep: false,
    reason: "faux_domaine",
  },
  {
    id: "e08",
    candidate: { domain: "ecole-du-centre-ville.fr" },
    page: null,
    byRules: true,
    keep: false,
    reason: "deja_contacte",
  },
  {
    id: "e09",
    candidate: { domain: "ne-pas-ecrire.fr" },
    page: null,
    byRules: true,
    keep: false,
    reason: "ne_pas_contacter",
  },
  {
    id: "e10",
    candidate: { domain: "fr.parents-malins.fr", domainRank: 5 },
    page: null,
    byRules: true,
    keep: false,
    reason: "doublon",
  },

  // ---------- Étage 2 : signaux fournisseur (2) ----------
  {
    id: "e11",
    candidate: { domain: "coloriage-gratuit-xxl.fr", spamScore: 72 },
    page: null,
    byRules: true,
    keep: false,
    reason: "spam",
  },
  {
    id: "e12",
    candidate: { domain: "grand-quotidien-national.fr", domainRank: 720 },
    page: null,
    byRules: true,
    keep: false,
    reason: "irrealiste",
  },

  // ---------- Étage 3 : lecture de la page (11) ----------
  {
    id: "e13",
    candidate: { domain: "blog-interdit.fr" },
    page: { blockedByRobots: true, status: 0 },
    byRules: true,
    keep: false,
    reason: "robots",
  },
  {
    id: "e14",
    candidate: { domain: "ancien-blog-maman.fr", url: "https://ancien-blog-maman.fr/coloriages" },
    page: { status: 404 },
    home: { status: 404 },
    byRules: true,
    keep: false,
    reason: "page_morte",
  },
  {
    id: "e15",
    candidate: { domain: "serveur-eteint.fr" },
    page: { status: 0, unreachable: true },
    byRules: true,
    keep: false,
    reason: "injoignable",
  },
  {
    id: "e16",
    candidate: { domain: "coloriages-noel.fr" },
    page: P("coloriages-noel.fr", "This domain is for sale. Buy this domain today."),
    byRules: true,
    keep: false,
    reason: "parque",
  },
  {
    id: "e17",
    candidate: { domain: "club-dessin-pirate.fr" },
    page: P(
      "Club de dessin",
      "Atelier dessin du mercredi. Cheap viagra no prescription. Online casino bonus.",
    ),
    byRules: true,
    keep: false,
    reason: "pirate",
  },
  {
    id: "e18",
    candidate: { domain: "blog-famille-tarifs.fr" },
    page: P(
      "Collaborer avec le blog",
      "Articles sponsorisés : 120 € HT par article, lien dofollow inclus. Familles et loisirs.",
    ),
    byRules: true,
    keep: false,
    reason: "vend_des_liens",
  },
  {
    id: "e19",
    candidate: { domain: "forum-prive-parents.fr" },
    page: P("Connexion", "Connectez-vous pour accéder au forum. Créer un compte."),
    byRules: true,
    keep: false,
    reason: "mur_connexion",
  },
  {
    id: "e20",
    candidate: { domain: "kids-printables-blog.com" },
    page: P("Free printable coloring pages", "Our favourite printable activities for toddlers.", {
      lang: "en",
    }),
    byRules: true,
    keep: false,
    reason: "langue",
  },
  {
    id: "e21",
    candidate: { domain: "page-anonyme-coloriage.fr" },
    page: P(
      "Coloriages",
      "Quelques coloriages trouvés sur internet pour les enfants.",
      NO_PUBLISHER,
    ),
    byRules: true,
    keep: false,
    reason: "editeur_introuvable",
  },
  {
    id: "e22",
    candidate: { domain: "coloriage-licorne-spam.fr", spamScore: 55 },
    page: null,
    byRules: true,
    keep: false,
    reason: "spam",
  },
  {
    id: "e23",
    candidate: { domain: "magazine-tres-connu.com", domainRank: 812 },
    page: null,
    byRules: true,
    keep: false,
    reason: "irrealiste",
  },

  // ---------- Passent les règles, à garder (17) ----------
  {
    id: "k01",
    candidate: { domain: "parents-malins.fr", domainRank: 40 },
    page: P(
      "10 activités calmes pour les enfants",
      "Coloriages, pâte à modeler, puzzles : nos idées testées à la maison pour occuper les enfants de 3 à 8 ans.",
    ),
    byRules: false,
    keep: true,
    siteType: "blog",
  },
  {
    id: "k02",
    candidate: { domain: "mediatheque-villeneuve.fr", pageType: "organization" },
    page: P(
      "Ressources en ligne pour les enfants",
      "La médiathèque municipale vous propose une sélection de sites pour les enfants : histoires, jeux, coloriages. Mairie de Villeneuve.",
    ),
    byRules: false,
    keep: true,
    siteType: "mairie",
  },
  {
    id: "k03",
    candidate: { domain: "centre-loisirs-les-pins.fr", pageType: "organization" },
    page: P(
      "Accueil de loisirs Les Pins",
      "Notre association accueille les enfants le mercredi et pendant les vacances : ateliers créatifs, dessin, coloriage, sorties.",
    ),
    byRules: false,
    keep: true,
    siteType: "association",
  },
  {
    id: "k04",
    candidate: { domain: "maitresse-julie.eklablog.com" },
    page: P(
      "La classe de Maîtresse Julie",
      "Blog de ma classe de moyenne section : fiches de graphisme, coloriages magiques, rituels du matin.",
    ),
    byRules: false,
    keep: true,
    siteType: "ecole",
  },
  {
    id: "k05",
    candidate: { domain: "ecole-jules-ferry.ac-lyon.fr" },
    page: P(
      "École maternelle Jules Ferry",
      "Liens utiles pour les familles : activités à faire à la maison, coloriages, comptines. L'équipe enseignante.",
    ),
    byRules: false,
    keep: true,
    siteType: "ecole",
  },
  {
    id: "k06",
    candidate: { domain: "coloriages-de-mamie.over-blog.com", domainRank: 0 },
    page: P(
      "Les coloriages de Mamie",
      "Je partage les coloriages que je fais avec mes petits-enfants le dimanche, et les sites que j'aime.",
    ),
    byRules: false,
    keep: true,
    siteType: "blog",
  },
  {
    id: "k07",
    candidate: { domain: "assmat-en-provence.fr" },
    page: P(
      "Activités avec les petits",
      "Assistante maternelle agréée, je partage mes idées d'activités : peinture, coloriage, motricité fine.",
    ),
    byRules: false,
    keep: true,
    siteType: "blog",
  },
  {
    id: "k08",
    candidate: { domain: "forum-mamans-solidaires.fr", pageType: "message-boards" },
    page: P(
      "Forum : occuper les enfants pendant les vacances",
      "Charte du forum : messages modérés. Sujet : quelles activités pour les jours de pluie ? Coloriages, jeux de société...",
    ),
    byRules: false,
    keep: true,
    siteType: "forum_modere",
  },
  {
    id: "k09",
    candidate: { domain: "ludotheque-pomme-de-pin.fr", competitorsCount: 2 },
    page: P(
      "Liens utiles",
      "La ludothèque associative recommande ces sites pour les familles : jeux, lectures, coloriages.",
    ),
    byRules: false,
    keep: true,
    siteType: "association",
  },
  {
    id: "k10",
    candidate: { domain: "boutique-loisirs-creatifs.fr", pageType: "ecommerce" },
    page: P(
      "Crayons et feutres pour enfants",
      "Notre boutique de loisirs créatifs : crayons de couleur, feutres, carnets de coloriage. Conseils pour bien choisir selon l'âge.",
    ),
    byRules: false,
    keep: true,
    siteType: "ecommerce",
  },
  {
    id: "k11",
    candidate: { domain: "photographe-famille-nantes.fr" },
    page: P(
      "Séance photo en famille",
      "Photographe de famille à Nantes. Pendant la séance, coin dessin et coloriages pour occuper les plus jeunes.",
    ),
    byRules: false,
    keep: true,
    siteType: "photographe",
  },
  {
    id: "k12",
    candidate: { domain: "scouts-groupe-saint-martin.fr" },
    page: P(
      "Ressources pour les louveteaux",
      "Idées de veillées et d'activités pour les louveteaux : jeux, chants, coloriages à imprimer pour les plus jeunes.",
    ),
    byRules: false,
    keep: true,
    siteType: "association",
  },
  {
    id: "k13",
    candidate: { domain: "mairie-saint-andre.fr", pageType: "organization" },
    page: P(
      "Petite enfance : liens utiles",
      "Le relais petite enfance de la commune propose des idées d'activités et des sites utiles aux parents.",
    ),
    byRules: false,
    keep: true,
    siteType: "mairie",
  },
  {
    id: "k14",
    candidate: { domain: "annuaire-sites-enfants.fr" },
    page: P(
      "Annuaire des sites pour enfants",
      "Rubriques : jeux éducatifs, coloriages, histoires. Proposez un site, gratuitement, il sera vérifié.",
    ),
    byRules: false,
    keep: true,
    siteType: "annuaire",
  },
  {
    id: "k15",
    candidate: { domain: "papa-bricoleur.fr", url: "https://papa-bricoleur.fr/vieux-billet" },
    page: { status: 404 },
    home: P(
      "Papa bricoleur",
      "Bricolages et activités à faire avec les enfants : cabanes, peinture, coloriages et jeux.",
    ),
    byRules: false,
    keep: true,
    siteType: "blog",
  },
  {
    id: "k16",
    candidate: { domain: "blog-instit-ce1.fr", tactics: ["mentions"] },
    page: P(
      "Mes sites préférés pour la classe",
      "Pour les fins de journée j'utilise Mega Coloring et d'autres sites de coloriages gratuits.",
    ),
    byRules: false,
    keep: true,
    siteType: "ecole",
  },
  {
    id: "k17",
    candidate: { domain: "creche-parentale-les-lutins.fr" },
    page: P(
      "Crèche parentale Les Lutins",
      "Notre crèche associative partage avec les familles des idées d'activités : comptines, coloriages, éveil musical.",
    ),
    byRules: false,
    keep: true,
    siteType: "association",
  },

  // ---------- Passent les règles, à écarter par le LLM (10) ----------
  {
    id: "x01",
    candidate: { domain: "garage-dupont-auto.fr" },
    page: P(
      "Entretien de votre véhicule",
      "Vidange, pneus, freins : prenez rendez-vous dans notre garage.",
    ),
    byRules: false,
    keep: false,
    reason: "hors_sujet",
    siteType: "ecommerce",
  },
  {
    id: "x02",
    candidate: { domain: "crypto-investir-facile.fr" },
    page: P(
      "Investir dans la crypto",
      "Nos conseils pour acheter du bitcoin et diversifier votre portefeuille.",
    ),
    byRules: false,
    keep: false,
    reason: "hors_sujet",
    siteType: "blog",
  },
  {
    id: "x03",
    candidate: { domain: "coloriages-a-gogo.fr" },
    page: P(
      "Coloriages gratuits à imprimer",
      "Des milliers de coloriages gratuits à imprimer pour enfants : animaux, princesses, Noël. Téléchargez et imprimez.",
    ),
    byRules: false,
    keep: false,
    reason: "concurrent",
    siteType: "autre",
  },
  {
    id: "x04",
    candidate: { domain: "blog-deco-partenariats.fr" },
    page: P(
      "Travailler avec nous",
      "Marques et agences : nous publions vos contenus. Demandez notre kit média et nos tarifs partenaires. Déco et famille.",
    ),
    byRules: false,
    keep: false,
    reason: "vend_des_liens",
    siteType: "blog",
    sellsLinks: true,
  },
  {
    id: "x05",
    candidate: { domain: "avocat-droit-fiscal.fr" },
    page: P("Cabinet d'avocats", "Conseil en droit fiscal des entreprises et contentieux."),
    byRules: false,
    keep: false,
    reason: "hors_sujet",
    siteType: "autre",
  },
  {
    id: "x06",
    candidate: { domain: "club-tennis-senior.fr" },
    page: P(
      "Club de tennis",
      "Section loisirs et compétition pour les adultes, tournois du samedi.",
    ),
    byRules: false,
    keep: false,
    reason: "hors_sujet",
    siteType: "association",
  },
  {
    id: "x07",
    candidate: { domain: "imprimables-enfants-premium.fr" },
    page: P(
      "Abonnement coloriages",
      "Accédez à 5 000 coloriages imprimables pour 4,99 € par mois, nouveaux dessins chaque semaine.",
    ),
    byRules: false,
    keep: false,
    reason: "concurrent",
    siteType: "ecommerce",
  },
  {
    id: "x08",
    candidate: { domain: "agence-seo-lyon.fr" },
    page: P("Agence de référencement", "Netlinking, audit SEO, rédaction web pour les PME."),
    byRules: false,
    keep: false,
    reason: "hors_sujet",
    siteType: "autre",
  },
  {
    id: "x09",
    candidate: { domain: "recettes-de-grand-chef.fr" },
    page: P("Recettes gastronomiques", "Foie gras, homard, accords mets et vins pour vos dîners."),
    byRules: false,
    keep: false,
    reason: "hors_sujet",
    siteType: "blog",
  },
  {
    id: "x10",
    candidate: { domain: "blog-famille-media-kit.fr" },
    page: P(
      "Collaborations",
      "Blog famille : publications rémunérées, publi-rédactionnel et liens partenaires, contactez-nous pour la grille tarifaire.",
    ),
    byRules: false,
    keep: false,
    reason: "vend_des_liens",
    siteType: "blog",
    sellsLinks: true,
  },
];

/** Candidat complet d'un cas (valeurs neutres par défaut). */
export function evalCandidate(c: QualEvalCase): QualCandidate {
  return {
    url: null,
    title: null,
    tactics: ["inconnus"],
    sources: [
      { source: "content", query: "coloriages", persona: null, rank: null, pageType: null },
    ],
    competitorsCount: 0,
    domainRank: null,
    spamScore: null,
    pageType: null,
    signalCount: 1,
    ...c.candidate,
  };
}

/** Page complète d'un cas (`null` = page jamais servie). */
export function evalPage(url: string, p: Partial<PageRead> | null | undefined): PageRead {
  return {
    url,
    status: 200,
    blockedByRobots: false,
    unreachable: false,
    title: "",
    description: "",
    headings: [],
    text: "",
    lang: "fr",
    links: [],
    mailtos: [],
    hasContactForm: false,
    viaFallback: false,
    outbound: [],
    ...(p ?? { status: 0, unreachable: true }),
  };
}

/**
 * Garde-fou de qualité (chantier E, 18/11/2026) : cibles que CLAUDE a jugées faibles ou suspectes sur
 * l'audit de référence du 17/11 (72 cibles). **Seul l'avis de Jonathan fait foi** : tant que `verdict`
 * vaut `null`, ces cas sont « à confirmer », ne comptent dans aucune métrique de `QUAL_EVAL_CASES` et
 * ne justifient aucun changement de règle. Quand Jonathan répond, copier son avis dans `verdict`
 * (`bon` / `mauvais`) et, si `mauvais`, ajouter le cas au jeu annoté ci-dessus.
 */
export interface QualityWatchCase {
  domain: string;
  /** Avis de Claude, jamais une vérité. */
  claude: "faible" | "limite" | "domaine_suspect";
  /** Avis de Jonathan ; null = à confirmer. */
  verdict: "bon" | "mauvais" | null;
  /** Ce qu'une lecture réelle (18/11/2026, robots.txt respecté) a montré, quand elle a eu lieu. */
  reading?: string;
}

export const QUALITY_TO_CONFIRM: QualityWatchCase[] = [
  ...[
    "creavea.com",
    "amedenfant.fr",
    "devenirparent.net",
    "hello-merlin.com",
    "paperblog.fr",
    "bambintroc.fr",
    "dessinpassion.com",
    "journaux.fr",
    "lepointdufle.net",
    "maniaclic.blog4ever.com",
  ].map((domain): QualityWatchCase => ({ domain, claude: "faible", verdict: null })),
  ...[
    "editions-retz.com",
    "flashmode.tn",
    "kidscare.lu",
    "wikicampers.fr",
    "papadejojo.fr",
    "bayard-jeunesse.com",
  ].map((domain): QualityWatchCase => ({ domain, claude: "limite", verdict: null })),
  {
    domain: "laruellebleue.com",
    claude: "domaine_suspect",
    verdict: null,
    reading:
      "Probable : thèmes sans rapport entre eux (moto, scooter, héritage, « Jeux d'Argent », lutin farceur) et pied de page avec 8 liens vers des sites sans rapport (.fun, .shop).",
  },
  {
    domain: "creativa-grenoble.com",
    claude: "domaine_suspect",
    verdict: null,
    reading:
      "Probable : un blog « création » dont les articles vont de bracelets, escape game et recettes à des cadeaux de Noël ; aucun signe de tarif.",
  },
  {
    domain: "famille-heureuse.fr",
    claude: "domaine_suspect",
    verdict: null,
    reading:
      "Confirmé : la page contact accueille les « articles sponsorisés » (la règle existante les détecte sur cet accueil, mais la cible avait été jugée sur une page intérieure).",
  },
  {
    domain: "nantes-artifice.fr",
    claude: "domaine_suspect",
    verdict: null,
    reading:
      "Non confirmé : blog maison / déco / immobilier cohérent, sans tarif ni mention sponsorisée ; seule la page jugée (dessins de Noël) est hors du thème du site.",
  },
  {
    domain: "trucetastuce.net",
    claude: "domaine_suspect",
    verdict: null,
    reading: "Non confirmé : site de conseils généralistes, aucun signe de vente de liens.",
  },
];
