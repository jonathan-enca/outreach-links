import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import type { FunnelStats } from "./funnel";
import { countStock, MORE_LIMITS } from "./reserve";

type Client = SupabaseClient<Database>;

export const AUTO_EVENT = "audit/qualification.auto.requested";

/**
 * Lecture de la réserve en arrière-plan (étape 1 du 17/11/2026) : après la première liste, l'analyse
 * lit seule les sites trouvés mais jamais lus, lot par lot (un lot = `MORE_LIMITS`, environ 80 pages
 * lues). Plafonds durs de l'arrière-plan, AJOUTÉS à ceux de l'analyse (jugement 0,40 USD pour la
 * première liste) : budget de jugement total de l'arrière-plan, durée, rendement.
 */
export const AUTO_LIMITS = {
  /**
   * Durée maximale de tout l'arrière-plan (depuis la fin de la première liste). MC.6f : 45 minutes (25
   * avant) pour lire TOUTE la réserve. Mesuré le 18/11 : un lot attend sa réponse 154 à 183 s (API par
   * lots, indépendante de la taille du lot) et lit environ 55 pages par minute ; un lot de MC.6f lit
   * jusqu'à 300 pages (5 min 30) puis attend 3 min, soit ~8,5 min pour 300 pages : 1 000 pages de réserve
   * demandent 3 à 4 lots, environ 30 minutes, avec de la marge pour les sites lents.
   */
  maxMs: 45 * 60_000,
  /**
   * Budget de jugement de l'arrière-plan (USD), au tarif des lots. MC.6f : le budget est celui de la
   * CAMPAGNE (`CAMPAIGN_JUDGE_USD`, 0,50 USD au total, décision de Jonathan du 18/11/2026) moins ce que la
   * première liste a dépensé ; ce plafond n'est qu'une borne haute de l'arrière-plan seul. Mesuré :
   * 0,0041 USD par requête de 5 cibles : 0,30 USD = environ 70 requêtes, 350 pages jugées.
   */
  budgetUsd: 0.3,
  /** Un lot « rapporte peu » s'il ajoute moins de cibles que cela (indicateur seulement : plus d'arrêt, MC.6f). */
  minAdded: 5,
  /** Sous ce reste de budget, plus de lot (un appel de jugement coûte jusqu'à environ 0,02 USD). */
  minLotBudgetUsd: 0.03,
  /** Sous ce reste de temps, plus de lot. */
  minLotMs: 60_000,
} as const;

/** Budget TOTAL de lecture et de jugement d'une campagne (première liste + arrière-plan), USD. */
export const CAMPAIGN_JUDGE_USD = 0.5;

/** Part du budget d'arrière-plan attendue dépensée (mesure du 18/11 : 0,054 USD dépensés, réserve épuisée, sur 0,07). */
export const AUTO_EXPECTED_SHARE = 0.8;

export type AutoStop = "reserve_epuisee" | "budget" | "rendement_faible" | "duree" | "erreur";

export interface AutoState {
  lots: number;
  /** Lots de suite qui ajoutent peu : mesuré et affiché, mais n'arrête plus rien (MC.6f). */
  lowStreak: number;
  /** Coût de l'arrière-plan seul. */
  costUsd: number;
  /** Coût de toute la qualification de la campagne (première liste + lots) ; absent = non contrôlé. */
  spentTotalUsd?: number;
  /** Le lot n'a lu aucune page : rien ne bougerait au lot suivant (garde contre une boucle sans fin). */
  noProgress?: boolean;
  startedAtMs: number;
  nowMs: number;
  stock: number;
}

export type AutoDecision =
  { continue: true; lotBudgetUsd: number; lotMaxMs: number } | { continue: false; stop: AutoStop };

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Faut-il lancer un lot de plus ? (pur ; l'ordre des arrêts est celui de l'écran). */
export function decideNext(s: AutoState): AutoDecision {
  if (s.stock <= 0) return { continue: false, stop: "reserve_epuisee" };
  // MC.6f : plus d'arrêt « rendement faible » tant que la réserve n'est pas vide. Un lot qui n'a rien lu
  // arrête la chaîne : le suivant ne lirait rien non plus.
  if (s.noProgress) return { continue: false, stop: "reserve_epuisee" };
  const budgetLeft = r6(
    Math.min(
      AUTO_LIMITS.budgetUsd - s.costUsd,
      s.spentTotalUsd === undefined ? Infinity : CAMPAIGN_JUDGE_USD - s.spentTotalUsd,
    ),
  );
  if (budgetLeft < AUTO_LIMITS.minLotBudgetUsd) return { continue: false, stop: "budget" };
  const timeLeft = AUTO_LIMITS.maxMs - (s.nowMs - s.startedAtMs);
  if (timeLeft < AUTO_LIMITS.minLotMs) return { continue: false, stop: "duree" };
  return {
    continue: true,
    lotBudgetUsd: Math.min(MORE_LIMITS.budgetUsd, budgetLeft),
    lotMaxMs: Math.min(MORE_LIMITS.maxReadMs, timeLeft),
  };
}

/** Identifiant d'événement d'un lot : le même lot rejoué ne crée jamais un second lot. */
export const autoEventId = (auditId: string, startedAt: string, lot: number) =>
  `qualification-auto-${auditId}-${Date.parse(startedAt)}-${lot}`;

/**
 * Lance l'arrière-plan : prend la place du « lot en cours » (un seul lot à la fois), remet les
 * compteurs à zéro. Renvoie le lot 1 à envoyer, ou null (rien à lire, déjà en cours, pas terminé).
 */
export async function startBackground(
  service: Client,
  auditId: string,
  now: Date = new Date(),
): Promise<{ lot: number; startedAt: string } | null> {
  const { data: run, error } = await service
    .from("qualification_runs")
    .select("id, status")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`startBackground : ${error.message}`);
  if (!run || run.status !== "termine") return null;
  const at = now.toISOString();
  if ((await countStock(service, run.id)) === 0) {
    await service
      .from("qualification_runs")
      .update({
        auto_status: "termine",
        auto_stop: "reserve_epuisee",
        auto_started_at: at,
        auto_lots: 0,
        auto_low_streak: 0,
        auto_added: 0,
        auto_cost_usd: 0,
      })
      .eq("id", run.id)
      .in("auto_status", ["aucun", "termine", "echoue"]);
    return null;
  }
  const { data, error: uErr } = await service
    .from("qualification_runs")
    .update({
      auto_status: "en_cours",
      auto_started_at: at,
      auto_lots: 0,
      auto_low_streak: 0,
      auto_added: 0,
      auto_cost_usd: 0,
      auto_stop: null,
      more_status: "demande",
      more_requested_at: at,
    })
    .eq("id", run.id)
    .in("auto_status", ["aucun", "termine", "echoue"])
    .in("more_status", ["aucun", "termine", "echoue"])
    .select("id");
  if (uErr) throw new Error(`startBackground : ${uErr.message}`);
  if (!data?.length) return null;
  return { lot: 1, startedAt: at };
}

export type AdvanceResult =
  { continue: true; lot: number; startedAt: string } | { continue: false; stop: AutoStop };

/**
 * Après un lot : met les compteurs à jour (une seule fois par lot : compare-and-set sur `auto_lots`,
 * un rejeu ne compte rien deux fois), décide de la suite, et soit réarme « lot demandé », soit termine.
 */
export async function advanceBackground(
  service: Client,
  run: { id: string; auditId: string },
  lot: number,
  stats: Pick<FunnelStats, "costUsd"> & { pagesRead?: number },
  added: number,
  now: Date = new Date(),
): Promise<AdvanceResult> {
  const read = async () => {
    const { data, error } = await service
      .from("qualification_runs")
      .select(
        "auto_status, auto_started_at, auto_lots, auto_low_streak, auto_added, auto_cost_usd, auto_stop, actual_cost_usd",
      )
      .eq("id", run.id)
      .maybeSingle();
    if (error || !data) throw new Error(`advanceBackground : ${error?.message ?? "introuvable"}`);
    return data;
  };
  const verdict = (row: Awaited<ReturnType<typeof read>>): AdvanceResult => {
    if (row.auto_status === "en_cours" && row.auto_started_at) {
      return { continue: true, lot: row.auto_lots + 1, startedAt: row.auto_started_at };
    }
    return { continue: false, stop: (row.auto_stop as AutoStop | null) ?? "erreur" };
  };
  const row = await read();
  // Lot déjà compté (rejeu) ou chaîne déjà terminée : on renvoie la décision enregistrée.
  if (row.auto_status !== "en_cours" || row.auto_lots >= lot || !row.auto_started_at)
    return verdict(row);
  const costUsd = r6(Number(row.auto_cost_usd) + stats.costUsd);
  const lowStreak = added < AUTO_LIMITS.minAdded ? row.auto_low_streak + 1 : 0;
  const decision = decideNext({
    lots: lot,
    lowStreak,
    costUsd,
    startedAtMs: Date.parse(row.auto_started_at),
    nowMs: now.getTime(),
    stock: await countStock(service, run.id),
    // `actual_cost_usd` cumule déjà ce lot (finalizeMore tourne avant).
    spentTotalUsd: Number(row.actual_cost_usd),
    noProgress: stats.pagesRead === 0,
  });
  const base = {
    auto_lots: lot,
    auto_low_streak: lowStreak,
    auto_added: row.auto_added + added,
    auto_cost_usd: costUsd,
  };
  const patch = decision.continue
    ? { ...base, more_status: "demande", more_requested_at: now.toISOString() }
    : { ...base, auto_status: "termine", auto_stop: decision.stop };
  const { data, error } = await service
    .from("qualification_runs")
    .update(patch)
    .eq("id", run.id)
    .eq("auto_status", "en_cours")
    .eq("auto_lots", lot - 1)
    .select("id");
  if (error) throw new Error(`advanceBackground : ${error.message}`);
  if (!data?.length) return verdict(await read());
  return decision.continue
    ? { continue: true, lot: lot + 1, startedAt: row.auto_started_at }
    : { continue: false, stop: decision.stop };
}

/** Marque la chaîne en échec (le lot en cours a échoué deux fois). */
export async function failBackground(service: Client, auditId: string): Promise<void> {
  const { error } = await service
    .from("qualification_runs")
    .update({ auto_status: "echoue", auto_stop: "erreur" })
    .eq("audit_id", auditId)
    .eq("auto_status", "en_cours");
  if (error) logger.error("arrière-plan : échec non enregistré", { auditId });
}
