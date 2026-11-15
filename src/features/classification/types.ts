/** Les 12 catégories de réponse (CLAUDE.md 4.2). */
export const CATEGORIES = [
  "accepte_lien_pose",
  "interesse_conditions",
  "demande_paiement",
  "demande_echange",
  "question",
  "refus_poli",
  "desinscription",
  "redirection",
  "reponse_automatique",
  "rebond",
  "plainte_hostile",
  "ambigu",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  accepte_lien_pose: "Accepte / lien posé",
  interesse_conditions: "Intéressé sous conditions",
  demande_paiement: "Demande de paiement",
  demande_echange: "Demande d'échange",
  question: "Question",
  refus_poli: "Refus poli",
  desinscription: "Désinscription",
  redirection: "Redirection vers un autre contact",
  reponse_automatique: "Réponse automatique / absence",
  rebond: "Rebond",
  plainte_hostile: "Plainte / hostile",
  ambigu: "Ambigu",
};

/** Catégories à risque : le rappel doit rester très élevé (ne jamais recontacter, alerte). */
export const RISK_CATEGORIES: readonly Category[] = ["desinscription", "plainte_hostile"];

export const ACTIONS = [
  "preparer_reponse_inseree",
  "brouillon_reponse",
  "politique_payant",
  "clore_refuse",
  "suppression",
  "proposer_nouveau_contact",
  "repousser_relance",
  "deja_traite",
  "suppression_et_alerte",
  "revue_manuelle",
] as const;
export type ProposedAction = (typeof ACTIONS)[number];

export type ClassificationSource = "regle" | "llm" | "repli";

export interface ClassifierInput {
  /** Type posé par la lecture IMAP (M4.4) : seul le rattachement le décide, pas le contenu. */
  inboundKind: "reponse" | "rebond" | "reponse_automatique";
  subject: string | null;
  body: string;
  fromEmail: string | null;
}

export interface Classification {
  category: Category;
  confidence: number;
  justification: string;
  source: ClassificationSource;
  needsReview: boolean;
  injectionSuspected: boolean;
  model: string | null;
  costUsd: number;
}

/** Plafonds de la classification (USD, par passage et par appel). */
export const CLASSIFY_LIMITS = {
  /** Messages traités par passage. */
  maxPerTick: 20,
  llmBudgetUsd: 0.05,
  llmMaxCostPerCallUsd: 0.005,
  /** Confiance sous laquelle la classification est « à relire ». */
  reviewConfidence: 0.6,
  /** Confiance minimale pour clore un prospect (refus) sans validation. */
  autoCloseConfidence: 0.75,
  /** Relance repoussée après une réponse automatique (jours). */
  postponeDays: 7,
  /** Longueur de texte (caractères) transmise au classifieur. */
  maxChars: 1500,
} as const;
