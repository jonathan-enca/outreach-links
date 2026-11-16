import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { metrics } from "./eval";
import { EVAL_CONTEXT, QUAL_EVAL_CASES, evalCandidate, evalPage } from "./eval-set";
import { QUALIFY_LIMITS } from "./limits";
import { judgeBatch } from "./llm";
import { snapshotOf } from "./page";
import { judgementExclusion } from "./score";

/**
 * Évaluation RÉELLE du LLM de qualification sur les cas du jeu annoté que les règles ne tranchent pas
 * (27 cas, 6 appels, plafond 0,03 USD). Mesure précision et rappel de « garder », la justesse du type
 * de site et de la détection des vendeurs de liens. À lancer avant et après tout changement de prompt :
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:qualify-eval
 */
const live = process.env.QUALIFY_LIVE_EVAL === "1";

describe.skipIf(!live)("qualification LLM : jeu d'évaluation réel", () => {
  it("précision >= 0,9 et rappel >= 0,8 sur « garder »", async () => {
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const llm = createLlmClient({
      costClient: fakeSupabase({ cost_ledger: [] }).client,
      provider,
      model: process.env.LLM_MODEL ?? DEFAULT_MODELS[provider],
      auth:
        provider === "anthropic"
          ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
          : process.env.OPENAI_API_KEY
            ? { apiKey: process.env.OPENAI_API_KEY }
            : "proxy",
      budgetUsd: 0.03,
    });
    const cases = QUAL_EVAL_CASES.filter((c) => !c.byRules);
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let typeOk = 0;
    let sTp = 0;
    let sFp = 0;
    let sFn = 0;
    const lines: string[] = [];
    for (let i = 0; i < cases.length; i += QUALIFY_LIMITS.batchSize) {
      const batch = cases.slice(i, i + QUALIFY_LIMITS.batchSize);
      const items = batch.map((c, k) => ({
        id: `c${k + 1}`,
        candidate: evalCandidate(c),
        page: snapshotOf(evalPage(`https://${c.candidate.domain}/`, c.home ?? c.page)),
      }));
      const { judgements } = await judgeBatch(llm, items, EVAL_CONTEXT, {
        workspaceId: null,
        auditId: null,
      });
      batch.forEach((c, k) => {
        const j = judgements.get(`c${k + 1}`);
        const kept = !!j && judgementExclusion(j) === null;
        if (kept && c.keep) tp++;
        else if (kept && !c.keep) fp++;
        else if (!kept && c.keep) fn++;
        if (j?.siteType === c.siteType) typeOk++;
        const sells = !!j?.sellsLinks;
        if (sells && c.sellsLinks) sTp++;
        else if (sells && !c.sellsLinks) sFp++;
        else if (!sells && c.sellsLinks) sFn++;
        lines.push(
          `${kept === c.keep ? "✔" : "✘"} ${c.id} ${c.candidate.domain} attendu=${c.keep ? "garder" : c.reason} obtenu=${j ? (judgementExclusion(j)?.reason ?? "garder") : "aucun"} type=${j?.siteType}/${c.siteType} fit=${j?.fit} hook=${j?.hook ? "oui" : "non"}`,
        );
      });
    }
    const keep = metrics(tp, fp, fn);
    const sellers = metrics(sTp, sFp, sFn);
    console.log(lines.join("\n"));
    console.log(
      `garder : précision ${keep.precision.toFixed(2)}, rappel ${keep.recall.toFixed(2)} ; type de site ${typeOk}/${cases.length} ; vendeurs de liens : précision ${sellers.precision.toFixed(2)}, rappel ${sellers.recall.toFixed(2)} ; coût ${llm.spentUsd.toFixed(5)} USD`,
    );
    expect(keep.precision).toBeGreaterThanOrEqual(0.9);
    expect(keep.recall).toBeGreaterThanOrEqual(0.8);
  }, 300_000);
});
