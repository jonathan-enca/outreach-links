import { AUDIT_BUDGET } from "@/features/audits/beta";
import { QUERY_LIMITS } from "@/features/queries/limits";
import { PRICING } from "@/lib/dataforseo/endpoints";

/**
 * Plafonds de la collecte de candidats (MT.3, docs/audit-v2.md phase 3 et section 6).
 * La collecte reçoit 55 % du budget cible d'un audit ; ce budget est réparti entre quatre phases dont
 * chacune est un plafond SOUPLE (la phase s'arrête, la suivante continue). Les plafonds durs
 * (audit, sécurité, jour) sont contrôlés avant chaque appel payant, en plus.
 */
export const COLLECTION_LIMITS = {
  /** Part du budget cible d'audit réservée à la collecte (docs/audit-v2.md section 6). */
  shareOfTarget: 0.55,
  /** Part de ce budget par phase (somme = 1) : le pire cas annoncé est donc le budget cible. */
  phaseShare: { intersection: 0.17, mentions: 0.16, serp: 0.36, content: 0.31 },
  intersection: {
    maxTargets: 20,
    /** Un domaine n'est candidat que s'il lie au moins 2 concurrents (« recoupement »). */
    minCompetitors: 2,
    rowsPerPage: 500,
    maxPages: 2,
    /** Une 2e page n'est demandée que si la 1re était pleine et a donné au moins ce nombre de recoupements. */
    secondPageMinHits: 10,
    /** Part des lignes demandées réellement renvoyées, pour le coût ATTENDU (le pire cas = 100 %). */
    typicalFill: 0.75,
  },
  serp: {
    depth: QUERY_LIMITS.serpDepth,
    maxQueries: QUERY_LIMITS.maxQueries,
  },
  /** Arrêt par rendement décroissant (mécanisme 2) : requêtes classées par rendement attendu. */
  yieldStop: {
    /** On ne s'arrête jamais avant d'avoir exécuté ce nombre de requêtes. */
    minQueries: 8,
    /** Fenêtre glissante de requêtes récentes. */
    window: 4,
    /** Seuil : moyenne de nouveaux domaines par requête sur la fenêtre. */
    minNewPerQuery: 3,
  },
  content: {
    rowsPerCall: 150,
    /** Types de pages (l'ordre = priorité), correspondant aux sites que personne ne sollicite. */
    pageTypes: ["blogs", "organization", "message-boards", "ecommerce"] as const,
    /** Mots-clés de l'utilisateur ajoutés au thème (objectif « mots-clés »), sur ces types seulement. */
    keywordPageTypes: ["blogs", "organization"] as const,
    maxKeywords: 2,
    typicalFill: 0.75,
    /** Pages dont le score de spam atteint ce seuil sont écartées (échelle 0-100 supposée). */
    spamMax: 50,
  },
  mentions: {
    maxVariants: 3,
    rowsPerCall: 100,
    maxSerpQueries: 3,
  },
} as const;

export type CollectionPhase = keyof typeof COLLECTION_LIMITS.phaseShare;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Budget cible de la collecte (USD) : 55 % du budget cible d'audit. */
export function collectionTargetUsd(auditTargetUsd: number = AUDIT_BUDGET.targetUsd): number {
  return r6(auditTargetUsd * COLLECTION_LIMITS.shareOfTarget);
}

/** Budget souple d'une phase (USD). */
export function phaseBudgetUsd(
  phase: CollectionPhase,
  auditTargetUsd: number = AUDIT_BUDGET.targetUsd,
): number {
  return r6(collectionTargetUsd(auditTargetUsd) * COLLECTION_LIMITS.phaseShare[phase]);
}

/** Coût d'un appel Content Analysis de `rows` lignes (USD). */
export function contentCallUsd(rows: number): number {
  return r6(PRICING.contentAnalysisPerRequest + rows * PRICING.contentAnalysisPerRow);
}

/** Coût d'une page de Domain Intersection de `rows` lignes (USD). */
export function intersectionPageUsd(rows: number): number {
  return r6(PRICING.backlinksPerRequest + rows * PRICING.backlinksPerRow);
}
