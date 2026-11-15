import type { SupabaseClient } from "@supabase/supabase-js";
import { BOT_TOKEN } from "@/features/deadlinks/hunt";
import { robotsFromResponse, type RobotsRules } from "@/features/deadlinks/robots";
import type { PageFetcher } from "@/features/sites/verify";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { judgeResponse, type CheckOutcome, type LinkRel, type PageCheck } from "./verify";

type Client = SupabaseClient<Database>;

/** Jalons de vérification, en jours après la déclaration du lien posé. */
export const MILESTONES = [7, 14, 30] as const;
/** Tentatives par jalon quand la page est injoignable, à 24 h d'écart. */
export const MAX_ATTEMPTS = 3;
const DAY_MS = 86_400_000;

export interface LinkCheckDeps {
  fetch: PageFetcher;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
  /** Plafond de pages lues par passage. */
  maxPerTick?: number;
  /** Délai minimal entre deux requêtes vers le même hôte. */
  hostDelayMs?: number;
}

interface LinkRow {
  id: string;
  workspace_id: string;
  source_url: string;
  target_url: string;
  declared_at: string;
  status: string;
  rel: string | null;
  checks_done: number;
  attempts: number;
  first_live_at: string | null;
  alert: string | null;
}

export type AlertKind = "disparu" | "devenu_nofollow" | "non_indexable";

export function nextCheckAt(declaredAt: string, checksDone: number): string | null {
  const day = MILESTONES[checksDone];
  return day === undefined
    ? null
    : new Date(new Date(declaredAt).getTime() + day * DAY_MS).toISOString();
}

/** Alerte déduite du résultat et de l'état précédent (fonction pure, testée seule). */
export function decideAlert(
  prev: { firstLiveAt: string | null; rel: string | null },
  check: PageCheck,
): AlertKind | null {
  if (check.outcome === "disparu") return prev.firstLiveAt ? "disparu" : null;
  if (check.outcome !== "live") return null;
  const rel = check.verdict.rel;
  if (rel && rel !== "dofollow" && prev.rel === "dofollow") return "devenu_nofollow";
  if (check.verdict.indexable === false) return "non_indexable";
  return null;
}

async function robotsFor(
  host: string,
  scheme: string,
  cache: Map<string, RobotsRules>,
  deps: LinkCheckDeps,
): Promise<RobotsRules> {
  const hit = cache.get(host);
  if (hit) return hit;
  const res = await deps.fetch(`${scheme}//${host}/robots.txt`);
  const rules = robotsFromResponse(res, BOT_TOKEN);
  cache.set(host, rules);
  return rules;
}

/**
 * Vérifie les liens dont la prochaine échéance est passée (J+7, J+14, J+30 après la déclaration).
 * Respecte robots.txt, espace les requêtes vers un même hôte et plafonne le volume. Une page
 * injoignable n'est jamais prise pour un lien disparu : nouvel essai à 24 h, 3 fois au plus.
 * Aucune requête payante.
 */
export async function runLinkChecks(
  db: Client,
  deps: LinkCheckDeps,
): Promise<{ checked: number; live: number; lost: number; unreachable: number }> {
  const now = deps.now();
  const max = deps.maxPerTick ?? 20;
  const delay = deps.hostDelayMs ?? 1000;
  const { data: due } = await db
    .from("links")
    .select(
      "id, workspace_id, source_url, target_url, declared_at, status, rel, checks_done, attempts, first_live_at, alert",
    )
    .lte("next_check_at", now.toISOString())
    .order("next_check_at", { ascending: true })
    .limit(max);
  const stats = { checked: 0, live: 0, lost: 0, unreachable: 0 };
  const robots = new Map<string, RobotsRules>();
  const lastHit = new Map<string, number>();

  for (const link of (due ?? []) as LinkRow[]) {
    const src = new URL(link.source_url);
    const wait = (lastHit.get(src.host) ?? 0) + delay - Date.now();
    if (wait > 0) await deps.sleep(wait);
    let check: PageCheck;
    const rules = await robotsFor(src.host, src.protocol, robots, deps);
    lastHit.set(src.host, Date.now());
    if (!rules.allowed(src.pathname + src.search)) {
      check = {
        outcome: "injoignable",
        httpStatus: null,
        verdict: judgeResponse(null, link.source_url, link.target_url).verdict,
        error: "robots_interdit",
      };
    } else {
      check = judgeResponse(await deps.fetch(link.source_url), link.source_url, link.target_url);
      lastHit.set(src.host, Date.now());
    }
    await record(db, link, check, now);
    stats.checked++;
    if (check.outcome === "live") stats.live++;
    else if (check.outcome === "disparu") stats.lost++;
    else stats.unreachable++;
  }
  return stats;
}

async function record(db: Client, link: LinkRow, check: PageCheck, now: Date): Promise<void> {
  const prevAlert = link.alert;
  const milestoneDay = MILESTONES[link.checks_done] ?? null;
  const v = check.verdict;
  const retry = check.outcome === "injoignable" && link.attempts + 1 < MAX_ATTEMPTS;
  // Étape terminée sauf nouvel essai : on passe au jalon suivant.
  const checksDone = retry ? link.checks_done : link.checks_done + 1;
  const attempts = retry ? link.attempts + 1 : 0;
  const alert = decideAlert({ firstLiveAt: link.first_live_at, rel: link.rel }, check);
  const nowIso = now.toISOString();

  await db.from("link_checks").insert({
    link_id: link.id,
    workspace_id: link.workspace_id,
    milestone_day: milestoneDay,
    checked_at: nowIso,
    http_status: check.httpStatus,
    found: v.found,
    rel: v.rel,
    contextual: v.contextual,
    indexable: v.indexable,
    exact_page: v.exactPage,
    anchor_found: v.anchor,
    outcome: check.outcome,
    error: check.error,
  });

  const patch: Database["public"]["Tables"]["links"]["Update"] = {
    status:
      check.outcome === "live" ? "live" : check.outcome === "disparu" ? "disparu" : "injoignable",
    http_status: check.httpStatus,
    last_error: check.error,
    last_checked_at: nowIso,
    checks_done: checksDone,
    attempts,
    next_check_at: retry
      ? new Date(now.getTime() + DAY_MS).toISOString()
      : nextCheckAt(link.declared_at, checksDone),
  };
  if (check.outcome !== "injoignable") {
    patch.rel = v.rel;
    patch.contextual = v.contextual;
    patch.indexable = v.indexable;
    patch.exact_page = v.exactPage;
    patch.anchor_found = v.anchor;
    // L'alerte suit le dernier constat ; une page injoignable ne l'efface ni ne la crée.
    patch.alert = alert;
    patch.alert_at = alert && alert !== prevAlert ? nowIso : alert ? undefined : null;
  }
  if (check.outcome === "live") {
    patch.lost_at = null;
    if (!link.first_live_at) patch.first_live_at = nowIso;
  } else if (check.outcome === "disparu" && link.first_live_at) {
    patch.lost_at = nowIso;
  }
  await db.from("links").update(patch).eq("id", link.id);

  if (alert && alert !== prevAlert) {
    logger.warn("lien : alerte", { link_id: link.id, alerte: alert });
    // Journal d'audit, au mieux : l'alerte elle-même est déjà portée par la ligne `links`.
    await db.from("events").insert({
      workspace_id: link.workspace_id,
      type: `link.${alert}`,
      payload: { link_id: link.id, source_url: link.source_url },
    });
  }
}

export type { CheckOutcome, LinkRel };
