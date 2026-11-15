import type { PageRead } from "./page-reader";
import type { Verdict } from "./types";

/**
 * Jeu d'évaluation annoté (50 cibles synthétiques, FR/EN) pour le tri. Chaque cas décrit
 * l'instantané d'une page et le verdict attendu d'un humain. Le site à promouvoir est
 * `mega-coloring.com` (coloriages pour enfants). `byRules` = vrai quand le verdict doit être
 * tranché sans LLM (preuve HTTP ou motif textuel net) ; faux = jugement réservé au LLM, que
 * les règles ne doivent surtout PAS exclure à tort.
 */
export interface EvalCase {
  id: string;
  domain: string;
  expected: Verdict;
  byRules: boolean;
  page: Partial<PageRead>;
}

const P = (title: string, text: string, status = 200): Partial<PageRead> => ({
  status,
  title,
  text,
  description: "",
  headings: [title],
});

const OK_TEXT =
  "Notre sélection d'activités manuelles pour occuper les enfants à la maison : bricolages, coloriages à imprimer, jeux de société et idées de goûters. Mise à jour chaque mois par la rédaction.";

export const EVAL_CASES: EvalCase[] = [
  // --- ok (14) : sites vivants et sur le sujet ---
  ...[
    ["blog-maman-creative.fr", "Activités manuelles pour enfants", OK_TEXT],
    [
      "ecole-petite-section.fr",
      "Ressources pour la classe de maternelle",
      "Ressources et liens utiles pour les enseignants de maternelle : coloriages, comptines, fiches de graphisme. Page tenue par l'équipe pédagogique de l'école.",
    ],
    [
      "assistante-maternelle-lyon.fr",
      "Idées d'activités pour les petits",
      "Idées d'activités à faire avec les enfants accueillis : peinture, pâte à modeler, coloriages, promenades. Conseils d'une assistante maternelle agréée.",
    ],
    [
      "idees-vacances-enfants.com",
      "Que faire pendant les vacances ?",
      "Liste d'idées pour les vacances scolaires : sorties, ateliers créatifs, coloriages à imprimer, jeux d'extérieur.",
    ],
    [
      "ludotheque-les-petits-pas.fr",
      "Liens utiles",
      "Notre ludothèque associative vous recommande ces sites : jeux éducatifs, coloriages, lectures pour enfants. Adhésion annuelle pour les familles.",
    ],
    [
      "parents-au-quotidien.fr",
      "Occuper les enfants un jour de pluie",
      "Dix idées pour occuper les enfants quand il pleut : cabane, coloriage de mandalas simples, atelier cuisine, dessin libre.",
    ],
    [
      "bibliotheque-municipale-saintes.fr",
      "Sélection jeunesse",
      "La médiathèque propose une sélection de sites jeunesse recommandés par ses bibliothécaires : lecture, dessin, jeux.",
    ],
    [
      "papa-bricole.fr",
      "Bricolages de saison",
      "Bricolages d'automne : feuilles séchées, marrons, coloriages de citrouilles à imprimer. Tutoriels pas à pas.",
    ],
    [
      "creche-arc-en-ciel.fr",
      "Ressources pour les familles",
      "Documents et ressources pour les familles de la crèche : menus, calendrier, idées d'activités créatives à la maison.",
    ],
    [
      "dessin-enfants-blog.fr",
      "Apprendre à dessiner",
      "Tutoriels pour apprendre à dessiner aux enfants, étape par étape, avec des modèles à colorier.",
    ],
    [
      "centre-loisirs-bellevue.fr",
      "Activités du mercredi",
      "Le centre de loisirs propose des ateliers créatifs chaque mercredi : peinture, collage, coloriage. Inscriptions auprès de la mairie.",
    ],
    [
      "homeschool-france.org",
      "Ressources gratuites",
      "Ressources gratuites pour l'instruction en famille : fiches, coloriages, livres libres de droits, jeux éducatifs.",
    ],
    [
      "fetes-anniversaire-enfants.fr",
      "Animations d'anniversaire",
      "Idées d'animations d'anniversaire à la maison : chasse au trésor, ateliers de coloriage, maquillage, gâteaux faciles.",
    ],
    [
      "momes-et-merveilles.fr",
      "Notre sélection de la semaine",
      "Chaque semaine, nous testons des activités avec nos enfants. Cette semaine : un atelier coloriage géant sur papier kraft.",
    ],
    [
      "maternelle-en-fete.fr",
      "Ressources pour enseignants",
      "Fiches et idées de séances pour la classe : arts plastiques, coloriages codés, graphisme. Partagées par des enseignants de maternelle.",
    ],
    [
      "petits-artistes-club.fr",
      "Ateliers d'art pour enfants",
      "Club d'arts plastiques pour les 3-10 ans : peinture, collage, coloriage. Planning des ateliers et conseils aux parents.",
    ],
    [
      "voyage-en-famille-blog.fr",
      "Occuper les enfants en voiture",
      "Nos astuces pour les longs trajets en famille : jeux, livres audio, carnets de coloriage et feutres lavables.",
    ],
  ].map(([domain, title, text], i): EvalCase => ({
    id: `ok-${i + 1}`,
    domain,
    expected: "ok",
    byRules: false,
    page: P(title, text),
  })),
  // --- hors_sujet (6) et irrealiste (4) : jugement du LLM ---
  ...[
    [
      "garage-dupont-auto.fr",
      "Réparation automobile à Lille",
      "Garage indépendant : vidange, freins, pneus, contrôle technique. Devis gratuit, prise de rendez-vous en ligne.",
    ],
    [
      "cabinet-notaire-martin.fr",
      "Actes et successions",
      "L'étude vous accompagne dans vos actes de vente, donations et successions. Honoraires réglementés.",
    ],
    [
      "crypto-actus-24.com",
      "Bitcoin : analyse du jour",
      "Cours du bitcoin, analyses techniques et actualités des altcoins. Ne constitue pas un conseil en investissement.",
    ],
    [
      "plomberie-express-paris.fr",
      "Dépannage plomberie 24h/24",
      "Fuite, débouchage, chauffe-eau : intervention rapide à Paris et en petite couronne.",
    ],
    [
      "recettes-du-sud.fr",
      "Ratatouille et tian de légumes",
      "Nos recettes provençales préférées : ratatouille, tian, daube, pissaladière. Astuces de cuisson.",
    ],
    [
      "forum-moto-passion.fr",
      "Sujets du forum",
      "Discussions entre motards : entretien, balades, bons plans pneus. Dernier message il y a 2 heures.",
    ],
  ].map(([domain, title, text], i): EvalCase => ({
    id: `hors-sujet-${i + 1}`,
    domain,
    expected: "hors_sujet",
    byRules: false,
    page: P(title, text),
  })),
  ...[
    [
      "lemonde.fr",
      "À la une",
      "Actualité en continu : politique, international, économie, culture, sport. Abonnez-vous au Monde pour accéder à tous les articles.",
    ],
    [
      "education.gouv.fr",
      "Ministère de l'Éducation nationale",
      "Site institutionnel du ministère : circulaires, programmes, examens, annuaire des services.",
    ],
    [
      "france.tv",
      "Toutes les émissions",
      "Replay et direct des chaînes du service public. Programmes jeunesse, séries, documentaires.",
    ],
    [
      "wikipedia.org",
      "Wikipédia, l'encyclopédie libre",
      "Wikipédia est une encyclopédie universelle collaborative. Les contributions suivent des règles de neutralité.",
    ],
  ].map(([domain, title, text], i): EvalCase => ({
    id: `irrealiste-${i + 1}`,
    domain,
    expected: "irrealiste",
    byRules: false,
    page: P(title, text),
  })),
  // --- mort (6) ---
  ...[404, 410, 404].map((status, i): EvalCase => ({
    id: `mort-http-${i + 1}`,
    domain: `ancien-blog-${i + 1}.fr`,
    expected: "mort",
    byRules: true,
    page: { status, title: "", text: "" },
  })),
  {
    id: "mort-parque-1",
    domain: "coloriages-gratuits-fr.net",
    expected: "mort",
    byRules: true,
    page: P(
      "coloriages-gratuits-fr.net",
      "Ce domaine est à vendre. Faites une offre dès maintenant.",
    ),
  },
  {
    id: "mort-parque-2",
    domain: "mes-bricolages.com",
    expected: "mort",
    byRules: true,
    page: P(
      "Buy this domain",
      "mes-bricolages.com — buy this domain today. Domain parked free by the registrar.",
    ),
  },
  {
    id: "mort-suspendu",
    domain: "idees-creatives-enfants.fr",
    expected: "mort",
    byRules: true,
    page: P("Compte suspendu", "Compte suspendu. Contactez votre hébergeur."),
  },
  // --- payant (6) ---
  ...[
    [
      "blog-sponsorise-fr.com",
      "Publiez votre article",
      "Article sponsorisé sur notre blog : tarif 90 € HT par article, rédaction incluse. Devis sous 24 h.",
    ],
    [
      "netlinking-parents.fr",
      "Nos offres",
      "Achetez un lien sur un blog parentalité : prix par article à partir de 45 euros. Paiement en ligne.",
    ],
    [
      "write-and-earn.com",
      "Guest posts",
      "Write for us! Guest post pricing: $120 per article, dofollow link included. Sponsored post packages available.",
    ],
    [
      "bons-plans-famille.fr",
      "Partenariats",
      "Vous souhaitez un post sponsorisé ? Contenu sponsorisé publié sous 72 h, 60 € HT / article.",
    ],
    [
      "liens-de-qualite.net",
      "Vente de liens",
      "Vente de liens sur des sites thématiques : sélectionnez la thématique, nous publions votre article.",
    ],
    [
      "kids-blog-network.com",
      "Advertise",
      "Buy a backlink on our kids and family network. Link insertion service starts at $35.",
    ],
  ].map(([domain, title, text], i): EvalCase => ({
    id: `payant-${i + 1}`,
    domain,
    expected: "payant",
    byRules: true,
    page: P(title, text),
  })),
  // --- pirate (3) ---
  ...[
    "Meilleur prix viagra cialis sans ordonnance. Livraison discrète. Casino en ligne bonus 200 % pour les nouveaux joueurs.",
    "Replica watches rolex outlet. Payday loans fast approval. Cheap viagra online no prescription.",
    "Slot gacor hari ini, judi online terpercaya. Essay writing service cheap, order now.",
  ].map((text, i): EvalCase => ({
    id: `pirate-${i + 1}`,
    domain: `ancien-site-hacke-${i + 1}.fr`,
    expected: "pirate",
    byRules: true,
    page: P("Accueil", text),
  })),
  // --- compte_obligatoire (3) ---
  {
    id: "compte-1",
    domain: "forum-parents-inscrits.fr",
    expected: "compte_obligatoire",
    byRules: true,
    page: P(
      "Connexion",
      "Connectez-vous pour voir ce contenu. Pas encore membre ? Créer un compte.",
    ),
  },
  {
    id: "compte-2",
    domain: "communaute-bricolage.com",
    expected: "compte_obligatoire",
    byRules: true,
    page: P("Members only", "Log in to continue. Members only area."),
  },
  {
    id: "compte-3",
    domain: "espace-prive-assos.fr",
    expected: "compte_obligatoire",
    byRules: true,
    page: { status: 401, title: "", text: "" },
  },
  // --- concurrent_direct (2, via le contexte) ---
  {
    id: "concurrent-1",
    domain: "coloriage-licorne.fr",
    expected: "concurrent_direct",
    byRules: true,
    page: P("Coloriages de licornes", "Des centaines de coloriages à imprimer gratuitement."),
  },
  {
    id: "concurrent-2",
    domain: "www.hugolescargot.com",
    expected: "concurrent_direct",
    byRules: true,
    page: P("Hugo l'escargot", "Coloriages et jeux pour enfants."),
  },
  // --- non_verifiable (3) ---
  {
    id: "nv-1",
    domain: "serveur-en-panne.fr",
    expected: "non_verifiable",
    byRules: true,
    page: { status: 0, unreachable: true },
  },
  {
    id: "nv-2",
    domain: "erreur-serveur.fr",
    expected: "non_verifiable",
    byRules: true,
    page: { status: 503, text: "" },
  },
  {
    id: "nv-3",
    domain: "robots-bloque.fr",
    expected: "non_verifiable",
    byRules: true,
    page: { status: 0, blockedByRobots: true },
  },
];

/** Domaines concurrents de l'audit utilisés par les cas `concurrent-*`. */
export const EVAL_COMPETITORS = ["coloriage-licorne.fr", "hugolescargot.com"];
