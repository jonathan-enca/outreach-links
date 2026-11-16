import { scanTarget, type FindDeps } from "./funnel";
import {
  FINDING_EVAL_CASES,
  FINDING_EVAL_CONTEXT,
  evalRead,
  type FindingEvalCase,
} from "./eval-set";
import type { FindingContext, PageScan } from "./types";

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

/** Faux dépendances : la page du cas, les statuts annotés (200 par défaut), aucun réseau. */
export function evalDeps(c: FindingEvalCase): FindDeps {
  return {
    readPage: async (url) => {
      const lang = c.destLangs?.[url];
      return lang ? { ...evalRead(c), url, lang } : evalRead(c);
    },
    checkStatuses: async (urls) => ({
      statuses: new Map(urls.map((u) => [u, c.statuses && u in c.statuses ? c.statuses[u]! : 200])),
      requests: urls.length,
    }),
    llm: () => null,
    guard: async () => undefined,
  };
}

export interface RuleEval {
  mention: Metrics;
  alreadyLinked: Metrics;
  dead: Metrics;
  candidates: Metrics;
  /** Cas où au moins une prédiction diffère de l'annotation (id et détail). */
  misses: string[];
}

/**
 * Rejoue les règles GRATUITES sur le jeu annoté (sans réseau, sans LLM) : détection d'un passage à
 * juger, lien déjà présent, liens morts 404/410, liens candidats à « inadapté » (rappel des positifs,
 * exclusion des liens qui ne doivent pas être jugés).
 */
export async function evaluateRules(
  cases: readonly FindingEvalCase[] = FINDING_EVAL_CASES,
  ctx: FindingContext = FINDING_EVAL_CONTEXT,
): Promise<RuleEval> {
  const m = { tp: 0, fp: 0, fn: 0 };
  const a = { tp: 0, fp: 0, fn: 0 };
  const d = { tp: 0, fp: 0, fn: 0 };
  const k = { tp: 0, fp: 0, fn: 0 };
  const misses: string[] = [];
  const bump = (acc: typeof m, got: boolean, want: boolean) => {
    if (got && want) acc.tp++;
    else if (got && !want) acc.fp++;
    else if (!got && want) acc.fn++;
  };
  for (const c of cases) {
    const scan: PageScan = await scanTarget(evalDeps(c), ctx, {
      targetId: c.id,
      domain: "exemple-cible.fr",
      url: `https://exemple-cible.fr/${c.id}`,
      rank: 1,
      resource: 0,
    });
    const gotMention = scan.mentions.length > 0 && !scan.alreadyLinked;
    bump(m, gotMention, c.expect.mention);
    bump(a, scan.alreadyLinked, c.expect.alreadyLinked);
    const deadUrls = new Set(scan.dead.map((x) => x.url));
    const candUrls = new Set(scan.linkCandidates.map((x) => x.url));
    const urls = new Set([...deadUrls, ...c.expect.dead]);
    for (const u of urls) bump(d, deadUrls.has(u), c.expect.dead.includes(u));
    // Seuls les liens annotés comptent : le pool est un sur-ensemble que le LLM filtre ensuite.
    const candUniverse = new Set([...c.expect.candidates, ...c.expect.notCandidates]);
    for (const u of candUniverse) bump(k, candUrls.has(u), c.expect.candidates.includes(u));
    const bad: string[] = [];
    if (gotMention !== c.expect.mention) bad.push(`mention=${gotMention}`);
    if (scan.alreadyLinked !== c.expect.alreadyLinked) bad.push(`déjà lié=${scan.alreadyLinked}`);
    if ([...deadUrls].sort().join() !== [...c.expect.dead].sort().join())
      bad.push(`morts=${[...deadUrls].join(",")}`);
    for (const u of candUniverse)
      if (candUrls.has(u) !== c.expect.candidates.includes(u))
        bad.push(`candidat ${u}=${candUrls.has(u)}`);
    if (bad.length) misses.push(`${c.id} : ${bad.join(" ; ")}`);
  }
  return {
    mention: metrics(m.tp, m.fp, m.fn),
    alreadyLinked: metrics(a.tp, a.fp, a.fn),
    dead: metrics(d.tp, d.fp, d.fn),
    candidates: metrics(k.tp, k.fp, k.fn),
    misses,
  };
}
