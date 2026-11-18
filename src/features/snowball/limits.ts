import { citationsCallUsd, COLLECTION_LIMITS } from "@/features/collection/limits";

/**
 * Boule de neige (MC.6d, mesure MC.6c du 18/11/2026) : après le premier passage de qualification, les sites
 * cités par les cibles retenues deviennent des ressources de départ. Même appel « qui cite cette
 * ressource » que la collecte, même réglage, même plafond par appel ; ce qui change, c'est la source des
 * ressources. Un seul jeu de chiffres, pour tous les sites.
 */
export const SNOWBALL_LIMITS = {
  /** Ressources interrogées au plus (6 comme la collecte : ~0,03 USD chacune, mesuré). */
  maxResources: 6,
  /** Candidats montrés au modèle au plus (les plus cités d'abord). */
  maxSeedCandidates: 60,
  /** Sous ce nombre de graines retenues, le repli « ressources publiques et gratuites » prend la main. */
  minSeeds: 1,
  /** Un site doit être cité par au moins ce nombre de pages lues pour être proposé en repli. */
  minCitedByFallback: 1,
  /** Coût réservé pour le choix des graines, et pour le repli (deux appels courts du petit modèle). */
  pickReservedUsd: 0.01,
  /** Part du coût de la phase attendue dépensée (les appels qui ne rendent rien sont facturés moins). */
  typicalFill: 0.9,
} as const;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Coût annoncé de la phase : attendu et pire cas (USD). Plafond dur : le pire cas. */
export function snowballCostUsd(max: number = SNOWBALL_LIMITS.maxResources): {
  expectedUsd: number;
  worstUsd: number;
} {
  const rows = COLLECTION_LIMITS.citations.rowsPerCall;
  const picks = SNOWBALL_LIMITS.pickReservedUsd * 2;
  return {
    expectedUsd: r6(
      max * citationsCallUsd(Math.round(rows * COLLECTION_LIMITS.citations.typicalFill)) +
        SNOWBALL_LIMITS.pickReservedUsd,
    ),
    worstUsd: r6(max * citationsCallUsd(rows) + picks),
  };
}
