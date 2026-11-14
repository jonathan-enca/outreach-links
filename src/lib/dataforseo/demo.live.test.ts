import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { createDataForSeoClientFromEnv } from "./client";

/**
 * Appel RÉEL de démonstration (payant, ~0,006 USD) : ignoré par défaut, donc jamais en CI.
 * Lancer : pnpm demo:dataforseo (nécessite DATAFORSEO_LOGIN/PASSWORD ou DATAFORSEO_PROXY_AUTH=true,
 * NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY pour journaliser dans cost_ledger).
 * Écrit la réponse brute dans fixtures/serp-organic-live.live.json (à copier sur la fixture).
 */
describe.skipIf(process.env.DATAFORSEO_LIVE_DEMO !== "1")("démo réelle DataForSEO", () => {
  it("SERP FR « coloriage licorne » (top 30)", async () => {
    const client = createDataForSeoClientFromEnv({ budgetUsd: 1.5, maxCostPerCallUsd: 0.5 });
    const out = await client.serpOrganicLive({ keyword: "coloriage licorne" });
    console.log(
      JSON.stringify({
        estimatedCostUsd: out.estimatedCostUsd,
        actualCostUsd: out.actualCostUsd,
        items: out.result?.items_count,
        top3: out.result?.items?.slice(0, 3).map((i) => i.domain ?? i.type),
      }),
    );
    writeFileSync(
      path.join(__dirname, "fixtures", "serp-organic-live.live.json"),
      JSON.stringify(out.result, null, 2),
    );
  });
});
