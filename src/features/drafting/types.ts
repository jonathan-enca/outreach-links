/** Rédaction des messages d'outreach (M3.3). */
export type DraftChannel = "email" | "formulaire";

/** Comment l'expéditeur se présente (réponse de l'utilisateur ; jamais supposé). */
export type Presentation = "fondateur" | "equipe" | "agence";

/**
 * Brief d'une demande issue de l'écran « Vos cibles » (MT.6) : le point précis relevé sur la page de la
 * cible (citation exacte), la ressource à proposer, l'ancre et la présentation de l'expéditeur.
 */
export interface DraftBrief {
  kind: string;
  opening: string;
  resourceTitle: string;
  resourceUrl: string;
  anchor: string | null;
  presentation: Presentation;
  quote: string | null;
  linkUrl: string | null;
  httpStatus: number | null;
  proposedSentence: string | null;
}

/** Une cible contactable, avec ce qu'il faut pour rédiger un message précis. */
export interface DraftItem {
  id: string;
  domain: string;
  /** Type de cible du plan (page_ressources, lien_mort, ...). */
  type: string;
  expectedLinkType: string;
  offer: string | null;
  rationale: string;
  targetPageUrl: string;
  anchorText: string;
  brokenUrl: string | null;
  channel: DraftChannel;
  /** Page réellement lue au tri. */
  pageUrl: string;
  pageTitle: string | null;
  /** Citation exacte de la page de la cible (tri M3.1) ou titre de la page. */
  hook: string;
  /** Demande précise issue des constats de page (MT.5) ; absent pour un plan d'opportunités. */
  brief?: DraftBrief | null;
}

export interface DraftContext {
  siteDomain: string;
  niche: string | null;
  language: string;
  offeredAsset: string | null;
  signatureFirstName: string;
}

export interface LintIssue {
  code: string;
  message: string;
}

export interface DraftResult {
  itemId: string;
  channel: DraftChannel;
  subject: string | null;
  body: string;
  hook: string;
  targetingReason: string;
  proposedUrl: string;
  urlStatus: number | null;
  issues: LintIssue[];
  /** Vrai seulement si le linter ne trouve rien ET l'URL a répondu 200. */
  ready: boolean;
  costUsd: number;
}

/** Cible non rédigée : motif lisible. */
export interface DraftSkip {
  itemId: string;
  reason: string;
}
