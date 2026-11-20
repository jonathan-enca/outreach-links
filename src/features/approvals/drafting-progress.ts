import type { QueueView } from "./service";

/** Ce qui se passe pour les messages d'une campagne, en quatre nombres (pur, testé). */
export interface DraftingProgress {
  /** Le bloc de progression s'affiche : une rédaction tourne, ou des cibles attendent leur message. */
  visible: boolean;
  /** Une rédaction est en cours (la page se met à jour toute seule). */
  running: boolean;
  /** Cibles validées sans message : en cours de rédaction, ou à rédiger si rien ne tourne. */
  toWrite: number;
  /** Messages écrits, qui attendent l'accord de la personne. */
  ready: number;
  /** Messages déjà approuvés. */
  approved: number;
  /** Part des messages déjà écrits (approuvés compris), de 0 à 100. */
  percent: number;
}

export function draftingProgress(
  view: Pick<QueueView, "missing" | "drafting" | "approved"> & { messages: readonly unknown[] },
): DraftingProgress {
  const running = view.drafting;
  const toWrite = view.missing;
  const ready = view.messages.length;
  const approved = view.approved;
  const total = toWrite + ready + approved;
  const percent = total > 0 ? Math.round(((ready + approved) / total) * 100) : 0;
  return {
    visible: running || toWrite > 0,
    running,
    toWrite,
    ready,
    approved,
    percent,
  };
}
