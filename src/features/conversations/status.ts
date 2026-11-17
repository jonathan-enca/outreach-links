import type { Category } from "@/features/classification/types";

/** Statut d'un fil tel qu'on l'affiche et le filtre dans « Conversations ». */
export const THREAD_STATUSES = [
  "a_traiter",
  "a_repondu",
  "relance",
  "envoye",
  "lien_obtenu",
  "refuse",
  "erreur",
] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

const REFUSALS: Category[] = ["refus_poli", "desinscription", "plainte_hostile"];

export interface ThreadFacts {
  /** Catégorie de la dernière réponse (validée par la personne si elle l'a corrigée). */
  category: Category | null;
  /** État manuel du fil (inbox_states). */
  state: "en_negociation" | "gagne" | "archive" | null;
  hasReply: boolean;
  bounced: boolean;
  followedUp: boolean;
  /** Une réponse proposée attend l'accord de la personne. */
  pendingDraft: boolean;
  /** Nous avons déjà répondu à leur dernière réponse. */
  answered: boolean;
  liveLink: boolean;
}

/**
 * Le statut d'un fil (pur, testé), du plus décisif au moins décisif : lien obtenu, refus, message revenu
 * en erreur, réponse qui attend la personne, réponse traitée, relancé, envoyé.
 */
export function threadStatus(f: ThreadFacts): ThreadStatus {
  if (f.liveLink || f.state === "gagne" || f.category === "accepte_lien_pose") return "lien_obtenu";
  if (f.category && REFUSALS.includes(f.category)) return "refuse";
  if (f.bounced && !f.hasReply) return "erreur";
  if (f.hasReply) {
    if (f.state === "archive") return "a_repondu";
    return f.pendingDraft || !f.answered ? "a_traiter" : "a_repondu";
  }
  return f.followedUp ? "relance" : "envoye";
}

/** Non lu : une réponse est arrivée après la dernière lecture du fil (ou il n'a jamais été ouvert). */
export function isUnread(lastReplyAt: string | null, readAt: string | null): boolean {
  if (!lastReplyAt) return false;
  return !readAt || Date.parse(lastReplyAt) > Date.parse(readAt);
}

/** Étiquette libre nettoyée : minuscules, espaces réduits, 30 caractères ; null si vide. */
export function cleanTag(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const tag = raw.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30).trim();
  return tag.length > 0 ? tag : null;
}
