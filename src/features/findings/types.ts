/**
 * Constats par page (MT.5) : pour une cible de la liste courte, ce qu'on a VU sur sa page et qui
 * justifie une demande précise. Trois sortes de constats (docs/audit-v2.md, tactiques 2 et 3 et
 * « liens inadaptés » de Jonathan) :
 * - `lien_mort` : un lien sortant de la page répond 404 ou 410 (preuve constatée) ;
 * - `lien_inadapte` : un lien sortant étranger ou peu utile au lecteur, qu'une ressource du site
 *   remplace réellement (la citation du lien est celle de la page) ;
 * - `mention_sans_lien` : la page nomme le site sans le lier (vérifié : aucun lien vers lui).
 */
export const FINDING_KINDS = ["lien_mort", "lien_inadapte", "mention_sans_lien"] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];

export interface FindingContext {
  ownDomain: string;
  brandName: string;
  /** Écritures du nom à chercher dans les pages (profil de marque). */
  nameVariants: string[];
  language: string;
  theme: string;
  activity: string;
  competitorDomains: string[];
  /** Pages du site proposables (l'accueil d'abord), comme en MT.4. */
  resources: { url: string; title: string }[];
}

/** Une cible de la liste courte à examiner. */
export interface FindingTarget {
  /** Id de la ligne `qualified_targets`. */
  targetId: string;
  domain: string;
  /** Page lue en MT.4 (celle qu'on a jugée). */
  url: string;
  rank: number;
  /** Ressource préférée du jugement MT.4 (index dans `resources`), repli du choix de remplacement. */
  resource: number;
}

export interface MentionHit {
  /** Écriture exacte rencontrée dans la page. */
  matched: string;
  /** Phrase de la page qui contient la mention (citation). */
  sentence: string;
}

export type LinkOrigin = "etranger" | "ambigu" | "local";

/** Lien sortant du contenu d'une page, candidat à « inadapté ». */
export interface LinkCandidate {
  index: number;
  url: string;
  host: string;
  anchor: string;
  context: string;
  origin: LinkOrigin;
}

/** Lien mort constaté (404/410) sur la page. */
export interface DeadLinkHit {
  url: string;
  anchor: string;
  context: string;
  status: 404 | 410;
  /** Le lien mort pointe vers le site lui-même (une de ses anciennes pages) : cas le plus favorable. */
  toOwnSite: boolean;
}

/** Ce que la lecture et les contrôles gratuits ont trouvé sur la page d'une cible. */
export interface PageScan {
  targetId: string;
  domain: string;
  pageUrl: string;
  pageTitle: string;
  /** Page lue en HTTP 200 (sinon aucun constat n'est tenté). */
  read: boolean;
  unreadableReason: string | null;
  mentions: MentionHit[];
  /** La page contient déjà un lien vers le site (alors aucune demande de mention). */
  alreadyLinked: boolean;
  linkCandidates: LinkCandidate[];
  dead: DeadLinkHit[];
  requests: number;
}

export type ReplacementHow = "recoupement" | "jugement" | "accueil";

/** Une demande précise, prête à devenir un message (le rédacteur, M3.3, l'écrit) ou une tâche. */
export interface Finding {
  targetId: string;
  domain: string;
  kind: FindingKind;
  pageUrl: string;
  /** Citation EXACTE de la page (phrase de la mention, du lien ou du passage). */
  quote: string;
  /** Lien mort ou lien inadapté ; null pour une mention. */
  linkUrl: string | null;
  httpStatus: 404 | 410 | null;
  /** Ancre existante (lien) ou ancre proposée (mention). */
  anchor: string | null;
  resourceUrl: string;
  resourceTitle: string;
  replacementHow: ReplacementHow;
  /** Mention : la phrase après modification. */
  proposedSentence: string | null;
  reason: string;
  /** Trois lignes : quoi demander, le point précis de la page, ce que la cible y gagne. */
  requestLines: string[];
  /** Éléments structurés pour le rédacteur (ouverture par le point précis, présentation honnête). */
  brief: FindingBrief;
}

export interface FindingBrief {
  opening: string;
  resourceTitle: string;
  resourceUrl: string;
  anchor: string | null;
  introduceAs: "fondateur";
}
