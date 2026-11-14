import { z } from "zod";
import { FREE_LIMITS } from "./config";

const nicheSchema = z.string().trim().min(2).max(60);

/**
 * Thème saisi par le visiteur (facultatif). `null` = saisie invalide ; chaîne vide = non renseigné.
 * Minuscules, espaces simplifiés : même normalisation que les requêtes.
 */
export function parseNiche(raw: string | undefined): string | null {
  if (!raw?.trim()) return "";
  const parsed = nicheSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Requêtes de secours d'un site neuf (aucun mot-clé classé), SANS LLM : le thème lui-même, puis
 * deux déclinaisons génériques. Simples et prévisibles, au prix d'une pertinence moyenne.
 */
export function nicheQueries(niche: string): string[] {
  const n = niche.trim().toLowerCase().replace(/\s+/g, " ");
  if (!n) return [];
  return [n, `${n} en ligne`, `${n} guide`].slice(0, FREE_LIMITS.queries);
}
