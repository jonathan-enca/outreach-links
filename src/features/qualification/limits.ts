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
  // MC.6f : plus d'arrêt « rendement décroissant » tant qu'il reste des candidats (il avait arrêté la
  // première lecture à 560 pages sur 1 400 candidats). Seul le pilotage par ressource (ci-dessous), qui
  // abandonne une ressource dont les pages sont manifestement des fermes à liens, écarte encore des pages.
  /** Part minimale d'un lot donnée à chaque source qui a encore des candidats (exploration). */
  sourceFloor: 2,
  /**
   * Pilotage par ressource comparable (MC.6b). Essai MC.0b : le rendement dépend surtout de la
   * ressource de départ (3 cibles sur 8 pages pour l'une, 0 sur 7 pour une autre, citée par des fermes
   * à liens). On lit donc quelques pages de chaque ressource avant de poursuivre.
   */
  resource: {
    /** Pages lues par ressource avant de décider (sondage). */
    probePages: 8,
    /** Pages du sondage lues par lot tant qu'il n'est pas fini (les ressources sont sondées vite). */
    probeFloor: 4,
    /** Dès ce nombre de pages lues sans cible, une ressource citée surtout par de mauvaises pages est abandonnée. */
    earlyPages: 6,
    /** Part de pages légales ou de fermes à liens à partir de laquelle la ressource est abandonnée. */
    badShare: 0.5,
    /** Après ce nombre de pages lues, une ressource qui rend moins que `minYield` est abandonnée. */
    reviewPages: 24,
    minYield: 0.05,
  },
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
  /**
   * Extrait de page envoyé au modèle (caractères). MC.6c : 6 000 au lieu de 1 200. Sur 1 200 caractères le
   * modèle ne voyait pas qu'un site publie des sujets sans rapport entre eux (fermes à liens) : la liste
   * courte tombe de 38 à 11 (remove-me.io) et de 31 à 15 (mega-coloring.com) sans perdre une cible
   * confirmée par le modèle fort. Ce n'est abordable qu'avec le modèle de génération actuelle (`QUALIFY_MODELS`).
   */
  excerptChars: 6_000,
  /** MC.6b : liens du contenu montrés au modèle (texte et site), et passage autour de la ressource citée. */
  citedLinks: 14,
  /**
   * MQ.3 : lecture gratuite (HTTP, sans LLM) des premiers candidats AVANT le tri par score provisoire.
   * `enabled: false` remet le tri d'avant MQ.3. Coefficients non recalés (aucune réponse réelle encore).
   */
  preread: {
    enabled: true,
    /** Candidats lus avant le tri, au plus (les mieux classés par le score provisoire). */
    maxCandidates: 150,
    weights: {
      /** Page morte, injoignable ou interdite par robots.txt. */
      dead: 0.5,
      /** Page vivante mais écartée par la lecture (parquée, piratée, vente de liens, etc.). */
      excluded: 0.6,
      /** Au moins deux sites extérieurs cités sur la page. */
      cites: 1.2,
      /** La ressource comparable qui a fait trouver la page est citée dessus. */
      resourceFound: 1.25,
    },
  },
  citedContextChars: 320,
  /**
   * Jetons de sortie par cible (plafond de l'appel). MC.6f : 230 était trop juste (la situation de MC.6b
   * s'ajoute à une phrase de motif en français et à la citation) : sur la campagne mega-coloring.com du
   * 18/11, 64 appels de jugement sur 81 ont échoué (« sortie tronquée ») et 256 pages lues sont restées
   * « non_qualifie » sans aucun jugement. 360 laisse de la marge pour la note ajoutée ; ne coûte que ce qui est écrit.
   */
  outputTokensPerTarget: 360,
  /** Adéquation minimale pour rester candidat (MC.6f : 0,3 au lieu de 0,5, « thème ou public voisin » reste gardé ; en dessous, aucun rapport). */
  minFit: 0.3,
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
export const SYSTEM_CHARS = 7_000;
/**
 * Caractères par cible au plus (extrait, titre, description, 8 intertitres, liens du contenu, passage
 * autour de la ressource citée, lien mort annoncé, échappement JSON).
 */
export const TARGET_CHARS =
  QUALIFY_LIMITS.excerptChars +
  1_700 +
  QUALIFY_LIMITS.citedLinks * 110 +
  QUALIFY_LIMITS.citedContextChars +
  500;

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
