/**
 * Score d'audit /100 : repère de lecture, jamais une promesse de résultat.
 * 60 % : liens (domaines référents du site par rapport à la médiane des concurrents) ;
 * 40 % : visibilité (part des pages classées qui ont au moins un mot-clé dans le top 10).
 * Si une des deux mesures manque, l'autre compte pour 100 %. Sans mesure : pas de score.
 */
export const SCORE_WEIGHTS = { links: 0.6, visibility: 0.4 } as const;

export interface ScoreInput {
  ownReferringDomains: number | null;
  benchmarkMedian: number | null;
  pagesRanked: number;
  pagesTop10: number;
}

export interface ScoreResult {
  score: number;
  band: "a_renforcer" | "correct" | "solide";
  linkRatio: number | null;
  visibility: number | null;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function computeScore(input: ScoreInput): ScoreResult | null {
  const linkRatio =
    input.benchmarkMedian !== null &&
    input.benchmarkMedian > 0 &&
    input.ownReferringDomains !== null
      ? clamp01(input.ownReferringDomains / input.benchmarkMedian)
      : null;
  const visibility = input.pagesRanked > 0 ? clamp01(input.pagesTop10 / input.pagesRanked) : null;
  if (linkRatio === null && visibility === null) return null;
  let raw: number;
  if (linkRatio !== null && visibility !== null) {
    raw = SCORE_WEIGHTS.links * linkRatio + SCORE_WEIGHTS.visibility * visibility;
  } else {
    raw = (linkRatio ?? visibility)!;
  }
  const score = Math.round(raw * 100);
  return {
    score,
    band: score < 35 ? "a_renforcer" : score < 65 ? "correct" : "solide",
    linkRatio,
    visibility,
  };
}
