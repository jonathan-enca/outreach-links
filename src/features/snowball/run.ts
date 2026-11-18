import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeCandidates } from "@/features/collection/normalize";
import {
  describeCandidates,
  pickResources,
  type PickedResources,
  type ResourceCandidate,
  type ResourcePickMode,
} from "@/features/collection/resource-judge";
import { runCitationsCall, type CitationsRun } from "@/features/collection/run";
import type { MergedCandidate, RawCandidate } from "@/features/collection/types";
import type { DataForSeoClient } from "@/lib/dataforseo";
import type { LlmClient } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { SNOWBALL_LIMITS, snowballCostUsd } from "./limits";
import { isTargetPage, publicCandidates, seedCandidates, type SeedSource } from "./seeds";

type Client = SupabaseClient<Database>;

export const SNOWBALL_PARALLEL = 3;

export type SnowballBy = "graines" | "repli" | "aucune";
export type SnowballStop = "sans_modele" | "aucune_ressource" | "plafond" | "termine";

/** Ce que la phase a fait, compté pour l'écran, le coût et la mesure. Sérialisable. */
export interface SnowballStats {
  by: SnowballBy;
  stop: SnowballStop;
  /** Pages du premier passage lues par la phase, dont cibles. */
  pagesSeen: number;
  targetPages: number;
  /** Sites proposés au modèle comme graines, puis comme ressources publiques (repli). */
  seedCandidates: number;
  publicCandidates: number;
  resources: string[];
  reasons: Record<string, string>;
  /** Appels « qui cite » faits, pages trouvées, domaines nouveaux. */
  calls: number;
  citingPages: number;
  newCandidates: number;
  costUsd: number;
  announcedUsd: { expectedUsd: number; worstUsd: number };
}

export interface SnowballDeps {
  dfs: Pick<DataForSeoClient, "backlinksBacklinks">;
  service: Client;
  llm: LlmClient | null;
  describe?: (c: readonly ResourceCandidate[]) => Promise<ResourceCandidate[]>;
}

export interface SnowballInput {
  run: CitationsRun;
  /** Pages du premier passage de qualification. */
  pages: readonly SeedSource[];
  /** Ressources déjà interrogées par la collecte. */
  used: readonly string[];
  /** Domaines déjà candidats : la phase n'ajoute que des domaines nouveaux. */
  known: ReadonlySet<string>;
  max?: number;
}

export interface SnowballOutcome {
  stats: SnowballStats;
  /** Candidats nouveaux, fusionnés par domaine (source « citation », la ressource dans `persona`). */
  candidates: MergedCandidate[];
}

/**
 * Boule de neige (MC.6d). Mesurée le 18/11/2026 (MC.6c) : à partir des sites que citent les cibles
 * confirmées, mega-coloring.com passe de 3 cibles sur 35 à 11 sur 34 ; les ressources choisies d'avance sont
 * des sites qui achètent leurs liens et ne donnent presque rien.
 *
 * 1. Graines : sites cités par les pages que le premier passage a retenues, jugés par le MÊME modèle que le
 *    choix des ressources (même offre que le site, pas un site qui vit de son référencement).
 * 2. Repli (aucune graine) : sites cités par les pages lues, jugés sur « service public ou gratuit ».
 * 3. Pour 6 ressources au plus, l'appel « qui cite cette ressource » de la collecte (coût annoncé, plafonné).
 * 4. Les pages obtenues, domaines nouveaux seulement, passent ensuite au même entonnoir que les autres,
 *    avec le pilotage par ressource (file « citation:<domaine> »).
 * Sans modèle, rien n'est fait : une graine ne se juge pas sans lui.
 */
export async function executeSnowball(
  deps: SnowballDeps,
  input: SnowballInput,
): Promise<SnowballOutcome> {
  const max = input.max ?? SNOWBALL_LIMITS.maxResources;
  const announced = snowballCostUsd(max);
  const stats: SnowballStats = {
    by: "aucune",
    stop: "termine",
    pagesSeen: input.pages.length,
    targetPages: 0,
    seedCandidates: 0,
    publicCandidates: 0,
    resources: [],
    reasons: {},
    calls: 0,
    citingPages: 0,
    newCandidates: 0,
    costUsd: 0,
    announcedUsd: announced,
  };
  const empty = (stop: SnowballStop): SnowballOutcome => ({
    stats: { ...stats, stop },
    candidates: [],
  });
  const ctx = input.run.ctx;
  const brief = ctx.site;
  if (!deps.llm || !brief) return empty("sans_modele");

  const pick = async (
    mode: ResourcePickMode,
    candidates: readonly ResourceCandidate[],
  ): Promise<PickedResources | null> => {
    if (candidates.length === 0) return null;
    const described = deps.describe
      ? await deps.describe(candidates).catch(() => [...candidates])
      : [...candidates];
    const out = await pickResources({
      llm: deps.llm,
      site: brief,
      candidates: described,
      max,
      language: ctx.language,
      workspaceId: input.run.workspaceId,
      auditId: input.run.auditId,
      mode,
    });
    if (out) stats.costUsd += out.costUsd;
    return out;
  };

  const seeds = seedCandidates(input.pages, ctx, input.used);
  stats.targetPages = input.pages.filter(isTargetPage).length;
  stats.seedCandidates = seeds.length;
  let picked = await pick("graines", seeds);
  if (picked && picked.resources.length >= SNOWBALL_LIMITS.minSeeds) {
    stats.by = "graines";
  } else {
    // Repli : aucune graine retenue (ou aucune cible) → services publics et gratuits cités par les pages lues.
    const pub = publicCandidates(input.pages, ctx, input.used);
    stats.publicCandidates = pub.length;
    picked = await pick("publiques", pub);
    if (picked && picked.resources.length > 0) stats.by = "repli";
  }
  if (!picked || picked.resources.length === 0) return empty("aucune_ressource");
  const resources = picked.resources.slice(0, max);
  stats.resources = resources;
  stats.reasons = picked.reasons;

  const raws: RawCandidate[] = [];
  const allResources = [...input.used, ...resources];
  for (let i = 0; i < resources.length; i += SNOWBALL_PARALLEL) {
    const lot = resources.slice(i, i + SNOWBALL_PARALLEL);
    const outcomes = await Promise.all(
      lot.map((resource, k) =>
        runCitationsCall(deps, input.run, resource, i + k, allResources).catch((e) => {
          logger.warn("boule de neige : appel impossible", {
            resource,
            error: (e as Error).message,
          });
          return null;
        }),
      ),
    );
    for (const o of outcomes) {
      if (!o) continue;
      stats.calls++;
      stats.costUsd += o.costUsd;
      if (o.blocked) stats.stop = "plafond";
      raws.push(...o.raws);
    }
    if (stats.stop === "plafond") break;
  }
  stats.citingPages = new Set(raws.map((r) => r.url ?? r.domain)).size;
  const candidates = mergeCandidates(raws).filter((c) => !input.known.has(c.domain));
  stats.newCandidates = candidates.length;
  stats.costUsd = Math.round(stats.costUsd * 1e6) / 1e6;
  return { stats, candidates };
}

export { describeCandidates };
