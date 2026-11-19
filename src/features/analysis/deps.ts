import { productionFindDeps } from "@/features/findings/deps";
import { brandDeps, queryDeps } from "@/features/onboarding/deps";
import { productionQualDeps } from "@/features/qualification/deps";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { createServiceClient } from "@/lib/supabase/service";
import type { AnalysisRun } from "./orchestrate";
import type { AnalysisDeps } from "./run";

/**
 * Dépendances de PRODUCTION de l'analyse unique : client de service, DataForSEO (coûts journalisés),
 * LLM plafonnés, lecteur sûr. Les mêmes que celles des jobs par étape.
 */
export function productionAnalysisDeps(
  launchLinksState: (run: AnalysisRun) => Promise<void>,
  awaitLinksState?: (run: AnalysisRun) => Promise<void>,
): AnalysisDeps {
  return {
    service: createServiceClient,
    dfs: () => createDataForSeoClientFromEnv(),
    brand: brandDeps,
    queries: queryDeps,
    qualDeps: (ctx, run) => productionQualDeps(ctx, run),
    findDeps: (run) => productionFindDeps(run),
    launchLinksState,
    awaitLinksState,
  };
}
