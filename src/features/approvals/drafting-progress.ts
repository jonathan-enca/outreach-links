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

/** Nombre de cibles montrées dans la liste ; le reste part dans « et N de plus ». */
export const DRAFTING_LIST_SIZE = 10;

/** Une cible de la liste : son domaine et son état. */
export interface DraftingRow {
  key: string;
  domain: string;
  /** « en_cours » : rédaction en train de tourner. « a_rediger » : rien ne tourne, reste à rédiger. « pret » : message écrit. */
  state: "en_cours" | "a_rediger" | "pret";
}

export interface DraftingList {
  /** Toutes les cibles concernées (en attente et prêtes), pour le titre. */
  total: number;
  /** Les premières cibles à afficher : d'abord celles qui attendent, puis les prêtes. */
  rows: DraftingRow[];
  /** Cibles non affichées, à écrire comme « et N de plus ». */
  hidden: number;
}

/** Liste des cibles du bloc de progression (pur, testé). */
export function draftingList(
  view: { missingDomains: readonly string[]; messages: readonly { domain: string }[] },
  running: boolean,
  size: number = DRAFTING_LIST_SIZE,
): DraftingList {
  const waiting = view.missingDomains;
  const ready = view.messages.map((m) => m.domain);
  const waitingState = running ? "en_cours" : "a_rediger";
  const rows: DraftingRow[] = [
    ...waiting.slice(0, size).map((domain, i) => ({
      key: `attente-${i}`,
      domain,
      state: waitingState as DraftingRow["state"],
    })),
    ...ready
      .slice(0, size)
      .map((domain, i) => ({ key: `pret-${i}`, domain, state: "pret" as const })),
  ];
  const total = waiting.length + ready.length;
  return { total, rows, hidden: total - rows.length };
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
