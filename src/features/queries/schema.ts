import { z } from "zod";

/**
 * Tactiques (section « Tactiques » de la home) :
 * - inconnus : sites que personne ne sollicite (blogs, associations, forums, collectivités...) ;
 * - ressources : pages ressources, listes de liens utiles ;
 * - mentions : mentions de la marque sans lien.
 */
export const TACTICS = ["inconnus", "ressources", "mentions"] as const;
export type Tactic = (typeof TACTICS)[number];

/** Tactiques que le modèle peut produire (les mentions de marque sont déterministes, sans LLM). */
export const RECIPE_TACTICS = ["inconnus", "ressources"] as const;
export type RecipeTactic = (typeof RECIPE_TACTICS)[number];

export const recipeQuerySchema = z.object({
  q: z.string().trim().min(3).max(90),
  tactic: z.enum(RECIPE_TACTICS),
  /** Rendement attendu estimé par le modèle : 1 (faible) à 5 (fort). */
  rating: z.number().int().min(1).max(5),
});
export type RecipeQuery = z.infer<typeof recipeQuerySchema>;

/** Sortie structurée du modèle : une recette par persona fournie. */
export const recipesOutputSchema = z.object({
  personas: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(120),
        queries: z.array(recipeQuerySchema).min(1).max(8),
      }),
    )
    .min(1)
    .max(8),
});
export type RecipesOutput = z.infer<typeof recipesOutputSchema>;

export const recipeQueriesSchema = z.array(recipeQuerySchema).min(1).max(8);

export type QueryTarget = "home" | "keyword";

/** Une requête de l'univers, prête pour la collecte (MT.3). */
export const plannedQuerySchema = z.object({
  q: z.string().min(2).max(160),
  tactic: z.enum(TACTICS),
  /** Persona d'origine (libellé du profil), null pour les requêtes de marque et de mots-clés. */
  persona: z.string().nullable(),
  /** Page à faire citer : l'accueil (autorité générale) ou la page du mot-clé retenu. */
  target: z.enum(["home", "keyword"]),
  keyword: z.string().nullable(),
  /** Rendement attendu (0 à 1), qui fixe le rang. */
  score: z.number().min(0).max(2),
  rank: z.number().int().min(1),
  /** Coût SERP estimé de cette requête (USD). */
  estUsd: z.number().min(0),
  /** recette en cache, générée à l'instant, secours sans LLM, ou règle fixe. */
  origin: z.enum([
    "cache",
    "llm",
    "secours",
    "regle",
    "search_console",
    // MQ.4 : requêtes de contenu sans lien, une piste propre par origine.
    "contenu_theme",
    "contenu_public",
    "contenu_search_console",
  ]),
  /** Chantier H : requête GARANTIE d'un type d'éditeur (jamais coupée par l'arrêt de rendement). */
  guaranteed: z.boolean().optional(),
  /** Catégorie générique du type d'éditeur visé (requêtes construites par gabarit). */
  category: z.string().max(30).optional(),
});
export type PlannedQuery = z.infer<typeof plannedQuerySchema>;

export interface StoredQueryUniverse {
  id: string;
  siteId: string;
  brandProfileVersion: number | null;
  goal: string;
  budgetUsd: number;
  estimatedUsd: number;
  llmCostUsd: number;
  queries: PlannedQuery[];
  recipes: { cache: number; generated: number; fallback: number };
  createdAt: string;
}
