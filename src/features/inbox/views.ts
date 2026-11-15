import type { Category } from "@/features/classification/types";

/** Vues de l'inbox (CLAUDE.md 4.2, inspirées de MentionAgent). */
export const VIEWS = [
  "chaud",
  "tiede",
  "offres_payantes",
  "froid",
  "en_negociation",
  "gagne",
  "archive",
] as const;
export type InboxView = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<InboxView, string> = {
  chaud: "Chaud",
  tiede: "Tiède",
  offres_payantes: "Offres payantes",
  froid: "Froid",
  en_negociation: "En négociation",
  gagne: "Gagné",
  archive: "Archivé",
};

/** État manuel d'un fil (table `inbox_states`) : il l'emporte sur la catégorie. */
export type ThreadState = "en_negociation" | "gagne" | "archive";

const BY_CATEGORY: Record<Category, InboxView> = {
  accepte_lien_pose: "chaud",
  interesse_conditions: "chaud",
  question: "tiede",
  demande_echange: "tiede",
  redirection: "tiede",
  ambigu: "tiede",
  demande_paiement: "offres_payantes",
  refus_poli: "froid",
  reponse_automatique: "froid",
  rebond: "froid",
  desinscription: "froid",
  plainte_hostile: "froid",
};

/**
 * Vue d'un fil : l'état manuel gagne, sinon la catégorie validée par l'utilisateur, sinon celle du
 * classifieur.
 */
export function viewFor(
  category: Category,
  validatedCategory: Category | null,
  state: ThreadState | null,
): InboxView {
  if (state) return state;
  return BY_CATEGORY[validatedCategory ?? category];
}

export function isInboxView(v: unknown): v is InboxView {
  return typeof v === "string" && (VIEWS as readonly string[]).includes(v);
}
