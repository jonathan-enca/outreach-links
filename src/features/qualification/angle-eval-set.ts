import type { PageOutbound, PageRead } from "@/features/triage/page-reader";
import { EVAL_CONTEXT } from "./eval-set";
import type { ExclusionReason, QualCandidate, QualContext, Situation } from "./types";

/**
 * Jeu d'évaluation annoté du JUGEMENT DES TROIS CAS (MC.6b), en français, sur deux sites de thèmes
 * différents (règle de généralité : coloriages à imprimer, protection des données personnelles). Chaque
 * cas décrit une page trouvée parce qu'elle cite une ressource comparable (ou un lien mort), ce qu'elle
 * contient, et ce qu'un humain en ferait d'après ce qui a rapporté des liens à Jonathan (18/11/2026) :
 * lien mort remplaçable, petit éditeur du public qui cite des ressources, page de contenu qui cite
 * plusieurs ressources comparables. Les pages sont inventées, sur le modèle de celles lues pendant les
 * essais MC.0b et MC.6b (aucune personne réelle).
 *
 * Deux usages, à relancer AVANT et APRÈS tout changement de consigne :
 * - `pnpm test` : le jeu est cohérent et les règles gratuites ne tranchent pas à la place du modèle ;
 * - `pnpm demo:angle-eval` : précision et rappel réels de « cible » pour le jugement de la qualification
 *   et pour le tri du rédacteur (mêmes cas, page donnée en entier).
 */
export interface AngleEvalCase {
  id: string;
  site: "coloriages" | "donnees";
  candidate: Pick<QualCandidate, "domain" | "url" | "sources"> & { domainRank?: number };
  page: {
    title: string;
    headings?: string[];
    /** Texte de la page (le jugement de la qualification n'en voit que le début). */
    text: string;
    /** Liens du contenu vers d'autres sites : [texte du lien, adresse]. */
    cites: [string, string][];
  };
  /**
   * Gardée ? MC.6f (décision du 18/11) : oui pour une des trois situations (PRIORITÉ) et pour une page proche du
   * contenu visé (« autre », gardée avec une note) ; non seulement pour un des cinq refus (concurrent direct,
   * page légale, ferme à liens manifeste, grand site inatteignable, aucun rapport).
   */
  keep: boolean;
  /** Situations acceptées (la première est la plus juste). */
  situations: Situation[];
  /** Motifs d'exclusion acceptés pour un refus (le modèle peut dire « concurrent » ou « très gros site »). */
  reasons?: ExclusionReason[];
  note: string;
}

export const DATA_EVAL_CONTEXT: QualContext = {
  ownDomain: "mes-donnees-exemple.fr",
  competitorDomains: [],
  language: "fr",
  theme: "protection des données personnelles",
  brandName: "Mes Données",
  activity:
    "Service qui analyse gratuitement ce que les données personnelles d'une personne révèlent sur internet, chez les courtiers en données et dans les fuites connues.",
  audience: [
    "particuliers soucieux de leur vie privée en ligne",
    "victimes de démarchage ou d'usurpation d'identité",
    "citoyens qui veulent exercer leurs droits",
  ],
  resources: [
    { url: "https://www.mes-donnees-exemple.fr/", title: "Analyse gratuite de vos données" },
    {
      url: "https://www.mes-donnees-exemple.fr/guides/demarchage-telephonique",
      title: "Guide : faire cesser le démarchage téléphonique",
    },
    {
      url: "https://www.mes-donnees-exemple.fr/guides/fuite-de-donnees",
      title: "Guide : que faire après une fuite de données",
    },
  ],
  contactedElsewhere: [],
  suppressedDomains: [],
  suppressedEmails: [],
};

export const ANGLE_EVAL_CONTEXTS: Record<AngleEvalCase["site"], QualContext> = {
  coloriages: { ...EVAL_CONTEXT, competitorDomains: [], contactedElsewhere: [] },
  donnees: DATA_EVAL_CONTEXT,
};

const cite = (resource: string, url: string) => [
  { source: "citation" as const, query: url, persona: resource, rank: null, pageType: null },
];
const dead = (site: string, url: string) => [
  { source: "lien_mort" as const, query: url, persona: site, rank: null, pageType: null },
];

export const ANGLE_EVAL_CASES: AngleEvalCase[] = [
  // ---------- Coloriages : cibles ----------
  {
    id: "c01",
    site: "coloriages",
    candidate: {
      domain: "la-classe-de-maitresse-lea.fr",
      url: "https://la-classe-de-maitresse-lea.fr/2014/09/mes-sites-de-coloriages.html",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Mes sites de coloriages pour l'autonomie - La classe de maîtresse Léa",
      headings: ["Mes sites de coloriages pour l'autonomie"],
      text: "Publié le 12 septembre 2014. En CP, quand un élève a fini son travail, il peut prendre un coloriage dans le bac d'autonomie. Voici les sites où je trouve mes dessins à imprimer : Coloriages des petits pour les animaux, Dessins magiques pour les mandalas, et Le coin des loustics pour les fêtes. Je les imprime en A5 pour économiser le papier. Si vous en connaissez d'autres, laissez un commentaire !",
      cites: [
        ["Coloriages des petits", "https://coloriages-des-petits.fr/animaux"],
        ["Dessins magiques", "https://dessins-magiques.com/mandalas"],
        ["Le coin des loustics", "https://lecoindesloustics.fr/fetes"],
      ],
    },
    keep: true,
    situations: ["petit_editeur_ressources", "cite_des_comparables"],
    note: "Blog d'une enseignante de CP qui liste ses sites de coloriages. Billet de 2014 : pas un motif de refus.",
  },
  {
    id: "c02",
    site: "coloriages",
    candidate: {
      domain: "mairie-saint-aubin-exemple.fr",
      url: "https://www.mairie-saint-aubin-exemple.fr/enfance/accueil-periscolaire/coloriages",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Coloriages - Accueil périscolaire - Mairie de Saint-Aubin",
      headings: ["Coloriages à imprimer à la maison"],
      text: "L'équipe d'animation du périscolaire vous propose une sélection de sites pour occuper les enfants les jours de pluie. Tous sont gratuits : Coloriages des petits, Hugo et ses crayons, Tête à colorier. Bonne activité à tous ! L'équipe d'animation.",
      cites: [
        ["Coloriages des petits", "https://coloriages-des-petits.fr/"],
        ["Hugo et ses crayons", "https://hugo-et-ses-crayons.fr/coloriages"],
        ["Tête à colorier", "https://tete-a-colorier.com/"],
      ],
    },
    keep: true,
    situations: ["petit_editeur_ressources", "cite_des_comparables"],
    note: "Page « Coloriages » de l'accueil périscolaire d'une commune.",
  },
  {
    id: "c03",
    site: "coloriages",
    candidate: {
      domain: "parents-malins-exemple.fr",
      url: "https://parents-malins-exemple.fr/5-sites-gratuits-pour-telecharger-des-coloriages/",
      sources: cite("dessins-magiques.com", "https://dessins-magiques.com/"),
    },
    page: {
      title: "5 sites gratuits pour télécharger des coloriages",
      headings: ["5 sites gratuits pour télécharger des coloriages", "1. Dessins magiques"],
      text: "Les vacances approchent et vous cherchez de quoi occuper vos enfants sans écran ? Voici notre sélection de cinq sites où tout est gratuit et s'imprime en un clic. 1. Dessins magiques : des centaines de mandalas. 2. Coloriages des petits : classés par âge. 3. Le coin des loustics. 4. Crayons et compagnie. 5. Mon premier coloriage.",
      cites: [
        ["Dessins magiques", "https://dessins-magiques.com/"],
        ["Coloriages des petits", "https://coloriages-des-petits.fr/"],
        ["Le coin des loustics", "https://lecoindesloustics.fr/"],
        ["Crayons et compagnie", "https://crayons-et-compagnie.fr/"],
        ["Mon premier coloriage", "https://monpremiercoloriage.fr/"],
      ],
    },
    keep: true,
    situations: ["cite_des_comparables"],
    note: "Sélection « 5 sites gratuits » : le cas C par excellence.",
  },
  {
    id: "c04",
    site: "coloriages",
    candidate: {
      domain: "atelier-serenite-exemple.fr",
      url: "https://atelier-serenite-exemple.fr/blog/mandalas-a-colorier-ou-en-trouver",
      sources: cite("dessins-magiques.com", "https://dessins-magiques.com/mandalas"),
    },
    page: {
      title: "Mandalas à colorier : où en trouver ? - Atelier Sérénité, art-thérapie",
      headings: ["Mandalas à colorier : où en trouver ?"],
      text: "Art-thérapeute à Nantes, je propose souvent le coloriage de mandalas en fin de séance. Mes patients me demandent où en trouver pour continuer chez eux. Voici ma liste : Dessins magiques (gratuit, à imprimer), Mandalas du monde, et pour les enfants Coloriages des petits.",
      cites: [
        ["Dessins magiques", "https://dessins-magiques.com/mandalas"],
        ["Mandalas du monde", "https://mandalas-du-monde.org/"],
        ["Coloriages des petits", "https://coloriages-des-petits.fr/mandalas"],
      ],
    },
    keep: true,
    situations: ["petit_editeur_ressources", "cite_des_comparables"],
    note: "Blog d'une art-thérapeute (public « adultes, coloriage anti-stress ») avec sa liste de mandalas.",
  },
  {
    id: "c05",
    site: "coloriages",
    candidate: {
      domain: "assistantes-maternelles-du-lac.fr",
      url: "https://assistantes-maternelles-du-lac.fr/liens-utiles",
      sources: dead("vieux-coloriages.fr", "https://vieux-coloriages.fr/noel"),
    },
    page: {
      title: "Liens utiles - Association des assistantes maternelles du Lac",
      headings: ["Liens utiles", "Activités manuelles"],
      text: "Nos adhérentes partagent ici leurs bonnes adresses. Activités manuelles : coloriages de Noël à imprimer, comptines illustrées, pâte à sel. Administratif : Pajemploi, la CAF.",
      cites: [
        ["coloriages de Noël à imprimer", "https://vieux-coloriages.fr/noel"],
        ["comptines illustrées", "https://comptines-illustrees.fr/"],
        ["Pajemploi", "https://www.pajemploi.urssaf.fr/"],
      ],
    },
    keep: true,
    situations: ["lien_mort", "petit_editeur_ressources"],
    note: "Le lien « coloriages de Noël » est mort : le site a une page qui le remplace.",
  },
  {
    id: "c06",
    site: "coloriages",
    candidate: {
      domain: "forum-des-nounous-exemple.fr",
      url: "https://forum-des-nounous-exemple.fr/sujet/sites-gratuits-pour-les-enfants-4521",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Sites gratuits pour les enfants - Forum des nounous",
      headings: ["Sites gratuits pour les enfants"],
      text: "Lilou44 : Bonjour, je cherche des sites gratuits pour imprimer des activités. Vous utilisez quoi ? — Nanou : pour les coloriages je vais sur Coloriages des petits, c'est classé par thème. — Maya : moi Crayons et compagnie, et Tête à colorier pour les grands. Règles du forum : pas de publicité.",
      cites: [
        ["Coloriages des petits", "https://coloriages-des-petits.fr/"],
        ["Crayons et compagnie", "https://crayons-et-compagnie.fr/"],
        ["Tête à colorier", "https://tete-a-colorier.com/"],
      ],
    },
    keep: true,
    situations: ["cite_des_comparables", "petit_editeur_ressources"],
    note: "Sujet de forum modéré où les membres s'échangent leurs sites de coloriages.",
  },
  // ---------- Coloriages : refus ----------
  {
    id: "c07",
    site: "coloriages",
    candidate: {
      domain: "actu-tendance-web-exemple.com",
      url: "https://actu-tendance-web-exemple.com/pourquoi-le-coloriage-seduit-les-adultes/",
      sources: cite("dessins-magiques.com", "https://dessins-magiques.com/"),
    },
    page: {
      title: "Pourquoi le coloriage séduit les adultes - Actu Tendance Web",
      headings: ["Pourquoi le coloriage séduit les adultes", "Articles récents"],
      text: "Par la rédaction. Le coloriage est une activité prisée. Pour trouver des modèles, rendez-vous sur ce site de coloriages. Pensez aussi à comparer votre assurance auto en ligne et à choisir un bon serrurier à Lyon. Articles récents : Comment choisir sa mutuelle santé ; Les meilleurs casinos en ligne ; Rénover sa toiture ; Crédit immobilier : nos conseils.",
      cites: [
        ["ce site de coloriages", "https://dessins-magiques.com/"],
        ["assurance auto en ligne", "https://comparateur-assurance-exemple.com/"],
        ["serrurier à Lyon", "https://serrurier-lyon-exemple.fr/"],
        ["casinos en ligne", "https://casino-exemple.net/"],
      ],
    },
    keep: false,
    situations: ["ferme_a_liens"],
    reasons: ["ferme_a_liens", "vend_des_liens"],
    note: "Sujets sans rapport, auteur anonyme, liens commerciaux dans le texte : ferme à liens.",
  },
  {
    id: "c08",
    site: "coloriages",
    candidate: {
      domain: "boutique-crayons-exemple.fr",
      url: "https://boutique-crayons-exemple.fr/produit/coffret-48-crayons-de-couleur",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Coffret 48 crayons de couleur - 24,90 €",
      headings: ["Coffret 48 crayons de couleur", "Ajouter au panier"],
      text: "Coffret de 48 crayons de couleur, mine tendre, bois certifié. 24,90 € TTC. Livraison offerte dès 39 €. Ajouter au panier. Idée : imprimez des modèles gratuits sur Coloriages des petits pour les essayer. Avis clients (132). Produits associés : taille-crayon, gomme.",
      cites: [["Coloriages des petits", "https://coloriages-des-petits.fr/"]],
    },
    keep: true,
    situations: ["autre"],
    note: "MC.6f : fiche de produit d'une boutique du même public, qui renvoie déjà vers la ressource : gardée par proximité, avec une note « page commerciale » (avant MC.6f : refusée).",
  },
  {
    id: "c09",
    site: "coloriages",
    candidate: {
      domain: "blog-famille-nombreuse-exemple.fr",
      url: "https://blog-famille-nombreuse-exemple.fr/category/activites/",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Activités - Archives - Blog d'une famille nombreuse",
      headings: ["Catégorie : Activités", "Page 2 sur 14"],
      text: "Catégorie : Activités. Un gâteau au yaourt avec les enfants - Lire la suite. Nos coloriages de la semaine (dessins : Coloriages des petits) - Lire la suite. Sortie au zoo - Lire la suite. Bricolage de Pâques - Lire la suite. Articles plus anciens. Page 2 sur 14.",
      cites: [["Coloriages des petits", "https://coloriages-des-petits.fr/"]],
    },
    keep: true,
    situations: ["autre", "petit_editeur_ressources"],
    note: "MC.6f : page de rubrique d'un blog du public visé qui cite déjà la ressource : gardée par proximité, avec une note « rubrique » (avant MC.6f : refusée).",
  },
  {
    id: "c10",
    site: "coloriages",
    candidate: {
      domain: "coloriages-en-folie-exemple.com",
      url: "https://coloriages-en-folie-exemple.com/coloriages-animaux/",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Coloriages d'animaux à imprimer gratuitement - Coloriages en folie",
      headings: ["Coloriages d'animaux à imprimer", "Chats", "Chiens", "Chevaux"],
      text: "Plus de 3 000 coloriages gratuits à imprimer, classés par thème. Animaux : chats, chiens, chevaux, dinosaures. Cliquez sur un dessin pour l'imprimer en A4. Nos partenaires : Coloriages des petits.",
      cites: [["Coloriages des petits", "https://coloriages-des-petits.fr/"]],
    },
    keep: false,
    situations: ["aucune", "autre", "cite_des_comparables"],
    reasons: ["concurrent"],
    note: "Concurrent direct : il propose la même chose que le site.",
  },
  {
    id: "c11",
    site: "coloriages",
    candidate: {
      domain: "jardin-de-mamie-exemple.fr",
      url: "https://jardin-de-mamie-exemple.fr/2019/05/mes-rosiers-anciens.html",
      sources: cite("dessins-magiques.com", "https://dessins-magiques.com/fleurs"),
    },
    page: {
      title: "Mes rosiers anciens - Le jardin de mamie",
      headings: ["Mes rosiers anciens"],
      text: "Cette année mes rosiers anciens sont magnifiques. Je vous montre la taille de printemps, le paillage et l'arrosage. Pour l'anecdote, ma petite-fille a colorié une rose trouvée sur internet. La semaine prochaine : les pivoines.",
      cites: [["une rose trouvée sur internet", "https://dessins-magiques.com/fleurs/rose"]],
    },
    keep: false,
    situations: ["aucune"],
    reasons: ["hors_sujet"],
    note: "Cite la ressource en passant, dans un billet de jardinage : ni liste de ressources ni même public.",
  },
  {
    id: "c12",
    site: "coloriages",
    candidate: {
      domain: "ecole-des-lilas-exemple.fr",
      url: "https://ecole-des-lilas-exemple.fr/informations/utilisation-du-site",
      sources: cite("coloriages-des-petits.fr", "https://coloriages-des-petits.fr/"),
    },
    page: {
      title: "Conditions générales d'utilisation du site - École des Lilas",
      headings: ["Conditions générales d'utilisation", "Données personnelles"],
      text: "Conditions générales d'utilisation du site de l'école des Lilas. L'accès au site implique l'acceptation des présentes conditions. Les contenus sont la propriété de l'école. Ressources conseillées aux familles : Coloriages des petits. Données personnelles : vous disposez d'un droit d'accès et de rectification.",
      cites: [["Coloriages des petits", "https://coloriages-des-petits.fr/"]],
    },
    keep: false,
    situations: ["juridique"],
    reasons: ["page_legale"],
    note: "Document juridique d'un site d'école, même s'il cite la ressource : on ne le fait pas modifier par un inconnu (refus conservé en MC.6f).",
  },
  // ---------- Données personnelles : cibles ----------
  {
    id: "d01",
    site: "donnees",
    candidate: {
      domain: "mediation-conso-ouest-exemple.fr",
      url: "https://mediation-conso-ouest-exemple.fr/ou-signaler-une-arnaque",
      sources: cite("signalement-spam-exemple.fr", "https://signalement-spam-exemple.fr/"),
    },
    page: {
      title: "Où signaler une arnaque ? - Centre de médiation de la consommation de l'Ouest",
      headings: ["Où signaler une arnaque ?", "Démarchage téléphonique", "Courriels frauduleux"],
      text: "Notre centre de médiation reçoit beaucoup de questions sur les arnaques. Voici les services à connaître. Démarchage téléphonique abusif : signalez le numéro sur Stop démarchage. Courriels frauduleux : Signalement spam. Vos données circulent ? Vérifiez sur Suis-je exposé si votre adresse figure dans une fuite.",
      cites: [
        ["Stop démarchage", "https://stop-demarchage-exemple.fr/"],
        ["Signalement spam", "https://signalement-spam-exemple.fr/"],
        ["Suis-je exposé", "https://suis-je-expose-exemple.com/"],
      ],
    },
    keep: true,
    situations: ["petit_editeur_ressources", "cite_des_comparables"],
    note: "Centre de médiation qui liste où signaler une arnaque et où vérifier une fuite.",
  },
  {
    id: "d02",
    site: "donnees",
    candidate: {
      domain: "blog-securite-de-paul-exemple.fr",
      url: "https://blog-securite-de-paul-exemple.fr/2017/03/verifier-si-son-mail-a-fuite/",
      sources: cite("suis-je-expose-exemple.com", "https://suis-je-expose-exemple.com/"),
    },
    page: {
      title: "Vérifier si son adresse mail a fuité - Le blog sécurité de Paul",
      headings: ["Vérifier si son adresse mail a fuité", "Pour en savoir plus"],
      text: "Billet du 4 mars 2017. Après la fuite d'un grand site de rencontres, plusieurs lecteurs me demandent comment savoir s'ils sont concernés. La méthode est simple. Pour en savoir plus : Suis-je exposé (vérification gratuite), Mon empreinte numérique (ce que le web sait de vous), et le guide de l'autorité de protection des données.",
      cites: [
        ["Suis-je exposé", "https://suis-je-expose-exemple.com/"],
        ["Mon empreinte numérique", "https://mon-empreinte-numerique-exemple.fr/"],
        ["guide de l'autorité", "https://autorite-donnees-exemple.fr/guide"],
      ],
    },
    keep: true,
    situations: ["petit_editeur_ressources", "cite_des_comparables"],
    note: "Blog personnel de sécurité, rubrique « Pour en savoir plus ». Billet de 2017 : à garder.",
  },
  {
    id: "d03",
    site: "donnees",
    candidate: {
      domain: "litiges-faciles-exemple.fr",
      url: "https://litiges-faciles-exemple.fr/blog/demarchage-telephonique-6-outils-pour-s-en-proteger",
      sources: cite("stop-demarchage-exemple.fr", "https://stop-demarchage-exemple.fr/"),
    },
    page: {
      title: "Démarchage téléphonique : 6 outils pour s'en protéger",
      headings: ["Démarchage téléphonique : 6 outils pour s'en protéger"],
      text: "Vous recevez dix appels par jour ? Voici six outils gratuits. 1. Stop démarchage pour signaler un numéro. 2. Liste rouge. 3. Mon empreinte numérique pour voir où votre numéro est publié. 4. Signalement spam. 5. Le blocage intégré à votre téléphone. 6. Suis-je exposé.",
      cites: [
        ["Stop démarchage", "https://stop-demarchage-exemple.fr/"],
        ["Mon empreinte numérique", "https://mon-empreinte-numerique-exemple.fr/"],
        ["Signalement spam", "https://signalement-spam-exemple.fr/"],
        ["Suis-je exposé", "https://suis-je-expose-exemple.com/"],
      ],
    },
    keep: true,
    situations: ["cite_des_comparables"],
    note: "Article de sélection d'outils sur le blog d'une petite plateforme de litiges.",
  },
  {
    id: "d04",
    site: "donnees",
    candidate: {
      domain: "mediatheque-val-exemple.fr",
      url: "https://mediatheque-val-exemple.fr/numerique/proteger-sa-vie-privee",
      sources: dead("guide-vie-privee-ferme.fr", "https://guide-vie-privee-ferme.fr/guide.html"),
    },
    page: {
      title: "Protéger sa vie privée en ligne - Espace numérique de la médiathèque du Val",
      headings: ["Protéger sa vie privée en ligne", "Sites conseillés par nos animateurs"],
      text: "Lors de nos ateliers numériques, nos animateurs conseillent ces sites : le guide pratique de la vie privée, Suis-je exposé pour vérifier une fuite, et les fiches de l'autorité de protection des données. Prochain atelier : samedi 10 h.",
      cites: [
        ["guide pratique de la vie privée", "https://guide-vie-privee-ferme.fr/guide.html"],
        ["Suis-je exposé", "https://suis-je-expose-exemple.com/"],
        ["fiches de l'autorité", "https://autorite-donnees-exemple.fr/fiches"],
      ],
    },
    keep: true,
    situations: ["lien_mort", "petit_editeur_ressources"],
    note: "Le guide conseillé par la médiathèque a disparu : le site a un guide qui le remplace.",
  },
  // ---------- Données personnelles : refus ----------
  {
    id: "d05",
    site: "donnees",
    candidate: {
      domain: "plomberie-martin-exemple.fr",
      url: "https://plomberie-martin-exemple.fr/informations-clients",
      sources: cite("stop-demarchage-exemple.fr", "https://stop-demarchage-exemple.fr/"),
    },
    page: {
      title: "Conditions générales de vente - Plomberie Martin",
      headings: ["Conditions générales de vente", "Article 12 - Démarchage téléphonique"],
      text: "Article 1 - Objet. Les présentes conditions générales de vente régissent les relations entre la société et ses clients. Article 12 - Démarchage téléphonique. Conformément au code de la consommation, le client peut s'inscrire gratuitement sur la liste d'opposition Stop démarchage. Article 13 - Médiation. Article 14 - Droit applicable.",
      cites: [["Stop démarchage", "https://stop-demarchage-exemple.fr/"]],
    },
    keep: false,
    situations: ["juridique"],
    reasons: ["page_legale"],
    note: "CGV qui citent la ressource par obligation légale (l'adresse de la page ne le dit pas).",
  },
  {
    id: "d06",
    site: "donnees",
    candidate: {
      domain: "vpn-ultra-exemple.com",
      url: "https://vpn-ultra-exemple.com/offres/protection-identite",
      sources: cite("suis-je-expose-exemple.com", "https://suis-je-expose-exemple.com/"),
    },
    page: {
      title: "Protection d'identité - VPN Ultra - à partir de 3,99 €/mois",
      headings: ["Protégez votre identité", "Choisissez votre offre", "Essai 30 jours"],
      text: "Protégez votre identité avec VPN Ultra. À partir de 3,99 € par mois, sans engagement. Surveillance du dark web, alertes en cas de fuite (données issues de Suis-je exposé), assistance 24 h sur 24. Choisissez votre offre : Essentiel, Famille, Premium. Essai 30 jours satisfait ou remboursé.",
      cites: [["Suis-je exposé", "https://suis-je-expose-exemple.com/"]],
    },
    keep: false,
    situations: ["aucune", "autre"],
    reasons: ["concurrent"],
    note: "Page de vente d'un abonnement de surveillance des données : il propose la même chose que le site (concurrent direct).",
  },
  {
    id: "d07",
    site: "donnees",
    candidate: {
      domain: "grand-quotidien-exemple.fr",
      url: "https://www.grand-quotidien-exemple.fr/economie/fuite-de-donnees-chez-un-operateur-20260912",
      sources: cite("suis-je-expose-exemple.com", "https://suis-je-expose-exemple.com/"),
      domainRank: 400,
    },
    page: {
      title:
        "Fuite de données chez un opérateur : 19 millions de clients concernés - Grand Quotidien",
      headings: ["Fuite de données chez un opérateur : 19 millions de clients concernés"],
      text: "Avec notre agence de presse. L'opérateur a confirmé vendredi la fuite des données de 19 millions de clients. Le site Suis-je exposé permet de vérifier si une adresse est concernée. Le parquet de Paris a ouvert une enquête. Abonnez-vous pour lire la suite. Grand Quotidien, premier quotidien national.",
      cites: [["Suis-je exposé", "https://suis-je-expose-exemple.com/"]],
    },
    keep: false,
    situations: ["aucune", "autre"],
    reasons: ["irrealiste"],
    note: "Dépêche d'un grand quotidien national : personne n'y modifiera une page pour un inconnu.",
  },
  {
    id: "d08",
    site: "donnees",
    candidate: {
      domain: "guide-du-net-pro-exemple.com",
      url: "https://guide-du-net-pro-exemple.com/proteger-ses-donnees-personnelles-en-2026/",
      sources: cite(
        "mon-empreinte-numerique-exemple.fr",
        "https://mon-empreinte-numerique-exemple.fr/",
      ),
    },
    page: {
      title: "Protéger ses données personnelles en 2026 - Guide du Net Pro",
      headings: ["Protéger ses données personnelles en 2026", "À lire aussi"],
      text: "Publié par admin. La protection des données est un enjeu majeur. Utilisez un outil pour vérifier votre empreinte. Profitez-en pour découvrir le meilleur trading en ligne et un rachat de crédit pas cher. À lire aussi : Top 10 des pergolas bioclimatiques ; Trouver un avocat divorce à Marseille ; CBD : où acheter ; Paris sportifs : les bonus.",
      cites: [
        ["un outil", "https://mon-empreinte-numerique-exemple.fr/"],
        ["trading en ligne", "https://trading-exemple.com/"],
        ["rachat de crédit pas cher", "https://rachat-credit-exemple.fr/"],
        ["Paris sportifs", "https://paris-sportifs-exemple.net/"],
      ],
    },
    keep: false,
    situations: ["ferme_a_liens"],
    reasons: ["ferme_a_liens", "vend_des_liens"],
    note: "Ferme à liens : sujets sans rapport, liens commerciaux placés dans le texte.",
  },
  {
    id: "d09",
    site: "donnees",
    candidate: {
      domain: "cabinet-durand-avocats-exemple.fr",
      url: "https://cabinet-durand-avocats-exemple.fr/actualites/le-droit-a-l-oubli-explique",
      sources: cite("autorite-donnees-exemple.fr", "https://autorite-donnees-exemple.fr/"),
    },
    page: {
      title: "Le droit à l'oubli expliqué - Cabinet Durand Avocats",
      headings: ["Le droit à l'oubli expliqué", "Notre accompagnement"],
      text: "Le droit à l'effacement, prévu à l'article 17 du règlement européen, permet d'obtenir la suppression de ses données dans certains cas. La jurisprudence de la Cour de justice en précise les limites. Notre cabinet accompagne les entreprises dans leur mise en conformité. Contactez-nous pour un audit.",
      cites: [
        ["l'article 17 du règlement", "https://autorite-donnees-exemple.fr/reglement/article-17"],
      ],
    },
    keep: true,
    situations: ["autre"],
    note: "MC.6f : article sur le thème du site (le droit à l'effacement) qui ne recommande aucune ressource (une seule source juridique) : gardé par proximité, avec une note « lien unique » (avant MC.6f : refusé « sans angle »).",
  },
];

/** Lien sortant du contenu tel que le lecteur de pages le rendrait. */
function outboundOf(c: AngleEvalCase): PageOutbound[] {
  return c.page.cites.map(([anchor, url]) => {
    const at = c.page.text.indexOf(anchor);
    return {
      url,
      anchor,
      context: at >= 0 ? c.page.text.slice(Math.max(0, at - 160), at + anchor.length + 160) : "",
      zone: "body" as const,
      rel: [],
      imageOnly: false,
    };
  });
}

/** Page lue d'un cas (éditeur identifiable : les règles gratuites ne doivent pas trancher). */
export function anglePage(c: AngleEvalCase): PageRead {
  const origin = `https://${c.candidate.domain}`;
  return {
    url: c.candidate.url ?? `${origin}/`,
    status: 200,
    blockedByRobots: false,
    unreachable: false,
    title: c.page.title,
    description: "",
    headings: c.page.headings ?? [c.page.title],
    text: c.page.text,
    lang: "fr",
    links: [
      { href: `${origin}/contact`, text: "Contact" },
      { href: `${origin}/a-propos`, text: "À propos" },
    ],
    outbound: outboundOf(c),
    mailtos: [],
    hasContactForm: false,
    viaFallback: false,
  };
}

/** Candidat complet d'un cas. */
export function angleCandidate(c: AngleEvalCase): QualCandidate {
  return {
    title: c.page.title,
    tactics: ["ressources"],
    competitorsCount: 1,
    domainRank: 60,
    spamScore: 5,
    pageType: null,
    signalCount: 1,
    language: "fr",
    ...c.candidate,
  };
}

/** Texte de la page tel que le rédacteur le lit : liens sortants notés `[texte](adresse)`. */
export function angleReadableText(c: AngleEvalCase): string {
  let text = c.page.text;
  for (const [anchor, url] of c.page.cites) {
    text = text.replace(anchor, `[${anchor}](${url})`);
  }
  return `# ${c.page.headings?.[0] ?? c.page.title}\n\n${text}`;
}
