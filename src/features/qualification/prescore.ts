import type { PageRead } from "@/features/triage/page-reader";
import { QUALIFY_LIMITS } from "./limits";
import { pageCites, pageVerdict } from "./page";
import type { QualCandidate, QualContext } from "./types";

/**
 * MQ.3 : lecture gratuite AVANT le tri sur signaux. Une page lue (HTTP seul, aucun appel LLM) ajuste
 * le score provisoire : une page vivante qui cite des ressources ou une ressource comparable monte,
 * une page morte ou écartée par la lecture descend. Aucun candidat n'est écarté ici : le tri reste
 * un ordre de lecture, la décision reste celle de l'étage 3 et du LLM.
 *
 * Les coefficients (`QUALIFY_LIMITS.preread.weights`) ne sont PAS recalés sur des réponses réelles :
 * aucun envoi n'a encore eu lieu. Ils sont à recaler quand MQ.1 aura des réponses.
 */

export interface PrereadSignal {
  domain: string;
  /** Multiplicateur appliqué au score provisoire (1 = inchangé). */
  boost: number;
  /** La page est vivante et lisible (HTTP 200, pas de robots.txt qui l'interdit). */
  alive: boolean;
  /** Motif de l'étage 3 si la lecture écarte la page, sinon null. */
  reason: string | null;
  /** Sites extérieurs distincts cités dans le contenu. */
  cites: number;
  /** La ressource comparable qui a fait trouver la page est citée sur la page. */
  resourceFound: boolean;
}

export function prereadBoost(read: PageRead, c: QualCandidate, ctx: QualContext): PrereadSignal {
  const W = QUALIFY_LIMITS.preread.weights;
  const domain = c.domain;
  const alive = !read.blockedByRobots && !read.unreachable && read.status === 200;
  if (!alive) {
    return { domain, boost: W.dead, alive: false, reason: null, cites: 0, resourceFound: false };
  }
  const verdict = pageVerdict(read, c, ctx);
  const cited = pageCites(read, c);
  let boost = 1;
  if (verdict.reason !== null) boost *= W.excluded;
  if (cited.sites >= 2) boost *= W.cites;
  if (cited.resource?.found) boost *= W.resourceFound;
  return {
    domain,
    boost: Math.round(boost * 1000) / 1000,
    alive: true,
    reason: verdict.reason,
    cites: cited.sites,
    resourceFound: Boolean(cited.resource?.found),
  };
}

/** Score provisoire recalé par la lecture (arrondi au dixième, comme `provisionalScore`). */
export function rescored(score: number, boost: number): number {
  return Math.round(score * boost * 10) / 10;
}
