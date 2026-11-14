import { estimateCost } from "@/lib/dataforseo/endpoints";

/**
 * Limites de l'audit gratuit public (CLAUDE.md 4.5) : version réduite, coût plafonné.
 * Tout est constant et exporté pour être testé ; les tarifs sont ceux de la grille
 * publique ([HYPOTHÈSE]) : le coût réel du cost_ledger fait foi.
 */
export const FREE_LIMITS = {
  /** Concurrents analysés. */
  competitors: 3,
  /** Requêtes SERP (saisies par le visiteur ou déduites de ses mots-clés). */
  queries: 3,
  serpDepth: 30,
  /** Mots-clés classés du site demandés à DataForSEO Labs. */
  rankedKeywords: 100,
  /** Domaines référents du site lus (borne : l'écart est approximatif au-delà). */
  ownReferringDomains: 100,
  /** Backlinks (un par domaine référent) lus par concurrent. */
  competitorBacklinks: 50,
  /** Pages prioritaires affichées. */
  pages: 3,
  /** Cibles montrées (floutées sans email). */
  targetsPreview: 10,
  /** Cibles conservées côté serveur (le reste n'est que compté). */
  targetsStored: 40,
  /** Plafond de coût d'UN audit gratuit (USD) : refus avant tout appel au-delà. */
  costCapUsd: 0.25,
  /** Exécutions démarrées au maximum par domaine et par période (un réessai après échec). */
  maxAttempts: 2,
} as const;

/** Limites de débit : limite et fenêtre en secondes. Clés : IP hachée, adresse hachée ou "all". */
export const RATE_LIMITS = {
  /** Toute soumission du formulaire d'audit (y compris les résultats en cache). */
  submit: { limit: 10, windowSeconds: 3600 },
  /** Nouveaux audits (coûteux) par visiteur et par jour. */
  createPerRequester: { limit: 3, windowSeconds: 86_400 },
  /** Nouveaux audits pour tous les visiteurs, par heure. */
  createGlobal: { limit: 40, windowSeconds: 3600 },
  /** Demandes de rapport (email) par visiteur. */
  email: { limit: 8, windowSeconds: 3600 },
  /** Demandes de rapport par adresse email et par jour. */
  emailAddress: { limit: 6, windowSeconds: 86_400 },
} as const;

export interface PublicAuditEstimate {
  totalUsd: number;
  breakdown: { label: string; usd: number }[];
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Coût estimé d'un audit gratuit complet (cas le plus cher : aucun cache). */
export function estimatePublicAudit(queryCount: number = FREE_LIMITS.queries): PublicAuditEstimate {
  const own = "exemple.fr";
  const breakdown = [
    {
      label: "labs.ranked_keywords",
      usd: estimateCost("labsRankedKeywords", { target: own, limit: FREE_LIMITS.rankedKeywords }),
    },
    {
      label: "serp.organic.live",
      usd:
        queryCount *
        estimateCost("serpOrganicLive", { keyword: "x", depth: FREE_LIMITS.serpDepth }),
    },
    {
      label: "backlinks.referring_domains",
      usd: estimateCost("backlinksReferringDomains", {
        target: own,
        limit: FREE_LIMITS.ownReferringDomains,
      }),
    },
    {
      label: "backlinks.summary",
      usd: FREE_LIMITS.competitors * estimateCost("backlinksSummary", { target: own }),
    },
    {
      label: "backlinks.backlinks",
      usd:
        FREE_LIMITS.competitors *
        estimateCost("backlinksBacklinks", { target: own, limit: FREE_LIMITS.competitorBacklinks }),
    },
  ].map((b) => ({ ...b, usd: r6(b.usd) }));
  return { totalUsd: r6(breakdown.reduce((s, b) => s + b.usd, 0)), breakdown };
}

/** Période d'unicité : mois civil UTC, ex. "2026-11". */
export function periodKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Début du jour UTC (fenêtre du coupe-circuit journalier). */
export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
