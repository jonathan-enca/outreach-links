import { runFreeStages } from "./free";
import { pageVerdict, readCandidate } from "./page";
import { evalCandidate, evalPage, type QualEvalCase } from "./eval-set";
import type { ExclusionReason, QualContext } from "./types";

export interface RuleOutcome {
  id: string;
  /** Motif d'exclusion rendu par les étages gratuits 1 à 3 ; null = passe au LLM. */
  got: ExclusionReason | null;
  expected: ExclusionReason | null;
}

export interface Metrics {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
}

export const metrics = (tp: number, fp: number, fn: number): Metrics => ({
  tp,
  fp,
  fn,
  precision: tp + fp === 0 ? 1 : tp / (tp + fp),
  recall: tp + fn === 0 ? 1 : tp / (tp + fn),
});

/**
 * Rejoue les étages gratuits (1 à 3) sur le jeu annoté, sans réseau : un faux lecteur sert la page de
 * chaque cas. Positif = « exclu par les règles ». Une exclusion à tort (une cible que les règles ne
 * devaient pas trancher) est un faux positif : c'est l'erreur la plus grave (cible perdue en silence).
 */
export async function evaluateRules(
  cases: readonly QualEvalCase[],
  ctx: QualContext,
): Promise<{ outcomes: RuleOutcome[]; exclusion: Metrics; reasonAccuracy: number }> {
  const byDomain = new Map(cases.map((c) => [c.candidate.domain, c]));
  const free = runFreeStages(cases.map(evalCandidate), ctx);
  const outcomes: RuleOutcome[] = [];
  for (const v of free) {
    const c = byDomain.get(v.candidate.domain)!;
    let got = v.reason;
    if (!got) {
      const reader = {
        read: async (url: string) =>
          evalPage(url, url === `https://${c.candidate.domain}/` ? (c.home ?? c.page) : c.page),
      };
      got = pageVerdict(await readCandidate(reader, v.candidate), v.candidate, ctx).reason;
    }
    outcomes.push({ id: c.id, got, expected: c.byRules ? (c.reason ?? null) : null });
  }
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let sameReason = 0;
  for (const o of outcomes) {
    if (o.got && o.expected) {
      tp++;
      if (o.got === o.expected) sameReason++;
    } else if (o.got && !o.expected) fp++;
    else if (!o.got && o.expected) fn++;
  }
  outcomes.sort((a, b) => a.id.localeCompare(b.id));
  return { outcomes, exclusion: metrics(tp, fp, fn), reasonAccuracy: tp ? sameReason / tp : 1 };
}
