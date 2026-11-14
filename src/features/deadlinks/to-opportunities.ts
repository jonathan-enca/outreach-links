import { hostOf, isExcludedDomain, isOwnDomain } from "@/features/audits/excluded-domains";
import {
  pickTargetPage,
  priorityLabel,
  type Candidate,
  type PriorityLabel,
  type PriorityPage,
} from "@/features/opportunities/generate";
import { t } from "@/lib/messages";
import type { DeadLinkFinding } from "./hunt";

export interface DeadLinkOpportunity {
  domain: string;
  sourceUrl: string;
  brokenUrl: string;
  httpStatus: 404 | 410;
  checkedAt: string;
  rationale: string;
  targetPageUrl: string;
  priorityScore: number;
  priority: PriorityLabel;
  offer: string | null;
  originQuery: string | null;
}

/** Base : une page de concurrent morte est citée par un site qui y tenait (plus motivant). */
const BASE = { competitor_page: 85, resource_page: 78 } as const;

/**
 * Transforme les constats en opportunités « lien mort » : filtre (site, concurrents,
 * plateformes), un constat par domaine (le meilleur), page de remplacement du site associée.
 */
export function deadLinkOpportunities(
  findings: DeadLinkFinding[],
  opts: {
    siteDomain: string;
    competitorDomains: readonly string[];
    pages: PriorityPage[];
    homepage: string;
    offeredAsset: string | null;
  },
): DeadLinkOpportunity[] {
  const competitors = new Set(opts.competitorDomains.map(hostOf));
  const best = new Map<string, { f: DeadLinkFinding; score: number }>();
  for (const f of findings) {
    const domain = hostOf(f.sourceDomain);
    if (!domain || isOwnDomain(domain, opts.siteDomain)) continue;
    if (competitors.has(domain) || isExcludedDomain(domain)) continue;
    const score = BASE[f.kind];
    const cur = best.get(domain);
    if (!cur || score > cur.score) best.set(domain, { f: { ...f, sourceDomain: domain }, score });
  }
  const sorted = [...best.values()].sort(
    (a, b) => b.score - a.score || a.f.sourceDomain.localeCompare(b.f.sourceDomain),
  );
  const r = t.deadlinks.rationale;
  return sorted.map(({ f, score }, i) => {
    const cand: Candidate = {
      type: "page_ressources",
      domain: f.sourceDomain,
      url: f.brokenUrl,
      title: f.anchor,
      rationale: "",
      originQuery: null,
      rank: null,
    };
    const rationale =
      f.kind === "competitor_page"
        ? r.competitor_page
            .replace("{url}", f.brokenUrl)
            .replace("{status}", String(f.httpStatus))
            .replace("{competitor}", f.competitorDomain ?? "un concurrent")
        : r.resource_page.replace("{url}", f.brokenUrl).replace("{status}", String(f.httpStatus));
    return {
      domain: f.sourceDomain,
      sourceUrl: f.sourceUrl,
      brokenUrl: f.brokenUrl,
      httpStatus: f.httpStatus,
      checkedAt: f.checkedAt,
      rationale,
      targetPageUrl: pickTargetPage(cand, opts.pages, opts.homepage, i),
      priorityScore: score,
      priority: priorityLabel(score),
      offer: opts.offeredAsset?.trim() || null,
      originQuery: null,
    };
  });
}
