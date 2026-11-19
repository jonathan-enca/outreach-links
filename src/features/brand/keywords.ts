import { serpLocation } from "@/features/sites/market";
import type { DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import type { RankedKeywordsResult } from "@/lib/dataforseo/schemas";
import { logger } from "@/lib/logger";
import { PAGE_RANK, RANKED_KEYWORDS_LIMIT } from "./limits";
import type { RankedKeyword } from "./rank-pages";

/**
 * Paramètres de l'appel `ranked_keywords` d'un site : les 100 mots-clés les plus recherchés, sur le
 * marché de la campagne. UNE seule définition, partagée par l'onboarding (MC.7) et par l'état des lieux
 * de l'analyse : paramètres identiques = même clé de cache, le domaine n'est payé qu'une fois.
 */
export function rankedKeywordsParams(
  domain: string,
  market?: { country?: string | null; language?: string | null },
) {
  return {
    target: domain,
    limit: RANKED_KEYWORDS_LIMIT,
    order_by: ["keyword_data.keyword_info.search_volume,desc"],
    ...serpLocation(market?.country, market?.language),
  };
}

/** Mots-clés exploitables d'une réponse : ceux qui ont une page classée et une position. */
export function toRankedKeywords(result: RankedKeywordsResult | null | undefined): RankedKeyword[] {
  return (result?.items ?? []).flatMap((it) => {
    const el = it.ranked_serp_element?.serp_item;
    if (!el?.url || !el.rank_group) return [];
    return [
      {
        keyword: it.keyword_data.keyword,
        position: el.rank_group,
        volume: it.keyword_data.keyword_info?.search_volume ?? 0,
        url: el.url,
      },
    ];
  });
}

export interface KeywordsInput {
  domain: string;
  country?: string | null;
  language?: string | null;
  workspaceId: string | null;
  /** Analyse en cours, s'il y en a une : le coût lui est rattaché. À l'onboarding, aucun audit n'existe. */
  auditId?: string | null;
}

export interface KeywordsDeps {
  /** Client DataForSEO (coût journalisé dans `cost_ledger`, cache par domaine). */
  dfs: () => Pick<DataForSeoClient, "labsRankedKeywords">;
  /** Dépense de toute la plateforme sur 24 h (USD) et son plafond de sécurité. */
  dailySpendUsd: () => Promise<number>;
  dailyCapUsd: number;
}

/**
 * Mots-clés positionnés du site, pour classer ses pages dès l'onboarding. Ne lève JAMAIS et ne bloque
 * jamais : identifiants absents, plafond atteint, délai dépassé ou panne du fournisseur donnent une
 * liste vide, et l'appelant garde l'ancien tri par adresse. Un seul appel, plafonné.
 */
export async function loadRankedKeywords(
  deps: KeywordsDeps,
  input: KeywordsInput,
): Promise<RankedKeyword[]> {
  try {
    const params = rankedKeywordsParams(input.domain, input);
    const estimateUsd = estimateCost("labsRankedKeywords", params);
    if (estimateUsd > PAGE_RANK.maxCostUsd) return [];
    if ((await deps.dailySpendUsd()) + estimateUsd > deps.dailyCapUsd) {
      logger.warn("mots-clés du site : plafond quotidien atteint, tri par adresse", {
        domain: input.domain,
      });
      return [];
    }
    const out = await deps.dfs().labsRankedKeywords(params, {
      workspaceId: input.workspaceId,
      auditId: input.auditId ?? null,
    });
    return toRankedKeywords(out.result);
  } catch (e) {
    logger.warn("mots-clés du site non lus, tri par adresse", {
      domain: input.domain,
      error: (e as Error).message.slice(0, 200),
    });
    return [];
  }
}
