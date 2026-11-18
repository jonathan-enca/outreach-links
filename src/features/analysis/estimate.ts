import { AUDIT_BUDGET } from "@/features/audits/beta";
import { PLAN_LIMITS } from "@/features/audits/plans";
import { SIZE_SPARES } from "@/features/backlinks/limits";
import { collectionTargetUsd } from "@/features/collection/limits";
import { findingsBudgetUsd } from "@/features/findings/limits";
import { AUTO_EXPECTED_SHARE, AUTO_LIMITS } from "@/features/qualification/background";
import { qualificationBudgetUsd } from "@/features/qualification/limits";
import { snowballCostUsd } from "@/features/snowball/limits";
import { PRICING } from "@/lib/dataforseo/endpoints";

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Volumes de l'état des lieux (étape parallèle) : trois appels, bornés. */
export const LINKS_STATE_LIMITS = {
  rankedKeywords: 100,
  referringDomains: 100,
  /** Mots-clés et domaines gardés dans `audits.links_state` (le reste n'est que compté). */
  keptKeywords: 20,
  keptDomains: 50,
} as const;

/** Coût de l'état des lieux (grille de prix, pire cas = attendu : les volumes sont fixes). */
export function linksStateUsd(): number {
  return r6(
    PRICING.backlinksPerRequest +
      PRICING.backlinksPerRequest +
      LINKS_STATE_LIMITS.referringDomains * PRICING.backlinksPerRow +
      PRICING.labsPerRequest +
      LINKS_STATE_LIMITS.rankedKeywords * PRICING.labsPerItem,
  );
}

/** Mesure de taille des concurrents en une requête groupée (retenus + remplaçants). */
export function sizesUsd(maxCompetitors: number = PLAN_LIMITS.payant.maxCompetitors): number {
  return r6(PRICING.backlinksPerRequest + (maxCompetitors + SIZE_SPARES) * PRICING.backlinksPerRow);
}

/**
 * Parts ATTENDUES mesurées aux runs réels du 16/11/2026 (mega-coloring.com), en part du budget de
 * chaque étape : collecte 0,24 à 0,31 USD sur 0,55 ; qualification : 0,082 USD pour 47 pages jugées
 * (17/11, Claude Haiku), soit environ 0,20 USD pour l'objectif de 120 pages, sur 0,40 ; constats
 * 0,0014 sur 0,05. Le pire cas reste le budget entier de chaque étape. Recalage du 18/11/2026 : le réel
 * mesuré de la première liste était 0,92 USD pour 0,82 annoncés ; la qualification mesurée à 0,29 USD
 * sur 0,40 (soit 0,73) comble l'écart. Recalage de l'étape 3 (18/11/2026) : collecte mesurée à 0,357 USD sur 0,55 (0,65) pour un nom de marque distinctif ; l'économie des mentions (0,033 USD, nom descriptif seulement) n'est pas comptée, par prudence. [HYPOTHÈSE à recaler en MU.11.]
 */
const EXPECTED_SHARE = { collection: 0.65, qualification: 0.73, findings: 0.2 } as const;

/** Lecture du site et requêtes par type d'éditeur : deux appels LLM courts (mesurés ~0,001 USD). */
const SMALL_LLM_USD = 0.003;

export interface AnalysisEstimate {
  /** Recherches Google de la découverte des concurrents (déjà chiffrées par l'audit). */
  discoveryUsd: number;
  /** Tout le reste de l'analyse, attendu. */
  analysisUsd: number;
  expectedUsd: number;
  worstUsd: number;
  targetUsd: number;
}

/**
 * Coût de TOUTE l'analyse, annoncé une fois avant le lancement (MU.1), sans aucun appel : attendu
 * (mesures réelles) et pire cas (budget entier de chaque étape). Le contrôle unique du lancement
 * compare l'attendu au plafond ; les plafonds durs restent contrôlés avant chaque appel payant.
 */
export function estimateAnalysis(discoveryUsd: number): AnalysisEstimate {
  const fixed = sizesUsd() + linksStateUsd() + SMALL_LLM_USD;
  const expectedRest =
    fixed +
    collectionTargetUsd() * EXPECTED_SHARE.collection +
    qualificationBudgetUsd() * EXPECTED_SHARE.qualification +
    findingsBudgetUsd() * EXPECTED_SHARE.findings +
    // Lecture de la réserve en arrière-plan : budget de jugement propre, ajouté aux plafonds durs.
    AUTO_LIMITS.budgetUsd * AUTO_EXPECTED_SHARE +
    // Boule de neige (MC.6d) : jusqu'à 6 appels « qui cite cette ressource » après la première liste.
    snowballCostUsd().expectedUsd;
  const worstRest =
    fixed +
    collectionTargetUsd() +
    qualificationBudgetUsd() +
    findingsBudgetUsd() +
    AUTO_LIMITS.budgetUsd +
    snowballCostUsd().worstUsd;
  return {
    discoveryUsd: r6(discoveryUsd),
    analysisUsd: r6(expectedRest),
    expectedUsd: r6(discoveryUsd + expectedRest),
    worstUsd: r6(discoveryUsd + worstRest),
    targetUsd: AUDIT_BUDGET.targetUsd,
  };
}
