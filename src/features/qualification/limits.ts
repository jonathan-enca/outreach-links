import { AUDIT_BUDGET } from "@/features/audits/beta";
import { DEFAULT_MODELS } from "@/lib/llm/client";
import { estimateCostUsd } from "@/lib/llm/pricing";

/**
 * Plafonds de la qualification (MT.4). Seul l'étage 4 (LLM) est payant : budget = 10 % du budget
 * cible d'un audit (docs/audit-v2.md section 6), soit 0,10 USD. Les étages 1 à 3 et 5 sont gratuits
 * (lectures HTTP polies, robots.txt respecté) mais bornés en nombre pour tenir le temps d'un job.
 */
export const QUALIFY_LIMITS = {
  /** Part du budget cible d'audit réservée au LLM de qualification. */
  shareOfTarget: 0.1,
  // --- Étage 2 : signaux fournisseur ---
  /** Spam (0-100) à partir duquel un domaine est écarté (même seuil que Content Analysis). */
  spamMax: 50,
  /**
   * Autorité DataForSEO (0 à ~1000) au-delà de laquelle un site est jugé irréaliste pour un petit site
   * (grand média, institution nationale). [HYPOTHÈSE à recaler au premier run réel.]
   */
  unrealisticRank: 650,
  // --- Étage 3 : lecture ---
  /** Pages lues au plus (les meilleurs candidats provisoires d'abord). */
  maxPagesRead: 150,
  /** Pages lues par step Inngest. */
  pagesPerStep: 20,
  /** MU.1 : sites DIFFÉRENTS lus de front dans un step (un même hôte reste lu en série, avec son délai). */
  readConcurrency: 8,
  /** Requêtes HTTP par page (robots.txt + page + secours). */
  requestsPerPage: 4,
  hostDelayMs: 600,
  // --- Étage 4 : LLM ---
  /** Cibles jugées au plus par le LLM. */
  maxLlmTargets: 120,
  /** Cibles par appel (le prompt système est payé une fois par lot). */
  batchSize: 5,
  /** Extrait de page envoyé au modèle (caractères). */
  excerptChars: 1_200,
  /** Jetons de sortie par cible (borne du coût). */
  outputTokensPerTarget: 110,
  /** Adéquation minimale pour rester candidat. */
  minFit: 0.5,
  // --- Étage 5 : contact ---
  /** Cibles dont on cherche le contact (dans l'ordre du score provisoire après LLM). */
  maxContactTargets: 60,
  contactsPerStep: 8,
  /** MU.1 : sites différents dont on cherche le contact de front. */
  contactConcurrency: 8,
  /**
   * Appels payants du finder d'emails : 0 en MT.4 (budget 0,10 USD tenu par le seul LLM). Seuls les
   * emails publiés par la cible et les formulaires comptent ; à ouvrir avec une ligne de budget.
   */
  contactPaidCalls: 0,
  // --- Étage 6 ---
  shortlistSize: 40,
  /** Autorité au-delà de laquelle elle ne rapporte plus rien au score (« autorité plafonnée »). */
  authorityCap: 300,
  /** Fenêtre pendant laquelle un domaine contacté par un autre utilisateur est exclu (jours). */
  contactedWindowDays: 90,
  /** Part des candidats lus qui survivent à l'étage 3, pour le coût ATTENDU (le pire cas = 100 %). */
  typicalAliveRate: 0.7,
} as const;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Budget du LLM de qualification (USD) : 10 % du budget cible d'audit. */
export function qualificationBudgetUsd(auditTargetUsd: number = AUDIT_BUDGET.targetUsd): number {
  return r6(auditTargetUsd * QUALIFY_LIMITS.shareOfTarget);
}

/** Prompt système + contexte du site (caractères) : borne vérifiée par un test sur le vrai prompt. */
export const SYSTEM_CHARS = 3_000;
/** Caractères par cible au plus (extrait, titre, description, 8 intertitres, échappement JSON). */
export const TARGET_CHARS = QUALIFY_LIMITS.excerptChars + 1_700;

/** Pire coût d'un appel de `n` cibles (USD) : prompt plein et sortie au maximum. */
export function batchWorstUsd(n: number, model: string = DEFAULT_MODELS.anthropic): number {
  return estimateCostUsd(
    model,
    SYSTEM_CHARS + n * TARGET_CHARS,
    n * QUALIFY_LIMITS.outputTokensPerTarget,
  );
}

/** Coût attendu d'un appel de `n` cibles : extraits plus courts et sortie à ~70 % du maximum. */
export function batchExpectedUsd(n: number, model: string = DEFAULT_MODELS.anthropic): number {
  return estimateCostUsd(
    model,
    SYSTEM_CHARS + n * Math.round(TARGET_CHARS * 0.8),
    Math.round(n * QUALIFY_LIMITS.outputTokensPerTarget * 0.7),
  );
}

export interface QualificationEstimate {
  /** Candidats restants après les étages gratuits 1 et 2. */
  afterFree: number;
  /** Pages lues (étage 3). */
  pagesToRead: number;
  /** Cibles jugées par le LLM, attendu et au plus. */
  llmTargetsExpected: number;
  llmTargetsMax: number;
  expectedUsd: number;
  worstUsd: number;
  budgetUsd: number;
  model: string;
}

/**
 * Coût ANNONCÉ avant lancement, sans appel : attendu (une part des pages lues survit) et pire cas
 * (toutes survivent, prompts pleins), tous deux bornés par le budget de qualification.
 */
export function estimateQualification(
  afterFree: number,
  opts: { model?: string; budgetUsd?: number; maxPages?: number } = {},
): QualificationEstimate {
  const L = QUALIFY_LIMITS;
  const model = opts.model ?? DEFAULT_MODELS.anthropic;
  const budgetUsd = opts.budgetUsd ?? qualificationBudgetUsd();
  const pagesToRead = Math.min(afterFree, opts.maxPages ?? L.maxPagesRead);
  const llmTargetsMax = Math.min(pagesToRead, L.maxLlmTargets);
  const llmTargetsExpected = Math.min(Math.round(pagesToRead * L.typicalAliveRate), llmTargetsMax);
  const cost = (n: number, per: (k: number, m: string) => number) => {
    const full = Math.floor(n / L.batchSize);
    const rest = n % L.batchSize;
    return r6(full * per(L.batchSize, model) + (rest ? per(rest, model) : 0));
  };
  return {
    afterFree,
    pagesToRead,
    llmTargetsExpected,
    llmTargetsMax,
    expectedUsd: Math.min(cost(llmTargetsExpected, batchExpectedUsd), budgetUsd),
    worstUsd: Math.min(cost(llmTargetsMax, batchWorstUsd), budgetUsd),
    budgetUsd,
    model,
  };
}
