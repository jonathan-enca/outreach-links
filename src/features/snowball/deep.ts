import { SNOWBALL_LIMITS, snowballCostUsd } from "./limits";

/**
 * Boule de neige en profondeur (MQ.6). Niveau 1 = sites cités par les cibles du premier passage (MC.6d, déjà en
 * place). Niveaux 2 et 3 = sites cités par les cibles du niveau précédent. Chaque niveau reprend le même appel
 * « qui cite » que la collecte, donc le même coût annoncé et le même plafond par appel.
 *
 * Interrupteur : `SNOWBALL_DEEP_ENABLED=true`. Faux par défaut. Tant qu'il est faux, ou tant qu'il n'y a aucune
 * réponse réelle en base, rien n'est lancé (ni appel payant, ni lecture) : la fonction renvoie un blocage.
 */
export const DEEP_FLAG = "SNOWBALL_DEEP_ENABLED";

export const DEEP_LIMITS = {
  /** Niveau le plus profond. 1 = premier niveau (MC.6d), 2 et 3 = boule de neige en profondeur. */
  maxLevel: 3,
  /** Cibles relues à la main par niveau pour mesurer le rendement. */
  reviewSample: 20,
  /**
   * Rendement minimal (part des cibles relues jugées bonnes) pour continuer au niveau suivant.
   * [HYPOTHÈSE] : seuil de départ, à recaler sur les premières réponses réelles (MQ.7).
   */
  minYield: 0.25,
  /** Coût pire cas autorisé pour un niveau (USD). Au-dessus, le niveau ne se lance pas. */
  levelCapUsd: 0.25,
} as const;

/** Coût annoncé d'un niveau : même calcul que le niveau 1 (ressources max, pire cas et attendu). */
export function deepLevelCostUsd(): { expectedUsd: number; worstUsd: number } {
  return snowballCostUsd(SNOWBALL_LIMITS.maxResources);
}

/** Vrai seulement si l'interrupteur est explicitement mis à « true ». */
export function deepEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[DEEP_FLAG] === "true";
}

export type DeepBlock =
  | "desactive"
  | "niveau_hors_plage"
  | "pas_de_reponses"
  | "niveau_precedent_absent"
  | "rendement_non_mesure"
  | "rendement_insuffisant"
  | "cout_trop_eleve";

export interface DeepGateInput {
  level: number;
  enabled: boolean;
  /** Réponses réelles entrantes en base (0 tant qu'aucun envoi n'a reçu de réponse). */
  realReplies: number;
  /** Le niveau précédent a été lancé. */
  previousLevelDone: boolean;
  /** Rendement mesuré à la main sur le niveau précédent (null = pas encore relu). */
  previousYield: number | null;
}

/**
 * Décide si le niveau `level` peut être lancé (pur). L'ordre compte : d'abord l'interrupteur, puis le
 * garde-fou « pas d'amplification sans réponse réelle », puis la chaîne des niveaux, le rendement et le coût.
 */
export function deepGate(input: DeepGateInput): { ok: true } | { ok: false; reason: DeepBlock } {
  if (!input.enabled) return { ok: false, reason: "desactive" };
  if (!Number.isInteger(input.level) || input.level < 2 || input.level > DEEP_LIMITS.maxLevel) {
    return { ok: false, reason: "niveau_hors_plage" };
  }
  if (input.realReplies <= 0) return { ok: false, reason: "pas_de_reponses" };
  if (!input.previousLevelDone) return { ok: false, reason: "niveau_precedent_absent" };
  if (input.previousYield === null) return { ok: false, reason: "rendement_non_mesure" };
  if (input.previousYield < DEEP_LIMITS.minYield) {
    return { ok: false, reason: "rendement_insuffisant" };
  }
  if (deepLevelCostUsd().worstUsd > DEEP_LIMITS.levelCapUsd) {
    return { ok: false, reason: "cout_trop_eleve" };
  }
  return { ok: true };
}

/**
 * Échantillon relu à la main : `reviewSample` cibles réparties régulièrement sur la liste (pas les premières
 * seulement, qui sont souvent les mieux classées). Déterministe : même liste, même échantillon.
 */
export function reviewSample<T extends { domain: string }>(
  targets: readonly T[],
  n: number = DEEP_LIMITS.reviewSample,
): T[] {
  const sorted = [...targets].sort((a, b) => a.domain.localeCompare(b.domain));
  if (sorted.length <= n) return sorted;
  const step = sorted.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(sorted[Math.floor(i * step)]);
  return out;
}

export interface YieldMeasure {
  kept: number;
  sample: number;
  /** Part des cibles relues jugées bonnes ; null s'il n'y a rien à relire. */
  rate: number | null;
}

/** Rendement d'un niveau à partir des relectures (true = la cible est bonne, à envoyer). */
export function yieldOf(reviews: readonly boolean[]): YieldMeasure {
  const sample = reviews.length;
  const kept = reviews.filter(Boolean).length;
  return {
    kept,
    sample,
    rate: sample === 0 ? null : Math.round((kept / sample) * 1000) / 1000,
  };
}
