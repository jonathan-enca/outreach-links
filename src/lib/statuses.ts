import type { BadgeTone } from "@/components/ui/badge";
import { t } from "@/lib/messages";

/**
 * Système de statuts unique (CLAUDE.md 4.2). Deux familles partagent le même composant :
 * le cycle de vie d'un prospect et les vues de l'inbox classé.
 */
export const STATUS_KEYS = [
  "brouillon",
  "valide",
  "envoye",
  "relance",
  "termine_sans_reponse",
  "repondu",
  "lien_pose",
  "refuse",
  "ne_pas_contacter",
  "chaud",
  "tiede",
  "offre_payante",
  "froid",
  "en_negociation",
  "gagne",
  "archive",
] as const;

export type StatusKey = (typeof STATUS_KEYS)[number];

export const STATUS_TONES: Record<StatusKey, BadgeTone> = {
  brouillon: "neutral",
  valide: "info",
  envoye: "info",
  relance: "warning",
  termine_sans_reponse: "neutral",
  repondu: "accent",
  lien_pose: "success",
  refuse: "danger",
  ne_pas_contacter: "danger",
  chaud: "danger",
  tiede: "warning",
  offre_payante: "accent",
  froid: "neutral",
  en_negociation: "info",
  gagne: "success",
  archive: "neutral",
};

export function statusLabel(key: StatusKey): string {
  return t.status[key];
}
