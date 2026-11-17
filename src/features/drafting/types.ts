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
  /** Citation de la page de la cible relevée au tri M3.1 (peut être vide : l'angle est cherché à la rédaction). */
  hook: string;
  /** Demande précise issue des constats de page (MT.5) ; absent pour un plan d'opportunités. */
  brief?: DraftBrief | null;
}

/** Page de la cible, relue en entier au moment de rédiger. */
export interface TargetPage {
  url: string;
  title: string;
  description: string;
  /** Contenu éditorial, liens sortants notés `[texte](adresse)`. */
  text: string;
  /** L'adresse renvoie aujourd'hui vers l'accueil : la page visée n'existe plus. */
  moved: boolean;
}

export interface DraftContext {
  siteDomain: string;
  niche: string | null;
  /** Ce que fait le site, en une phrase (titre et description de son accueil). */
  siteSummary?: string | null;
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
  /** Adresse de la page de la cible, citée dans le message. */
  targetPageUrl: string;
  urlStatus: number | null;
  issues: LintIssue[];
  /** Vrai seulement si le linter ne trouve rien ET l'URL a répondu 200. */
  ready: boolean;
  costUsd: number;
}

/** Qui a écarté la cible : le tri (petit modèle), le rédacteur (modèle fort) ou la lecture de sa page. */
export type DeclinedBy = "tri" | "redacteur" | "lecture";

/** Cible écartée : aucune raison honnête de demander un lien. Décision gardée, jamais rejouée. */
export interface DraftDecline {
  itemId: string;
  reason: string;
  by: DeclinedBy;
  costUsd: number;
}

/** Cible non rédigée : motif lisible. */
export interface DraftSkip {
  itemId: string;
  reason: string;
}
