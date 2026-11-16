import { describe, expect, it } from "vitest";
import { queryDeps } from "@/features/onboarding/deps";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureQueryUniverse } from "./service";

/**
 * Génération RÉELLE des requêtes par type d'éditeur pour un site (MU.0), par le même chemin que le job
 * de découverte : `ENSURE_SITE_ID=<uuid> pnpm demo:queries-ensure`. Ignorée par défaut. Un appel LLM
 * court au plus (plafond 0,02 USD), journalisé dans `cost_ledger` ; aucun appel DataForSEO. Rejouable :
 * un univers à jour est réutilisé sans rien payer.
 */
describe.skipIf(process.env.QUERIES_ENSURE_LIVE !== "1")(
  "univers de requêtes : génération réelle",
  () => {
    it("écrit (ou retrouve) une ligne dans query_universes", { timeout: 120_000 }, async () => {
      const siteId = process.env.ENSURE_SITE_ID;
      if (!siteId) throw new Error("ENSURE_SITE_ID manquant");
      const service = createServiceClient();
      const out = await ensureQueryUniverse(service, { siteId, userId: null }, queryDeps);
      if (out.status === "impossible") throw new Error(`impossible : ${out.reason}`);
      console.log(
        JSON.stringify({
          status: out.status,
          queries: out.universe.queries.length,
          llmCostUsd: out.universe.llmCostUsd,
          recipes: out.universe.recipes,
          sample: out.universe.queries.slice(0, 6).map((q) => q.q),
        }),
      );
      const { count } = await service
        .from("query_universes")
        .select("id", { count: "exact", head: true })
        .eq("site_id", siteId);
      expect(count).toBeGreaterThan(0);
    });
  },
);
