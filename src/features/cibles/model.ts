import type { TargetCard } from "@/features/targets/types";

/** Les trois onglets de « Cibles », dans l'ordre d'affichage. */
export const CIBLE_TABS = ["decider", "retenues", "ecartees"] as const;
export type CibleTab = (typeof CIBLE_TABS)[number];

/** Onglet demandé dans l'adresse ; « À décider » par défaut (pur, testé). */
export function parseTab(value: string | null | undefined): CibleTab {
  return (CIBLE_TABS as readonly string[]).includes(value ?? "") ? (value as CibleTab) : "decider";
}

/** À décider : la liste courte moins les cibles déjà retenues (pur, testé). */
export function toDecide(cards: readonly TargetCard[]): TargetCard[] {
  return cards.filter((c) => !c.alreadyValidated);
}

/** Un message est prêt seulement une fois relu (URL 200, contrôles verts) ; sinon il reste à relire. */
export function messageStateKey(ready: boolean): "pret" | "aRelire" {
  return ready ? "pret" : "aRelire";
}
