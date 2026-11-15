import { FREE_LIMITS } from "./config";
import type { PublicAuditResult } from "./types";

/**
 * Projection du résultat pour le NAVIGATEUR. Le floutage se fait ICI, côté serveur :
 * sans email validé, les domaines des cibles et le détail des pages ne figurent pas dans
 * l'objet renvoyé (donc ni dans le HTML ni dans le flux RSC). Un test le vérifie.
 */
export type TargetView =
  | {
      locked: true;
      index: number;
      citedCompetitors: number;
      /** Indices qui ne révèlent pas le domaine : extension et type de lien (MA.7). */
      tld: string;
      dofollow: boolean | null;
    }
  | {
      locked: false;
      index: number;
      domain: string;
      citedCompetitors: number;
      competitors: string[];
      sampleUrl: string;
    };

export interface PublicReportView {
  domain: string;
  unlocked: boolean;
  score: { value: number; band: "a_renforcer" | "correct" | "solide" } | null;
  site: { referringDomains: number | null; rankedKeywords: number | null };
  /** Site sans page classée : afficher « non classé » plutôt qu'un score (MA.4). */
  newSite: boolean;
  benchmarkMedian: number | null;
  competitors: PublicAuditResult["competitors"];
  pages: {
    url: string;
    avgPosition: number;
    volume: number;
    /** Détail réservé au rapport complet (absent sans email). */
    detail?: {
      keywords: { keyword: string; position: number; volume: number }[];
      neededLow: number | null;
      neededHigh: number | null;
      neededEstimated: number | null;
    };
  }[];
  targets: TargetView[];
  /** Cibles supplémentaires non montrées ("+N de plus"). */
  moreTargets: number;
  /** Cibles montrées qui renvoient vers au moins 2 concurrents (les plus accessibles à convaincre). */
  sharedTargets: number;
  partialLinks: boolean;
}

export function projectReport(result: PublicAuditResult, unlocked: boolean): PublicReportView {
  const shown = result.targets.slice(0, FREE_LIMITS.targetsPreview);
  return {
    domain: result.site.domain,
    unlocked,
    score: result.score ? { value: result.score.value, band: result.score.band } : null,
    site: {
      referringDomains: result.site.referringDomains,
      rankedKeywords: result.site.rankedKeywords,
    },
    newSite: result.site.newSite === true,
    benchmarkMedian: result.benchmarkMedian,
    competitors: result.competitors,
    pages: result.pages.slice(0, FREE_LIMITS.pages).map((p) => ({
      url: p.url,
      avgPosition: p.avgPosition,
      volume: p.volume,
      ...(unlocked
        ? {
            detail: {
              keywords: p.keywords,
              neededLow: p.neededLow,
              neededHigh: p.neededHigh,
              neededEstimated: p.neededEstimated,
            },
          }
        : {}),
    })),
    targets: shown.map((t, i): TargetView =>
      unlocked
        ? {
            locked: false,
            index: i + 1,
            domain: t.domain,
            citedCompetitors: t.competitorsCount,
            competitors: t.competitors,
            sampleUrl: t.sampleUrl,
          }
        : {
            locked: true,
            index: i + 1,
            citedCompetitors: t.competitorsCount,
            tld: t.domain.slice(t.domain.lastIndexOf(".") + 1),
            dofollow: t.dofollow,
          },
    ),
    sharedTargets: shown.filter((t) => t.competitorsCount >= 2).length,
    moreTargets: Math.max(0, result.targetsTotal - shown.length),
    partialLinks: result.site.referringDomainsPartial,
  };
}
