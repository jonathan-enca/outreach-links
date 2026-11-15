import type { SupabaseClient } from "@supabase/supabase-js";
import { getLatestBrandProfile } from "@/features/brand/service";
import type { BrandProfile } from "@/features/brand/schema";
import type { LlmClient } from "@/lib/llm/client";
import type { Database, Json } from "@/lib/supabase/database.types";
import { generateRecipes } from "./generate";
import { RECIPE_VERSION } from "./limits";
import {
  buildQueryPlan,
  estimateQueryPhase,
  fallbackRecipe,
  nicheKey,
  normalizeKey,
  personaKey,
  type PersonaRecipe,
} from "./plan";
import {
  plannedQuerySchema,
  recipeQueriesSchema,
  type PlannedQuery,
  type RecipeQuery,
  type StoredQueryUniverse,
} from "./schema";

type Client = SupabaseClient<Database>;

export interface QueryDeps {
  /** Client LLM plafonné (un seul appel) ; null sans clé. */
  makeLlm: () => LlmClient | null;
  /** Client service_role : le cache des recettes est partagé entre clients (aucune policy client). */
  getServiceClient: () => Client;
}

/** Recettes déjà en cache pour une niche et une langue, par clé de persona. */
export async function readCachedRecipes(
  service: Client,
  niche: string,
  language: string,
  keys: readonly string[],
): Promise<Map<string, RecipeQuery[]>> {
  const out = new Map<string, RecipeQuery[]>();
  if (keys.length === 0) return out;
  const { data } = await service
    .from("query_recipes")
    .select("persona_key, queries")
    .eq("niche_key", niche)
    .eq("language", language)
    .eq("recipe_version", RECIPE_VERSION)
    .in("persona_key", [...keys]);
  for (const row of data ?? []) {
    const parsed = recipeQueriesSchema.safeParse(row.queries);
    if (parsed.success) out.set(row.persona_key, parsed.data); // une ligne illisible est ignorée
  }
  return out;
}

async function writeRecipes(
  service: Client,
  niche: string,
  language: string,
  entries: { key: string; label: string; queries: RecipeQuery[]; costUsd: number }[],
): Promise<void> {
  if (entries.length === 0) return;
  // Insertion seule : une recette déjà écrite (autre client, même instant) est gardée telle quelle.
  await service.from("query_recipes").upsert(
    entries.map((e) => ({
      niche_key: niche,
      language,
      persona_key: e.key,
      recipe_version: RECIPE_VERSION,
      persona_label: e.label,
      queries: e.queries as unknown as Json,
      cost_usd: e.costUsd,
    })),
    { onConflict: "niche_key,language,persona_key,recipe_version", ignoreDuplicates: true },
  );
}

export interface UniverseInput {
  profile: BrandProfile;
  theme: string;
  language: string;
  domain: string;
  goal: "autorite_generale" | "mots_cles";
  targetKeywords: readonly string[];
  workspaceId: string | null;
}

export interface BuiltUniverse {
  queries: PlannedQuery[];
  budgetUsd: number;
  estimatedUsd: number;
  llmCostUsd: number;
  recipes: { cache: number; generated: number; fallback: number };
}

/**
 * Construit l'univers de requêtes d'un site (MT.2b) : recettes en cache par niche, langue et persona ;
 * UN appel LLM court pour celles qui manquent, regroupées ; secours sans LLM si l'appel échoue ;
 * classement par rendement attendu et coupe au budget. Aucun appel DataForSEO, rien n'est exécuté.
 * Ne lève jamais.
 */
export async function buildUniverse(input: UniverseInput, deps: QueryDeps): Promise<BuiltUniverse> {
  const phase = estimateQueryPhase();
  const niche = nicheKey(input.theme);
  const personas = input.profile.personas;
  const keyOf = new Map(personas.map((p) => [p.label, personaKey(p.label)]));

  let service: Client | null = null;
  try {
    service = deps.getServiceClient();
  } catch {
    service = null; // sans cache, on génère quand même
  }
  let cached = new Map<string, RecipeQuery[]>();
  try {
    if (service)
      cached = await readCachedRecipes(service, niche, input.language, [...keyOf.values()]);
  } catch {
    cached = new Map();
  }

  const missing = personas.filter((p) => !cached.has(keyOf.get(p.label)!)).map((p) => p.label);
  let llm: ReturnType<QueryDeps["makeLlm"]> = null;
  try {
    llm = missing.length > 0 ? deps.makeLlm() : null;
  } catch {
    llm = null;
  }
  const brandKeys = [
    ...input.profile.name_variants,
    input.domain.replace(/^www\./, "").split(".")[0] ?? "",
  ]
    .map((v) => normalizeKey(v).replace(/ /g, ""))
    .filter((v) => v.length >= 3);
  const generated = await generateRecipes({
    req: {
      theme: input.theme,
      language: input.language,
      domain: input.domain,
      profile: input.profile,
      labels: missing,
    },
    brandKeys,
    llm,
    workspaceId: input.workspaceId,
  });

  if (generated && service) {
    try {
      const share = generated.costUsd / Math.max(1, generated.recipes.size);
      await writeRecipes(
        service,
        niche,
        input.language,
        [...generated.recipes].map(([label, queries]) => ({
          key: keyOf.get(label)!,
          label,
          queries,
          costUsd: share,
        })),
      );
    } catch {
      // Le cache est une optimisation : l'échec d'écriture ne bloque jamais l'univers.
    }
  }

  const counts = { cache: 0, generated: 0, fallback: 0 };
  const recipes: PersonaRecipe[] = [];
  for (const p of personas) {
    const fromCache = cached.get(keyOf.get(p.label)!);
    const fromLlm = generated?.recipes.get(p.label);
    if (fromCache) {
      recipes.push({ label: p.label, queries: fromCache, origin: "cache" });
      counts.cache++;
    } else if (fromLlm) {
      recipes.push({ label: p.label, queries: fromLlm, origin: "llm" });
      counts.generated++;
    }
  }
  if (recipes.length === 0) {
    // Aucune recette (pas de clé LLM, panne) : requêtes génériques du thème, jamais inventées.
    recipes.push(fallbackRecipe(input.theme, input.language));
    counts.fallback++;
  }

  const queries = buildQueryPlan({
    theme: input.theme,
    language: input.language,
    domain: input.domain,
    goal: input.goal,
    targetKeywords: input.targetKeywords,
    nameVariants: input.profile.name_variants,
    recipes,
    maxQueries: phase.maxQueries,
    perQueryUsd: phase.perQueryUsd,
  });
  const estimatedUsd = Math.round(queries.reduce((s, q) => s + q.estUsd, 0) * 1e6) / 1e6;
  return {
    queries,
    budgetUsd: phase.budgetUsd,
    estimatedUsd,
    llmCostUsd: generated?.costUsd ?? 0,
    recipes: counts,
  };
}

function toStored(row: {
  id: string;
  site_id: string;
  brand_profile_version: number | null;
  goal: string;
  budget_usd: number | string;
  est_cost_usd: number | string;
  llm_cost_usd: number | string;
  queries: Json;
  recipes: Json;
  created_at: string;
}): StoredQueryUniverse | null {
  const list = Array.isArray(row.queries) ? row.queries : [];
  const queries = list.flatMap((q) => {
    const p = plannedQuerySchema.safeParse(q);
    return p.success ? [p.data] : [];
  });
  if (queries.length === 0) return null; // une ligne illisible n'est jamais affichée de travers
  const r = (row.recipes ?? {}) as { cache?: number; generated?: number; fallback?: number };
  return {
    id: row.id,
    siteId: row.site_id,
    brandProfileVersion: row.brand_profile_version,
    goal: row.goal,
    budgetUsd: Number(row.budget_usd),
    estimatedUsd: Number(row.est_cost_usd),
    llmCostUsd: Number(row.llm_cost_usd),
    queries,
    recipes: { cache: r.cache ?? 0, generated: r.generated ?? 0, fallback: r.fallback ?? 0 },
    createdAt: row.created_at,
  };
}

const COLUMNS =
  "id, site_id, brand_profile_version, goal, budget_usd, est_cost_usd, llm_cost_usd, queries, recipes, created_at";

/** Dernier univers de requêtes d'un site (celui qui fait foi), ou null. */
export async function getLatestQueryUniverse(
  supabase: Client,
  siteId: string,
): Promise<StoredQueryUniverse | null> {
  const { data } = await supabase
    .from("query_universes")
    .select(COLUMNS)
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toStored(data) : null;
}

/**
 * Lit le site, construit l'univers et l'enregistre (une ligne par génération, jamais modifiée).
 * Renvoie null si le site n'a pas de profil de marque (rien n'est inventé) ou si l'écriture échoue.
 * Ne lève jamais : le lancement de l'audit ne dépend pas de cette étape.
 */
export async function buildAndStoreQueryUniverse(
  supabase: Client,
  input: { siteId: string; userId: string | null },
  deps: QueryDeps,
): Promise<StoredQueryUniverse | null> {
  try {
    const { data: site } = await supabase
      .from("sites")
      .select("id, workspace_id, domain, niche, language, goal, target_keywords")
      .eq("id", input.siteId)
      .maybeSingle();
    if (!site || !site.niche) return null;
    const stored = await getLatestBrandProfile(supabase, input.siteId);
    if (!stored) return null;
    const language = site.language === "en" ? "en" : "fr";
    const goal = site.goal === "mots_cles" ? "mots_cles" : "autorite_generale";
    const built = await buildUniverse(
      {
        profile: stored.profile,
        theme: site.niche,
        language,
        domain: site.domain,
        goal,
        targetKeywords: goal === "mots_cles" ? (site.target_keywords ?? []) : [],
        workspaceId: site.workspace_id,
      },
      deps,
    );
    const { data: row, error } = await supabase
      .from("query_universes")
      .insert({
        site_id: site.id,
        workspace_id: site.workspace_id,
        brand_profile_version: stored.version,
        goal,
        budget_usd: built.budgetUsd,
        est_cost_usd: built.estimatedUsd,
        llm_cost_usd: built.llmCostUsd,
        queries: built.queries as unknown as Json,
        recipes: built.recipes as unknown as Json,
        created_by: input.userId,
      })
      .select(COLUMNS)
      .maybeSingle();
    if (error || !row) return null;
    await supabase.from("events").insert({
      workspace_id: site.workspace_id,
      actor_id: input.userId,
      type: "query_universe.created",
      payload: {
        site_id: site.id,
        queries: built.queries.length,
        estimated_usd: built.estimatedUsd,
        llm_cost_usd: built.llmCostUsd,
        recipes: built.recipes,
        goal,
      },
    });
    return toStored(row);
  } catch {
    return null;
  }
}
