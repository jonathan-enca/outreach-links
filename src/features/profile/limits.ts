import type { PlanKey } from "@/features/audits/plans";
import { estimateCost } from "@/lib/dataforseo/endpoints";

/** Limites visées par plan (lignes demandées par appel, concurrents de repère, pages techniques). */
export interface ProfileLimits {
  /** Lignes de `ranked_keywords` demandées. */
  keywords: number;
  /** Domaines référents du site demandés (sert à l'écart). */
  referringDomains: number;
  /** Backlinks du site demandés en échantillon (ancres, dofollow, domaines par page). */
  backlinksSample: number;
  /** Concurrents dont on mesure le profil de liens (repère du besoin en domaines référents). */
  benchmarkCompetitors: number;
  /** Pages contrôlées par OnPage. */
  onpagePages: number;
}

export const PROFILE_LIMITS: Record<PlanKey, ProfileLimits> = {
  gratuit: {
    keywords: 50,
    referringDomains: 50,
    backlinksSample: 50,
    benchmarkCompetitors: 3,
    onpagePages: 3,
  },
  payant: {
    keywords: 500,
    referringDomains: 1000,
    backlinksSample: 1000,
    benchmarkCompetitors: 10,
    onpagePages: 10,
  },
};

/** Marge gardée pour le résumé LLM (quelques fractions de cent). */
export const LLM_RESERVE_USD = 0.005;
/** Sous ce nombre de lignes par appel, l'étape est refusée plutôt que dégradée. */
export const MIN_ROWS = 50;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const SAMPLE = "exemple.fr";

export interface ProfileEstimate {
  limits: ProfileLimits;
  totalUsd: number;
  breakdown: {
    summary: number;
    benchmark: number;
    keywords: number;
    referring: number;
    backlinks: number;
    onpage: number;
    llm: number;
  };
}

/**
 * `knownBenchmark` : concurrents de repère dont la taille (domaines référents) est déjà
 * connue par la mesure groupée de MA.2 : leur repère ne coûte plus d'appel (MA.3).
 */
export function costOf(
  l: ProfileLimits,
  knownBenchmark = 0,
): ProfileEstimate["breakdown"] & { total: number } {
  const paidBenchmark = Math.max(0, l.benchmarkCompetitors - knownBenchmark);
  const b = {
    summary: estimateCost("backlinksSummary", { target: SAMPLE }),
    benchmark: r6(paidBenchmark * estimateCost("backlinksSummary", { target: SAMPLE })),
    keywords: estimateCost("labsRankedKeywords", { target: SAMPLE, limit: l.keywords }),
    referring: estimateCost("backlinksReferringDomains", {
      target: SAMPLE,
      limit: l.referringDomains,
    }),
    backlinks: estimateCost("backlinksBacklinks", {
      target: SAMPLE,
      limit: l.backlinksSample,
      mode: "as_is",
    }),
    onpage: r6(l.onpagePages * estimateCost("onpageInstantPages", { url: "https://exemple.fr/" })),
    llm: LLM_RESERVE_USD,
  };
  return { ...b, total: r6(Object.values(b).reduce((s, n) => s + n, 0)) };
}

/**
 * Estimation avant lancement. Si le budget restant (plafond de l'audit moins le déjà
 * engagé) ne couvre pas les limites du plan : d'abord on divise les lignes demandées
 * (jusqu'à MIN_ROWS), puis on retire des concurrents de repère. `null` si rien ne passe :
 * l'utilisateur est refusé avant tout appel payant.
 */
export function estimateProfile(
  selectedCompetitors: number,
  plan: PlanKey,
  remainingBudgetUsd: number,
  knownBenchmark = 0,
): ProfileEstimate | null {
  const base = PROFILE_LIMITS[plan];
  const maxBench = Math.min(base.benchmarkCompetitors, selectedCompetitors);
  for (let bench = maxBench; bench >= 1; bench--) {
    let rows = Math.max(base.keywords, base.referringDomains, base.backlinksSample);
    for (;;) {
      const limits: ProfileLimits = {
        keywords: Math.min(base.keywords, rows),
        referringDomains: Math.min(base.referringDomains, rows),
        backlinksSample: Math.min(base.backlinksSample, rows),
        benchmarkCompetitors: bench,
        onpagePages: base.onpagePages,
      };
      const { total, ...breakdown } = costOf(limits, knownBenchmark);
      if (total <= remainingBudgetUsd + 1e-9) return { limits, totalUsd: total, breakdown };
      if (rows <= MIN_ROWS) break;
      rows = Math.max(MIN_ROWS, Math.floor(rows / 2));
    }
  }
  return null;
}
