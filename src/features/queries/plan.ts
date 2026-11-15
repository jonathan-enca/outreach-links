import { estimateCost } from "@/lib/dataforseo/endpoints";
import { QUERY_LIMITS, queryBudgetUsd } from "./limits";
import type { PlannedQuery, RecipeQuery, Tactic } from "./schema";

/** Clé de normalisation : minuscules, sans accents, sans ponctuation, un seul espace. */
export function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const nicheKey = normalizeKey;
export const personaKey = (label: string) => normalizeKey(label).replace(/ /g, "");

/** Coût SERP d'une requête (top 30, tarif mesuré) : même grille que l'audit. */
export function perQueryUsd(depth: number = QUERY_LIMITS.serpDepth): number {
  return estimateCost("serpOrganicLive", { keyword: "x", depth });
}

export interface QueryPhaseEstimate {
  /** Nombre maximal de requêtes que le budget permet (borné par min/max). */
  maxQueries: number;
  perQueryUsd: number;
  /** Coût maximal annoncé (maxQueries × coût unitaire). */
  totalUsd: number;
  budgetUsd: number;
}

/**
 * Annonce avant lancement : combien de recherches d'éditeurs le budget permet et leur coût maximal.
 * Pur et gratuit. `auditTargetUsd` règle le budget (plafond d'audit plus haut = plus de requêtes).
 */
export function estimateQueryPhase(auditTargetUsd?: number): QueryPhaseEstimate {
  const budgetUsd = queryBudgetUsd(auditTargetUsd);
  const unit = perQueryUsd();
  const byBudget = Math.floor((budgetUsd + 1e-9) / unit);
  const maxQueries = Math.min(QUERY_LIMITS.maxQueries, Math.max(QUERY_LIMITS.minQueries, byBudget));
  return {
    maxQueries,
    perQueryUsd: unit,
    totalUsd: Math.round(maxQueries * unit * 1e6) / 1e6,
    budgetUsd,
  };
}

/** Nettoie une requête sortie du modèle ; null si elle est inutilisable. */
export function cleanQuery(raw: string, forbidden: readonly string[] = []): string | null {
  let q = raw
    .replace(/\b(?:site|inurl|intitle|intext|filetype|related|cache):\S*/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/["“”«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  q = q.replace(/^[-–—•*\d.)\s]+/, "").trim();
  const words = q.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 9 || q.length < 4 || q.length > 80) return null;
  const k = normalizeKey(q);
  // Jamais le nom de la marque dans une requête de découverte (c'est la tactique 3, à part).
  const squashed = k.replace(/ /g, "");
  if (forbidden.some((f) => f.length >= 3 && squashed.includes(f))) return null;
  return q;
}

export interface PersonaRecipe {
  /** Libellé de la persona dans le profil (pour l'affichage et la diversité). */
  label: string;
  queries: RecipeQuery[];
  origin: "cache" | "llm" | "secours";
}

const KEYWORD_TEMPLATES: Record<string, { tactic: Tactic; make: (kw: string) => string }[]> = {
  fr: [
    { tactic: "ressources", make: (kw) => `ressources ${kw}` },
    { tactic: "inconnus", make: (kw) => `blog ${kw}` },
  ],
  en: [
    { tactic: "ressources", make: (kw) => `${kw} resources` },
    { tactic: "inconnus", make: (kw) => `${kw} blog` },
  ],
};

const FALLBACK_TEMPLATES: Record<
  string,
  { tactic: "inconnus" | "ressources"; make: (t: string) => string }[]
> = {
  fr: [
    { tactic: "ressources", make: (t) => `ressources ${t}` },
    { tactic: "ressources", make: (t) => `liens utiles ${t}` },
    { tactic: "inconnus", make: (t) => `blog ${t}` },
    { tactic: "inconnus", make: (t) => `association ${t}` },
    { tactic: "inconnus", make: (t) => `forum ${t}` },
  ],
  en: [
    { tactic: "ressources", make: (t) => `${t} resources` },
    { tactic: "ressources", make: (t) => `useful links ${t}` },
    { tactic: "inconnus", make: (t) => `${t} blog` },
    { tactic: "inconnus", make: (t) => `${t} association` },
    { tactic: "inconnus", make: (t) => `${t} forum` },
  ],
};

/** Recette de secours sans LLM : requêtes génériques du thème (jamais mises en cache). */
export function fallbackRecipe(theme: string, language: string): PersonaRecipe {
  const tpl = FALLBACK_TEMPLATES[language] ?? FALLBACK_TEMPLATES.fr!;
  return {
    label: theme,
    origin: "secours",
    queries: tpl.map((x) => ({ q: x.make(theme), tactic: x.tactic, rating: 3 })),
  };
}

const TACTIC_WEIGHT: Record<Tactic, number> = { inconnus: 1, ressources: 0.9, mentions: 0.8 };

export interface BuildPlanInput {
  theme: string;
  language: string;
  domain: string;
  goal: "autorite_generale" | "mots_cles";
  targetKeywords: readonly string[];
  /** Variantes du nom (profil) : servent aux requêtes de marque et à écarter la marque des autres. */
  nameVariants: readonly string[];
  /** Recettes des personas, dans l'ordre du profil. */
  recipes: readonly PersonaRecipe[];
  /** Nombre maximal de requêtes (voir `estimateQueryPhase`). */
  maxQueries: number;
  perQueryUsd: number;
}

interface Candidate {
  q: string;
  tactic: Tactic;
  persona: string | null;
  target: "home" | "keyword";
  keyword: string | null;
  base: number;
  origin: PlannedQuery["origin"];
  reserved: boolean;
}

/** Requêtes de marque (tactique 3) : variantes du nom entre guillemets, hors du site lui-même. */
export function brandQueries(domain: string, variants: readonly string[]): string[] {
  const host = domain.replace(/^www\./, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const name = v.trim();
    if (name.length < 3 || name.includes(".") || name.includes("/")) continue;
    // « mega-coloring » et « Mega Coloring » sont la même écriture ; « megacoloring » en est une autre.
    const k = normalizeKey(name);
    if (k.length < 3 || seen.has(k)) continue;
    seen.add(k);
    out.push(`"${name}" -site:${host}`);
    if (out.length >= QUERY_LIMITS.maxMentionQueries) break;
  }
  return out;
}

/**
 * Univers de requêtes classé (pur, 0 USD). Les requêtes viennent des recettes de personas
 * (tactiques 1 et 2), des requêtes de marque (tactique 3) et, en objectif « mots-clés », de modèles
 * appliqués aux mots-clés retenus (promus car ce sont eux que l'utilisateur veut faire monter).
 * Le rang suit le rendement attendu (tactique × note × position de la persona), avec une pénalité
 * de diversité pour qu'une seule persona n'occupe pas tout le budget ; les requêtes de marque
 * garanties passent d'abord. On coupe au nombre de requêtes que le budget permet.
 */
export function buildQueryPlan(input: BuildPlanInput): PlannedQuery[] {
  const brandKeys = [...input.nameVariants, input.domain.replace(/^www\./, "").split(".")[0] ?? ""]
    .map((v) => normalizeKey(v).replace(/ /g, ""))
    .filter((v) => v.length >= 3);
  // Comparaison sur le texte compacté, pour attraper « mega coloring » comme « megacoloring ».
  const hasBrand = (q: string) => {
    const squashed = normalizeKey(q).replace(/ /g, "");
    return brandKeys.some((b) => squashed.includes(b));
  };

  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Omit<Candidate, "q"> & { q: string | null }) => {
    if (!c.q) return;
    const k = normalizeKey(c.q);
    if (seen.has(k)) return;
    seen.add(k);
    candidates.push({ ...c, q: c.q });
  };

  input.recipes.forEach((recipe, pi) => {
    const posFactor = Math.max(0.7, 1 - 0.06 * pi);
    for (const rq of recipe.queries) {
      const q = cleanQuery(rq.q);
      push({
        q: q && !hasBrand(q) ? q : null,
        tactic: rq.tactic,
        persona: recipe.label,
        target: "home",
        keyword: null,
        base: TACTIC_WEIGHT[rq.tactic] * (rq.rating / 5) * posFactor,
        origin: recipe.origin,
        reserved: false,
      });
    }
  });

  if (input.goal === "mots_cles") {
    const tpl = KEYWORD_TEMPLATES[input.language] ?? KEYWORD_TEMPLATES.fr!;
    for (const kw of input.targetKeywords) {
      for (const x of tpl) {
        // Promues (×1.15) : ce sont les mots-clés que l'utilisateur veut faire monter.
        push({
          q: cleanQuery(x.make(kw)),
          tactic: x.tactic,
          persona: null,
          target: "keyword",
          keyword: kw,
          base: TACTIC_WEIGHT[x.tactic] * 0.8 * 1.15,
          origin: "regle",
          reserved: false,
        });
      }
    }
  }

  const brand = brandQueries(input.domain, input.nameVariants);
  brand.forEach((q, i) =>
    push({
      q,
      tactic: "mentions",
      persona: null,
      target: "home",
      keyword: null,
      base: TACTIC_WEIGHT.mentions * 0.8 * Math.max(0.7, 1 - 0.1 * i),
      origin: "regle",
      reserved: i < QUERY_LIMITS.reservedMentions,
    }),
  );

  // Sélection gloutonne : garanties d'abord, puis meilleur score ajusté de la diversité par persona.
  const chosen: Candidate[] = [];
  const pool = [...candidates];
  const take = (c: Candidate) => {
    chosen.push(c);
    pool.splice(pool.indexOf(c), 1);
  };
  for (const c of candidates.filter((x) => x.reserved)) {
    if (chosen.length < input.maxQueries) take(c);
  }
  const perPersona = new Map<string, number>();
  const adjusted = (c: Candidate) =>
    c.base * QUERY_LIMITS.diversityDecay ** (perPersona.get(c.persona ?? c.keyword ?? "~") ?? 0);
  while (chosen.length < input.maxQueries && pool.length > 0) {
    pool.sort((a, b) => adjusted(b) - adjusted(a) || a.q.localeCompare(b.q));
    const best = pool[0]!;
    const key = best.persona ?? best.keyword ?? "~";
    perPersona.set(key, (perPersona.get(key) ?? 0) + 1);
    take(best);
  }

  return chosen
    .sort((a, b) => b.base - a.base || a.q.localeCompare(b.q))
    .map((c, i) => ({
      q: c.q,
      tactic: c.tactic,
      persona: c.persona,
      target: c.target,
      keyword: c.keyword,
      score: Math.round(c.base * 1e4) / 1e4,
      rank: i + 1,
      estUsd: input.perQueryUsd,
      origin: c.origin,
    }));
}
