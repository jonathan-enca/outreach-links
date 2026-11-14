import type { AnchorProfile } from "@/features/profile/compute";
import { brandOf } from "@/features/opportunities/generate";

export type PlanAnchorKind = "marque" | "url" | "descriptive" | "generique";

export interface AnchorSuggestion {
  kind: PlanAnchorKind;
  text: string;
}

/** Seuils [HYPOTHÈSE] : au-delà, on évite l'ancre descriptive (risque de sur-optimisation). */
export const DESCRIPTIVE_MAX_SHARE = 0.15;
export const BRAND_ENOUGH_SHARE = 0.6;
/** Sous cet échantillon, le profil d'ancres n'est pas fiable : ancre de marque, sans risque. */
export const MIN_PROFILE_SAMPLE = 5;

/**
 * Ancre suggérée selon le profil d'ancres EXISTANT du site (PLAN 2.3) :
 * - mention de marque et annuaire : toujours la marque ;
 * - profil absent, trop petit ou déjà sur-optimisé : marque (ou URL si la marque domine déjà) ;
 * - sinon ancre descriptive (mot-clé de la page cible) tant que les ancres « autres » restent
 *   rares dans le profil, pour ne pas la sur-représenter.
 */
export function suggestAnchor(input: {
  type: string;
  domain: string;
  keyword: string | null;
  profile: AnchorProfile | null;
}): AnchorSuggestion {
  const brand = brandOf(input.domain);
  const brandAnchor: AnchorSuggestion = { kind: "marque", text: brand };
  const urlAnchor: AnchorSuggestion = { kind: "url", text: input.domain };
  if (input.type === "mention_marque" || input.type === "annuaire") return brandAnchor;
  const p = input.profile;
  if (!p || p.sampleSize < MIN_PROFILE_SAMPLE || p.overOptimized) {
    return p && p.shares.marque >= BRAND_ENOUGH_SHARE ? urlAnchor : brandAnchor;
  }
  const kw = input.keyword?.trim();
  if (kw && p.shares.autre < DESCRIPTIVE_MAX_SHARE) return { kind: "descriptive", text: kw };
  return p.shares.marque >= BRAND_ENOUGH_SHARE ? urlAnchor : brandAnchor;
}

/**
 * Déplace `id` d'un cran dans la liste ordonnée (liste inchangée si impossible).
 */
export function moveId(ids: readonly string[], id: string, dir: "up" | "down"): string[] {
  const out = [...ids];
  const i = out.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}
