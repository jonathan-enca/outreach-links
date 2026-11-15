/** Verdicts du tri d'une cible. `ok` est le seul qui laisse la cible passer à M3.2. */
export const VERDICTS = [
  "ok",
  "payant",
  "mort",
  "pirate",
  "hors_sujet",
  "compte_obligatoire",
  "concurrent_direct",
  "irrealiste",
  "non_verifiable",
] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Verdicts que le LLM peut rendre (les autres viennent des règles ou du réseau). */
export const LLM_VERDICTS = [
  "ok",
  "payant",
  "pirate",
  "hors_sujet",
  "compte_obligatoire",
  "concurrent_direct",
  "irrealiste",
] as const satisfies readonly Verdict[];

export type UrlOrigin = "plan" | "recherche" | "accueil";

/** Une cible du plan validé, telle que lue dans `link_plan_items`. */
export interface TriageItem {
  id: string;
  domain: string;
  type: string;
  sourceUrl: string | null;
  urlExact: boolean;
  targetPageUrl: string;
  expectedLinkType: string;
  offer: string | null;
  rationale: string;
  brokenUrl: string | null;
}

export interface TriageContext {
  siteDomain: string;
  niche: string | null;
  language: string;
  offeredAsset: string | null;
  /** Domaines des concurrents de l'audit (retenus ou non). */
  competitorDomains: ReadonlySet<string>;
}

export interface TriageResult {
  itemId: string;
  verdict: Verdict;
  reason: string;
  confidence: number | null;
  needsReview: boolean;
  source: "regles" | "llm";
  resolvedUrl: string | null;
  urlStatus: number | null;
  urlOrigin: UrlOrigin | null;
  hook: string | null;
  pageTitle: string | null;
  costUsd: number;
}
