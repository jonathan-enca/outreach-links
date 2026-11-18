import { AUDIT_BUDGET } from "@/features/audits/beta";
import { normalizeKey } from "@/features/queries/plan";
import type { PlannedQuery } from "@/features/queries/schema";
import { estimateCost, type ContentPageType } from "@/lib/dataforseo";
import {
  citationsCallUsd,
  COLLECTION_LIMITS,
  collectionTargetUsd,
  contentCallUsd,
  deadPagesCallUsd,
  intersectionPageUsd,
  phaseBudgetUsd,
  type CollectionPhase,
} from "./limits";
import { RESOURCE_PICK_LIMITS } from "./resource-judge";
import { planResources, type PlannedResources } from "./resources";
import {
  brandMentionPlan,
  deadPagesSkipReason,
  queryHasBrand,
  type CompetitorFacts,
  type Skipped,
} from "./worth";

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface ContentCall {
  keyword: string;
  pageType: ContentPageType;
}

/** Plan de collecte figé à la confirmation : le coût annoncé est celui qui sera engagé. */
export interface CollectionPlan {
  /** Concurrents à recouper (domaines, au plus 20) ; vide = recoupement sauté. */
  intersectionTargets: string[];
  /** Requêtes de découverte (hors marque), dans l'ordre de rendement. */
  serp: PlannedQuery[];
  /** Requêtes de marque SERP (tactique 3). */
  mentionSerp: PlannedQuery[];
  /** Expressions de marque à chercher dans Content Analysis, entre guillemets. */
  mentionKeywords: string[];
  content: ContentCall[];
  /** Concurrents dont on cherche les pages disparues qui reçoivent encore des liens (chantier D). */
  deadPages: string[];
  /** Ce qui n'est PAS lancé faute de chance de résultat, avec la raison (chantier C du 18/11/2026). */
  skipped: Skipped;
  /** Ressources comparables dont on cherche les pages qui les citent (MC.6a) ; places complétées par les recherches. */
  citations: PlannedResources;
}

export interface PlanInput {
  queries: readonly PlannedQuery[];
  /** Concurrents retenus, du plus au moins pertinent. */
  competitorDomains: readonly string[];
  theme: string;
  nameVariants: readonly string[];
  domain: string;
  goal: "autorite_generale" | "mots_cles";
  targetKeywords: readonly string[];
  /** Langue de la campagne (« fr ») : sert à écarter les concurrents d'une autre langue. */
  language?: string;
  /** Taille et adresse connues des concurrents ; sans elles, aucun concurrent n'est écarté. */
  competitors?: readonly CompetitorFacts[];
  /** Concurrents non retenus par l'audit (MC.6b) : proposés seulement au choix des ressources comparables. */
  otherCompetitors?: readonly CompetitorFacts[];
}

/** Écritures distinctes du nom (« Mega Coloring » et « mega-coloring » = une, « megacoloring » = une autre). */
export function distinctVariants(variants: readonly string[], domain: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const base = domain.replace(/^www\./, "").split(".")[0] ?? "";
  for (const v of [...variants, base]) {
    const text = v.trim();
    // Même règle que MT.2b : « Mega Coloring » et « mega-coloring » = une écriture, « megacoloring » une autre.
    const key = normalizeKey(text);
    if (key.replace(/ /g, "").length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out.slice(0, COLLECTION_LIMITS.mentions.maxVariants);
}

export function buildCollectionPlan(input: PlanInput): CollectionPlan {
  const ordered = [...input.queries].sort((a, b) => a.rank - b.rank);
  const serp = ordered
    .filter((q) => q.tactic !== "mentions")
    .slice(0, COLLECTION_LIMITS.serp.maxQueries);

  // Mentions de marque : seulement les écritures qui ne sont pas descriptives du thème.
  const themeWords = [input.theme, ...input.targetKeywords];
  const brand = brandMentionPlan(distinctVariants(input.nameVariants, input.domain), themeWords);
  const mentionSerp = ordered
    .filter((q) => q.tactic === "mentions" && queryHasBrand(q.q, brand.variants))
    .slice(0, COLLECTION_LIMITS.mentions.maxSerpQueries);

  const content: ContentCall[] = COLLECTION_LIMITS.content.pageTypes.map((pageType) => ({
    keyword: input.theme,
    pageType,
  }));
  if (input.goal === "mots_cles") {
    const extra = input.targetKeywords
      .filter((kw) => normalizeKey(kw) !== normalizeKey(input.theme))
      .slice(0, COLLECTION_LIMITS.content.maxKeywords);
    for (const kw of extra) {
      for (const pageType of COLLECTION_LIMITS.content.keywordPageTypes) {
        content.push({ keyword: kw, pageType });
      }
    }
  }

  // Liens morts : parmi les plus gros concurrents retenus, seuls ceux de la même langue et qui ne
  // sont pas des géants. Aucun remplaçant n'est pris : l'économie est le but.
  const facts = new Map((input.competitors ?? []).map((c) => [c.domain, c]));
  const top = [...input.competitorDomains].slice(0, COLLECTION_LIMITS.deadPages.maxCompetitors);
  const deadPages: string[] = [];
  const skippedDead: { domain: string; reason: string }[] = [];
  for (const domain of top) {
    const f = facts.get(domain);
    const reason = f && input.language ? deadPagesSkipReason(f, input.language) : null;
    if (reason) skippedDead.push({ domain, reason });
    else deadPages.push(domain);
  }

  return {
    intersectionTargets: [...input.competitorDomains].slice(
      0,
      COLLECTION_LIMITS.intersection.maxTargets,
    ),
    serp,
    mentionSerp: brand.variants.length > 0 ? mentionSerp : [],
    mentionKeywords: brand.variants.map((v) => `"${v}"`),
    content,
    deadPages,
    skipped: { deadPages: skippedDead, mentions: brand.skipReason },
    citations: planResources({
      competitorDomains: input.competitorDomains,
      competitors: input.competitors,
      otherCompetitors: input.otherCompetitors,
      language: input.language,
    }),
  };
}

export interface PhaseEstimate {
  calls: number;
  expectedUsd: number;
  /** Pire cas de la phase, borné par son budget souple. */
  worstUsd: number;
}

export interface CollectionEstimate {
  phases: Record<CollectionPhase, PhaseEstimate>;
  calls: number;
  /** Coût attendu : tous les appels prévus, lignes typiques, sans cache ni arrêt anticipé. */
  expectedUsd: number;
  /** Pire cas : lignes maximales et pages supplémentaires, chaque phase bornée par son budget. */
  worstUsd: number;
  /** Budget cible de la collecte (55 % du budget cible d'audit). */
  targetUsd: number;
}

/** Coût attendu et pire cas, annoncés AVANT le lancement. Aucun appel. */
export function estimateCollection(
  plan: CollectionPlan,
  auditTargetUsd: number = AUDIT_BUDGET.targetUsd,
): CollectionEstimate {
  const L = COLLECTION_LIMITS;
  const serpOne = estimateCost("serpOrganicLive", { keyword: "exemple", depth: L.serp.depth });

  const hasIntersection = plan.intersectionTargets.length >= 2;
  const iPage = intersectionPageUsd(L.intersection.rowsPerPage);
  const iTypical = intersectionPageUsd(
    Math.round(L.intersection.rowsPerPage * L.intersection.typicalFill),
  );
  const intersection: PhaseEstimate = hasIntersection
    ? { calls: 1, expectedUsd: iTypical, worstUsd: r6(iPage * L.intersection.maxPages) }
    : { calls: 0, expectedUsd: 0, worstUsd: 0 };

  const mCa = contentCallUsd(L.mentions.rowsPerCall);
  const mCount = plan.mentionKeywords.length + plan.mentionSerp.length;
  const mUsd = r6(plan.mentionKeywords.length * mCa + plan.mentionSerp.length * serpOne);
  const mentions: PhaseEstimate = { calls: mCount, expectedUsd: mUsd, worstUsd: mUsd };

  const serp: PhaseEstimate = {
    calls: plan.serp.length,
    expectedUsd: r6(plan.serp.length * serpOne),
    worstUsd: r6(plan.serp.length * serpOne),
  };

  const cTypical = contentCallUsd(Math.round(L.content.rowsPerCall * L.content.typicalFill));
  const cWorst = contentCallUsd(L.content.rowsPerCall);
  const content: PhaseEstimate = {
    calls: plan.content.length,
    expectedUsd: r6(plan.content.length * cTypical),
    worstUsd: r6(plan.content.length * cWorst),
  };

  const dRows = L.deadPages.rowsPerCall;
  const deadPages: PhaseEstimate = {
    calls: plan.deadPages.length,
    expectedUsd: r6(
      plan.deadPages.length * deadPagesCallUsd(Math.round(dRows * L.deadPages.typicalFill)),
    ),
    worstUsd: r6(plan.deadPages.length * deadPagesCallUsd(dRows)),
  };

  // Citations (MC.6a) : toutes les places sont annoncées (une place libre des concurrents est prise par
  // une ressource trouvée par les recherches) ; le coût attendu tient compte d'un remplissage partiel.
  const cRows = L.citations.rowsPerCall;
  const cites = plan.citations;
  const citations: PhaseEstimate = {
    calls: cites.max,
    // + le choix des ressources par le modèle (un appel court, coût réservé).
    expectedUsd: r6(
      cites.max * citationsCallUsd(Math.round(cRows * L.citations.typicalFill)) +
        RESOURCE_PICK_LIMITS.reservedUsd,
    ),
    worstUsd: r6(cites.max * citationsCallUsd(cRows) + RESOURCE_PICK_LIMITS.reservedUsd),
  };

  const phases = { intersection, mentions, morts: deadPages, serp, content, citations };
  let expected = 0;
  let worst = 0;
  let calls = 0;
  for (const key of Object.keys(phases) as CollectionPhase[]) {
    const p = phases[key];
    const budget = phaseBudgetUsd(key, auditTargetUsd);
    // Un plafond souple de phase borne aussi le coût attendu et le pire cas annoncés.
    p.expectedUsd = Math.min(p.expectedUsd, budget);
    p.worstUsd = Math.min(p.worstUsd, budget);
    expected += p.expectedUsd;
    worst += p.worstUsd;
    calls += p.calls;
  }
  return {
    phases,
    calls,
    expectedUsd: r6(expected),
    worstUsd: r6(worst),
    targetUsd: collectionTargetUsd(auditTargetUsd),
  };
}
