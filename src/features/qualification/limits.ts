import { AUDIT_BUDGET } from "@/features/audits/beta";
import { DEFAULT_MODELS } from "@/lib/llm/client";
import { estimateCostUsd } from "@/lib/llm/pricing";

/**
 * Plafonds de la qualification (MT.4, lecture adaptative du chantier G). Seul l'étage 4 (LLM) est
 * payant : budget de jugement de 0,40 USD (décision de Jonathan, 17/11/2026 : 40 à 50 cibles par
 * analyse). Les étages 1 à 3 et 5 sont gratuits (lectures HTTP polies, robots.txt respecté) mais
 * bornés en nombre et en durée pour tenir le temps d'une analyse.
 */
export const QUALIFY_LIMITS = {
  /** Chantier D.2 : lire l'accueil avant d'écarter un « éditeur introuvable » vu sur une page intérieure. */
  homeRescue: true,
  /** Part du budget cible d'audit réservée au LLM de qualification (0,40 USD pour 1 USD). */
  shareOfTarget: 0.4,
  // --- Étage 2 : signaux fournisseur ---
  /** Spam (0-100) à partir duquel un domaine est écarté (même seuil que Content Analysis). */
  spamMax: 50,
  /**
   * Autorité DataForSEO (0 à ~1000) au-delà de laquelle un site est jugé irréaliste pour un petit site
   * (grand média, institution nationale). [HYPOTHÈSE à recaler au premier run réel.]
   */
  unrealisticRank: 650,
  // --- Étage 3 : lecture ---
  /**
   * Garde-fou : pages lues au plus, toutes sources confondues. La lecture est ADAPTATIVE (chantier G) :
   * elle s'arrête d'elle-même bien avant (objectif de pages jugées, durée, budget, rendement).
   */
  maxPagesRead: 700,
  /** Pages lues par lot (un step Inngest par lot : lecture, puis jugement du lot). */
  pagesPerStep: 40,
  /** MU.1 : sites DIFFÉRENTS lus de front dans un step (un même hôte reste lu en série, avec son délai). */
  readConcurrency: 12,
  /**
   * Lecture adaptative : on s'arrête quand ce nombre de pages utilisables a été jugé. 150 (120 au
   * départ) : mesuré le 17/11/2026, 137 puis 142 pages jugées donnent 46 puis 40 cibles ; l'objectif
   * est de 40 à 50 cibles par analyse.
   */
  targetJudged: 150,
  /** Durée maximale de la lecture et du jugement (12 minutes). */
  maxReadMs: 12 * 60_000,
  /** Rendement décroissant : arrêt après ce nombre de lots de suite presque sans page pertinente. */
  dryLots: 3,
  /** Un lot « n'apporte presque rien » s'il donne au plus ce nombre de pages pertinentes. */
  dryLotMaxRelevant: 1,
  /** Jamais d'arrêt par rendement avant ce nombre de lots. */
  minLots: 4,
  /** Part minimale d'un lot donnée à chaque source qui a encore des candidats (exploration). */
  sourceFloor: 2,
  // --- Avant lecture : robots.txt (vérification légère, en parallèle) ---
  /** Candidats dont le robots.txt est vérifié avant toute lecture (les premiers de chaque source). */
  preflightMax: 450,
  preflightPerStep: 150,
  preflightConcurrency: 30,
  /** Requêtes HTTP par page (robots.txt + page + secours). */
  requestsPerPage: 4,
  hostDelayMs: 600,
  // --- Étage 4 : LLM ---
  /** Cibles jugées au plus par le LLM (garde-fou ; l'objectif est `targetJudged`). */
  maxLlmTargets: 200,
  /** Appels LLM lancés de front dans le step de jugement d'un lot. */
  judgeConcurrency: 4,
  /** Cibles par appel (le prompt système est payé une fois par lot). */
  batchSize: 5,
  /**
   * Jugement par l'API par lots (arrière-plan seulement) : intervalle entre deux lectures de l'état
   * et délai maximal avant repli en appels directs. Le délai annoncé par Anthropic est « jusqu'à 1 h,
   * la plupart du temps moins » ; mesuré sur un vrai lot le 18/11/2026 (voir PROGRESS.md).
   */
  batchPollMs: 30_000,
  batchMaxWaitMs: 10 * 60_000,
  /** Extrait de page envoyé au modèle (caractères). */
  excerptChars: 1_200,
  /** Jetons de sortie par cible (borne du coût). */
  outputTokensPerTarget: 200,
  /** Adéquation minimale pour rester candidat. */
  minFit: 0.5,
  // --- Étage 5 : contact ---
  /** Cibles dont on cherche le contact (dans l'ordre du score provisoire après LLM). */
  maxContactTargets: 150,
  contactsPerStep: 16,
  /** MU.1 : sites différents dont on cherche le contact de front. */
  contactConcurrency: 12,
  /**
   * Appels payants du finder d'emails : 0 en MT.4 (budget 0,10 USD tenu par le seul LLM). Seuls les
   * emails publiés par la cible et les formulaires comptent ; à ouvrir avec une ligne de budget.
   */
  contactPaidCalls: 0,
  // --- Étage 6 ---
  /**
   * Garde-fou de taille : la liste courte est faite par un SEUIL de qualité (`minFit`, contact trouvé),
   * pas par un nombre. Aucun plafond par type d'éditeur.
   */
  shortlistSize: 150,
  /** Autorité au-delà de laquelle elle ne rapporte plus rien au score (« autorité plafonnée »). */
  authorityCap: 300,
  /** Fenêtre pendant laquelle un domaine contacté par un autre utilisateur est exclu (jours). */
  contactedWindowDays: 90,
  /** Part des candidats lus qui survivent à l'étage 3, pour le coût ATTENDU (le pire cas = 100 %). */
  typicalAliveRate: 0.4,
} as const;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Budget du LLM de qualification (USD) : 40 % du budget cible d'audit, soit 0,40 USD. */
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
  const llmTargetsExpected = Math.min(
    Math.round(pagesToRead * L.typicalAliveRate),
    L.targetJudged,
    llmTargetsMax,
  );
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
