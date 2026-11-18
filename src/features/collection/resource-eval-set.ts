import type { ResourceCandidate, SiteBrief } from "./resource-judge";

/**
 * Jeu d'évaluation annoté du CHOIX DES RESSOURCES COMPARABLES (MC.6a, annoté en MC.6b), sur deux sites
 * de thèmes différents (règle de généralité). Pour chaque site : son profil, et des candidats du genre de
 * ceux que la collecte propose au modèle (concurrents retenus par l'audit, sites vus sur les recherches),
 * annotés « comparable » ou non. Les refus reprennent les erreurs constatées le 18/11/2026 quand les
 * concurrents de l'audit étaient pris tels quels : éditeurs de livres, vendeur d'étiquettes, banque
 * d'images, éditeur d'antivirus, administration, média généraliste, place de marché, forum, autre langue.
 * Les domaines sont inventés.
 *
 * `pnpm test` vérifie la cohérence du jeu ; `pnpm demo:resources-eval` mesure la précision et le rappel
 * réels du choix par le petit modèle (à relancer avant et après tout changement de consigne).
 */
export interface ResourceEvalCase {
  candidate: ResourceCandidate;
  /** Propose-t-il la même chose que le site, au même public ? */
  comparable: boolean;
  note: string;
}

export interface ResourceEvalSite {
  id: string;
  language: string;
  site: SiteBrief;
  cases: ResourceEvalCase[];
}

const c = (
  domain: string,
  title: string,
  comparable: boolean,
  note: string,
  extra: Partial<ResourceCandidate> = {},
): ResourceEvalCase => ({
  candidate: {
    domain,
    title,
    url: `https://${domain}/`,
    queries: 2,
    origin: "recherche",
    referringDomains: null,
    ...extra,
  },
  comparable,
  note,
});

export const RESOURCE_EVAL_SITES: ResourceEvalSite[] = [
  {
    id: "coloriages",
    language: "fr",
    site: {
      domain: "mon-site-de-coloriages.fr",
      theme: "coloriages gratuits à imprimer",
      activity:
        "Site qui propose des coloriages gratuits à imprimer en A4, sans inscription, classés par thèmes pour enfants et adultes.",
      offer:
        "Plus de 1 000 dessins à imprimer classés par thèmes (animaux, mandalas, fêtes), cahiers PDF pour les enseignants.",
      audience: ["parents", "enseignants et ATSEM", "adultes qui colorient pour se détendre"],
      pages: [
        "Coloriages d'animaux à imprimer",
        "Mandalas anti-stress",
        "Coloriages pour la classe",
      ],
    },
    cases: [
      c(
        "coloriages-des-petits.fr",
        "Coloriages gratuits à imprimer pour enfants",
        true,
        "même offre",
      ),
      c(
        "dessins-magiques.com",
        "Mandalas et coloriages à imprimer gratuitement",
        true,
        "même offre",
      ),
      c(
        "tete-a-colorier.com",
        "Des milliers de coloriages à imprimer, classés par thème",
        true,
        "même offre",
        { origin: "audit", referringDomains: 1200 },
      ),
      c(
        "hugo-et-ses-crayons.fr",
        "Coloriages, jeux et activités à imprimer pour les enfants",
        true,
        "coloriages et activités à imprimer, même public",
      ),
      c(
        "editions-du-petit-loup.fr",
        "Maison d'édition jeunesse : albums, romans, cahiers d'activités",
        false,
        "éditeur de livres : même public, autre produit",
        { origin: "audit", referringDomains: 1800 },
      ),
      c(
        "etiquettes-prenom.fr",
        "Étiquettes personnalisées pour vêtements et fournitures scolaires",
        false,
        "boutique d'étiquettes",
        { origin: "audit", referringDomains: 1100 },
      ),
      c(
        "banque-images-pro.com",
        "Photos, vecteurs et illustrations libres de droits",
        false,
        "banque d'images généraliste",
        { origin: "audit", referringDomains: 21000 },
      ),
      c(
        "supermarche-en-ligne.com",
        "Livres de coloriage : achat en ligne, livraison rapide",
        false,
        "place de marché",
        { origin: "audit", referringDomains: 49000 },
      ),
      c(
        "magazine-parents-actu.fr",
        "Actualités, santé, éducation : le magazine des parents",
        false,
        "média généraliste",
      ),
      c(
        "forum-des-mamans.fr",
        "Forum : activités manuelles avec les enfants",
        false,
        "forum : pas une ressource qu'on cite à côté du site",
      ),
      c(
        "free-coloring-sheets.com",
        "Free printable coloring pages for kids",
        false,
        "même offre mais dans une autre langue que celle demandée",
      ),
      c(
        "academie-exemple.gouv.fr",
        "Ressources pédagogiques pour le premier degré",
        false,
        "administration",
      ),
    ],
  },
  {
    id: "donnees",
    language: "fr",
    site: {
      domain: "mes-donnees-exemple.fr",
      theme: "protection des données personnelles",
      activity:
        "Service qui analyse gratuitement ce que les données personnelles d'une personne révèlent sur internet, chez les courtiers en données et dans les fuites connues.",
      offer:
        "Outil d'analyse gratuit sans inscription (adresse, téléphone, email exposés), guides pratiques sur les droits et le démarchage.",
      audience: [
        "particuliers soucieux de leur vie privée",
        "victimes de démarchage ou d'usurpation d'identité",
      ],
      pages: [
        "Analyse gratuite de vos données",
        "Guide : faire cesser le démarchage téléphonique",
        "Guide : que faire après une fuite de données",
      ],
    },
    cases: [
      c(
        "suis-je-expose-exemple.com",
        "Vérifiez gratuitement si vos données ont fuité",
        true,
        "même service (vérification d'exposition)",
      ),
      c(
        "mon-empreinte-numerique-exemple.fr",
        "Découvrez ce qu'internet sait de vous : analyse gratuite",
        true,
        "même service",
      ),
      c(
        "effacer-mes-donnees-exemple.fr",
        "Faites retirer vos données personnelles des sites de courtiers",
        true,
        "service voisin, même public, même besoin",
        { origin: "audit", referringDomains: 300 },
      ),
      c(
        "antivirus-geant-exemple.com",
        "Antivirus et sécurité pour PC, Mac et mobile",
        false,
        "éditeur d'antivirus : autre produit",
        { origin: "audit", referringDomains: 1600 },
      ),
      c(
        "autorite-donnees-exemple.gouv.fr",
        "Autorité nationale de protection des données",
        false,
        "administration",
      ),
      c(
        "chambre-haute-exemple.fr",
        "Proposition de loi relative au démarchage téléphonique",
        false,
        "institution",
        { origin: "audit", referringDomains: 42000 },
      ),
      c(
        "orientation-etudes-exemple.com",
        "Fiche métier : délégué à la protection des données",
        false,
        "portail d'orientation",
        { origin: "audit", referringDomains: 11000 },
      ),
      c(
        "blog-du-webmarketing-exemple.com",
        "Actualité du numérique, des réseaux sociaux et du marketing",
        false,
        "média généraliste du numérique",
        { origin: "audit", referringDomains: 13000 },
      ),
      c(
        "cabinet-conformite-exemple.fr",
        "Cabinet de conseil : mise en conformité des entreprises",
        false,
        "service aux entreprises, autre public",
      ),
      c(
        "comparateur-logiciels-exemple.fr",
        "Comparatif des logiciels de gestion du consentement",
        false,
        "annuaire de logiciels pour entreprises",
      ),
      c(
        "privacy-check-example.com",
        "Free personal data exposure scan",
        false,
        "même service mais dans une autre langue que celle demandée",
      ),
    ],
  },
];
