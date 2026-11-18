import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { COLLECTION_LIMITS } from "./limits";
import { RESOURCE_EVAL_SITES } from "./resource-eval-set";
import { pickResources } from "./resource-judge";

/**
 * Évaluation RÉELLE du choix des ressources comparables par le petit modèle, sur le jeu annoté (deux
 * thèmes, un appel par site, plafond 0,02 USD). Une ressource hors sujet coûte un appel de données
 * (0,03 USD) et remplit la file de pages sans rapport : la PRÉCISION compte le plus.
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:resources-eval
 */
const live = process.env.RESOURCES_LIVE_EVAL === "1";

describe.skipIf(!live)("choix des ressources : jeu d'évaluation réel", () => {
  it("précision >= 0,8 et rappel >= 0,6 sur chaque site", async () => {
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
      budgetUsd: 0.02,
    });
    for (const s of RESOURCE_EVAL_SITES) {
      const picked = await pickResources({
        llm,
        site: s.site,
        candidates: s.cases.map((x) => x.candidate),
        max: COLLECTION_LIMITS.citations.maxResources,
        language: s.language,
        workspaceId: null,
        auditId: null,
      });
      const chosen = new Set(picked?.resources ?? []);
      const good = s.cases.filter((x) => x.comparable).map((x) => x.candidate.domain);
      const tp = good.filter((d) => chosen.has(d)).length;
      const wrong = [...chosen].filter((d) => !good.includes(d));
      const precision = chosen.size ? tp / chosen.size : 0;
      const recall = tp / good.length;
      console.log(
        `${s.id} : choisis ${[...chosen].join(", ") || "aucun"} ; à tort : ${wrong.join(", ") || "aucun"} ; précision ${precision.toFixed(2)}, rappel ${recall.toFixed(2)}`,
      );
      expect(precision, s.id).toBeGreaterThanOrEqual(0.8);
      expect(recall, s.id).toBeGreaterThanOrEqual(0.6);
    }
    console.log(`coût ${llm.spentUsd.toFixed(5)} USD`);
  }, 120_000);
});
