import type { ContactStatus } from "@/features/contacts/types";
import type { CollectionSourceRef } from "@/features/collection/types";
import type { Tactic } from "@/features/queries/schema";

/**
 * Entonnoir de qualification (MT.4, docs/audit-v2.md phase 4), du moins cher au plus cher :
 * 1 gratuit (doublons, exclusions), 2 signaux fournisseur, 3 lecture de page, 4 LLM, 5 contact,
 * 6 score et liste courte. Chaque candidat écarté garde l'étage et un motif lisible.
 */
export const STAGES = [1, 2, 3, 4, 5, 6] as const;
export type Stage = (typeof STAGES)[number];

/** Motifs d'exclusion (code stable, texte lisible dans `messages/fr.ts`). */
export const EXCLUSION_REASONS = [
  // 1. gratuit
  "doublon",
  "propre_site",
  "concurrent",
  "plateforme",
  "geant",
  "faux_domaine",
  "deja_contacte",
  "ne_pas_contacter",
  // MC.1 : nature de la page reconnue par son adresse (gratuit, avant lecture)
  "page_accueil",
  "page_legale",
  "fichier",
  // 2. signaux fournisseur
  "spam",
  "langue",
  "irrealiste",
  // 3. lecture de la page
  "robots",
  "injoignable",
  "page_morte",
  "parque",
  "pirate",
  "vend_des_liens",
  "mur_connexion",
  "editeur_introuvable",
  "hors_budget_lecture",
  // MC.6b : la ressource comparable qui a fait trouver la page ne donne pas de cibles (pilotage par ressource)
  "ressource_abandonnee",
  // 4. LLM
  "hors_sujet",
  // MC.6b : jugement des trois cas (la page lue n'est pas une cible, motif précis)
  "pas_de_contenu",
  "page_commerciale",
  "ferme_a_liens",
  "sans_angle",
  "hors_budget_llm",
  "non_qualifie",
  // 5. contact
  "sans_contact",
  "hors_budget_contact",
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

/** Types de sites (LLM, étage 4). */
export const SITE_TYPES = [
  "mairie",
  "association",
  "ecole",
  "photographe",
  "ecommerce",
  "forum_modere",
  "blog",
  "media",
  "annuaire",
  "autre",
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

/**
 * Situation de la page jugée (MC.6b). Les trois premières sont celles qui ont rapporté des liens à
 * Jonathan (18/11/2026) : la page prouve déjà que le lien y a sa place. Les autres sont des refus.
 */
export const SITUATIONS = [
  /** A. La page contient un lien cassé vers une ressource que le site peut remplacer. */
  "lien_mort",
  /** B. Petit éditeur du public visé qui cite, liste ou recommande des ressources à ses lecteurs. */
  "petit_editeur_ressources",
  /** C. Page de contenu qui renvoie vers plusieurs ressources comparables au site. */
  "cite_des_comparables",
  "pas_une_page_de_contenu",
  "juridique",
  "commercial",
  "ferme_a_liens",
  /** Page de contenu sur le sujet, mais qui ne montre aucune des trois situations. */
  "aucune",
] as const;
export type Situation = (typeof SITUATIONS)[number];

/** Les trois situations qui font une cible. */
export const TARGET_SITUATIONS: ReadonlySet<Situation> = new Set([
  "lien_mort",
  "petit_editeur_ressources",
  "cite_des_comparables",
]);

/** Un candidat de la collecte (MT.3), tel que lu dans `collection_candidates`. */
export interface QualCandidate {
  domain: string;
  url: string | null;
  title: string | null;
  tactics: Tactic[];
  sources: CollectionSourceRef[];
  competitorsCount: number;
  domainRank: number | null;
  spamScore: number | null;
  pageType: string | null;
  signalCount: number;
  /** Langue de la page selon le fournisseur, quand il la donne (chantier G : filtre avant lecture). */
  language?: string | null;
}

/** Contexte de la qualification (site à promouvoir, exclusions). */
export interface QualContext {
  ownDomain: string;
  competitorDomains: string[];
  language: string;
  theme: string;
  brandName: string;
  /** Résumé de l'activité (profil de marque) pour juger l'adéquation. */
  activity: string;
  audience: string[];
  /** Pages du site proposables (l'accueil d'abord). */
  resources: { url: string; title: string }[];
  /** Domaines déjà contactés par un autre utilisateur (fenêtre glissante). */
  contactedElsewhere: string[];
  /** Domaines et adresses de la liste « ne pas contacter » (espace + globale). */
  suppressedDomains: string[];
  suppressedEmails: string[];
}

/** Ce que l'étage 3 garde d'une page lue (compact : passe dans l'état d'Inngest). */
export interface PageSnapshot {
  url: string;
  status: number;
  lang: string | null;
  title: string;
  description: string;
  headings: string[];
  excerpt: string;
  publisherSignals: string[];
  /** Mention d'un programme de contribution (« devenir contributeur », « write for us ») sans tarif. */
  contributorProgram: boolean;
  /** MC.6b : ce que la page cite déjà, relevé gratuitement à la lecture (absent des pages lues avant). */
  cites?: PageCites;
}

/**
 * Ce qu'une page cite déjà (MC.6b) : c'est la preuve qu'un lien y a sa place. Relevé dans les liens
 * sortants du CONTENU (ni menu, ni pied de page, ni réseaux sociaux), sans requête de plus.
 */
export interface PageCites {
  /** Sites extérieurs distincts cités dans le contenu. */
  sites: number;
  /** Premiers liens du contenu : texte du lien et site visé. */
  links: { anchor: string; domain: string }[];
  /** La ressource comparable qui a fait trouver la page (source « citation »), relue sur la page. */
  resource?: { domain: string; found: boolean; context: string };
}

/** Réponse du LLM pour une cible (étage 4), après vérification de la citation. */
export interface LlmJudgement {
  siteType: SiteType;
  fit: number;
  fitReason: string;
  sellsLinks: boolean;
  sameOffer: boolean;
  unrealistic: boolean;
  /** Citation EXACTE de la page, vérifiée ; null si le modèle n'en a pas donné une vraie. */
  hook: string | null;
  /** Index de la ressource du site la plus pertinente pour ce lecteur. */
  resource: number;
  /** MC.6b : situation de la page (absente des jugements rendus avant : l'ancien critère s'applique). */
  situation?: Situation;
}

export interface ContactOutcome {
  status: ContactStatus;
  email: string | null;
  contactUrl: string | null;
  formUrl: string | null;
  sendable: boolean;
  reason: string;
}

export interface ScoreParts {
  pertinence: number;
  unsolicited: number;
  contactEase: number;
  authority: number;
}

export type QualStatus = "liste_courte" | "reserve" | "exclu";

/** Résultat final d'un candidat (une ligne de `qualified_targets`). */
export interface QualResult {
  domain: string;
  url: string | null;
  tactics: Tactic[];
  status: QualStatus;
  stageReached: Stage;
  exclusionReason: ExclusionReason | null;
  exclusionDetail: string | null;
  provisionalScore: number;
  page: PageSnapshot | null;
  judgement: LlmJudgement | null;
  contact: ContactOutcome | null;
  score: number | null;
  scoreParts: ScoreParts | null;
  rank: number | null;
  requestLines: string[] | null;
  why: string | null;
  platformHosted: boolean;
  domainRank: number | null;
  competitorsCount: number;
}
