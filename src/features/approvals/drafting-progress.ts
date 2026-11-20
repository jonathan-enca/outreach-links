import type { QueueView } from "./service";

/**
 * Où en sont les messages, en trois étapes distinctes (maquette `docs/mockups/a-approuver-v2.html`,
 * validée le 20/11) : à rédiger, à approuver, approuvés. Chaque étape a son nombre ; aucune barre ne
 * les mélange (retour de Jonathan : l'ancienne barre confondait plusieurs choses). Pur, testé.
 */
export interface MessageSteps {
  /** Le bloc s'affiche : une rédaction tourne, ou au moins une étape n'est pas vide. */
  visible: boolean;
  /** Une rédaction est en cours (la page se met à jour toute seule). */
  running: boolean;
  /** Cibles choisies sans message : en cours de rédaction, ou à rédiger si rien ne tourne. */
  toWrite: number;
  /** Ce qui attend l'accord de la personne, par nature. */
  emails: number;
  forms: number;
  replies: number;
  toApprove: number;
  /** Messages déjà approuvés. */
  approved: number;
}

export function messageSteps(
  view: Pick<QueueView, "missing" | "drafting" | "approved"> & {
    messages: readonly unknown[];
    forms: readonly unknown[];
    replies: readonly unknown[];
  },
): MessageSteps {
  const emails = view.messages.length;
  const forms = view.forms.length;
  const replies = view.replies.length;
  const toApprove = emails + forms + replies;
  return {
    visible: view.drafting || view.missing + toApprove + view.approved > 0,
    running: view.drafting,
    toWrite: view.missing,
    emails,
    forms,
    replies,
    toApprove,
    approved: view.approved,
  };
}

/**
 * Avancement d'une rédaction en cours : messages écrits sur le nombre à écrire au départ. `start` est le
 * nombre de messages à rédiger au lancement, retenu par l'écran ; s'il n'est pas connu (page ouverte en
 * cours de route) ou n'a plus de sens, on ne montre pas de barre plutôt qu'un chiffre inventé.
 */
export function writingProgress(
  start: number | null,
  toWrite: number,
): { written: number; total: number; percent: number } | null {
  if (start === null || start <= 0 || toWrite > start) return null;
  const written = start - toWrite;
  return { written, total: start, percent: Math.round((written / start) * 100) };
}
