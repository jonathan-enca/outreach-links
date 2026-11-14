/** Résultat COMPLET d'un audit gratuit (colonne public_audits.result). Serveur seulement : le navigateur reçoit report.ts. */
export interface PublicAuditResult {
  version: 1;
  generatedAt: string;
  queries: string[];
  site: {
    domain: string;
    referringDomains: number | null;
    /** Vrai si la liste de domaines référents lue est tronquée (l'écart est alors approximatif). */
    referringDomainsPartial: boolean;
    rankedKeywords: number | null;
    pagesRanked: number;
    pagesTop10: number;
  };
  competitors: {
    domain: string;
    queriesCount: number;
    bestRank: number;
    referringDomains: number | null;
  }[];
  benchmarkMedian: number | null;
  pages: {
    url: string;
    avgPosition: number;
    bestPosition: number;
    volume: number;
    keywords: { keyword: string; position: number; volume: number }[];
    neededLow: number | null;
    neededHigh: number | null;
    neededEstimated: number | null;
  }[];
  targets: {
    domain: string;
    competitorsCount: number;
    competitors: string[];
    sampleUrl: string;
    dofollow: boolean | null;
  }[];
  /** Nombre total de domaines candidats après nettoyage (au-delà des cibles conservées). */
  targetsTotal: number;
  score: {
    value: number;
    band: "a_renforcer" | "correct" | "solide";
    linkRatio: number | null;
    visibility: number | null;
  } | null;
}

export type PublicAuditStatus = "en_attente" | "en_cours" | "termine" | "echoue";

export const PUBLIC_AUDIT_ERRORS = [
  "aucun_mot_cle",
  "aucun_concurrent",
  "plafond_audit",
  "erreur_fournisseur",
  "file_indisponible",
] as const;
export type PublicAuditErrorCode = (typeof PUBLIC_AUDIT_ERRORS)[number];
