import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateBacklinks } from "@/features/backlinks/limits";
import { startBacklinks } from "@/features/backlinks/service";
import { estimateOpportunities } from "@/features/opportunities/limits";
import { startOpportunities } from "@/features/opportunities/service";
import { estimateProfile } from "@/features/profile/limits";
import { startProfile } from "@/features/profile/service";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { PLAN_LIMITS, type PlanKey } from "./plans";
import type { AuditActionState, SendEvent } from "./service";

type Client = SupabaseClient<Database>;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** MA.6 : coût de tout le parcours, annoncé une seule fois avant la confirmation. */
export interface ChainEstimate {
  discoveryUsd: number;
  backlinksUsd: number;
  profileUsd: number;
  opportunitiesUsd: number;
  totalUsd: number;
  /** Étapes que le plafond ne couvre pas : elles restent à lancer à la main (jamais payées en plus). */
  uncovered: ChainStage[];
}

export type ChainStage = "backlinks" | "profile" | "opportunities";

/**
 * Estimation du parcours complet, au pire cas (nombre maximal de concurrents du plan).
 * Mêmes fonctions d'estimation que chaque étape : le coût annoncé est celui qui sera
 * réellement figé à chaque étape, dans le même plafond d'audit (l'étape opportunités a
 * son plafond propre).
 */
export function estimateChain(input: {
  plan: PlanKey;
  discoveryUsd: number;
  capUsd: number;
  site: {
    domain: string;
    niche: string | null;
    priorityQueries: string[];
    offeredAsset: string | null;
  };
}): ChainEstimate {
  const { plan, discoveryUsd, capUsd, site } = input;
  const competitors = PLAN_LIMITS[plan].maxCompetitors;
  const uncovered: ChainStage[] = [];

  const backlinks = estimateBacklinks(competitors, plan, capUsd - discoveryUsd);
  if (!backlinks) uncovered.push("backlinks");
  const backlinksUsd = backlinks?.totalUsd ?? 0;

  const profile = backlinks
    ? estimateProfile(competitors, plan, capUsd - discoveryUsd - backlinksUsd, competitors)
    : null;
  if (!profile) uncovered.push("profile");
  const profileUsd = profile?.totalUsd ?? 0;

  const opportunities = estimateOpportunities(site, plan);
  if (!opportunities) uncovered.push("opportunities");
  const opportunitiesUsd = opportunities?.totalUsd ?? 0;

  return {
    discoveryUsd,
    backlinksUsd,
    profileUsd,
    opportunitiesUsd,
    totalUsd: r6(discoveryUsd + backlinksUsd + profileUsd + opportunitiesUsd),
    uncovered,
  };
}

const startable = (status: string) => status === "aucun" || status === "confirme";

/**
 * Lance l'étape suivante si l'audit est en parcours unique (auto_chain). Appelée à la fin de
 * chaque job. Sans session : l'utilisateur est celui qui a créé l'audit. S'arrête sur une
 * étape échouée, en cours ou refusée (plafond) : les boutons manuels de chaque étape restent
 * le recours. Idempotente (rejouable après une reprise Inngest).
 */
export async function advanceChain(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
): Promise<{ started: ChainStage | null; result?: AuditActionState }> {
  const { data: audit } = await service
    .from("audits")
    .select(
      "id, status, auto_chain, created_by, backlinks_status, profile_status, opportunities_status",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (!audit || !audit.auto_chain || audit.status !== "termine" || !audit.created_by) {
    return { started: null };
  }

  let stage: ChainStage | null = null;
  if (startable(audit.backlinks_status)) stage = "backlinks";
  else if (audit.backlinks_status === "termine" && startable(audit.profile_status)) {
    stage = "profile";
  } else if (audit.profile_status === "termine" && startable(audit.opportunities_status)) {
    stage = "opportunities";
  }
  if (!stage) return { started: null };

  const start = {
    backlinks: startBacklinks,
    profile: startProfile,
    opportunities: startOpportunities,
  }[stage];
  const result = await start(service, auditId, () => service, sendEvent, audit.created_by);
  if (result.status === "error") {
    logger.warn("enchaînement arrêté", { auditId, stage, message: result.message });
    return { started: null, result };
  }
  return { started: stage, result };
}
