/** Résultat de l'enquête sur le contact d'une cible (M3.2). */
export const CONTACT_STATUSES = [
  "email_verifie",
  "email_a_verifier",
  "email_invalide",
  "formulaire",
  "introuvable",
  "supprime",
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type Verification = "valide" | "invalide" | "risque" | "inconnu" | "non_verifie";
export type EmailSource = "page" | "finder";

/** Une cible jugée « ok » au tri (M3.1), prête pour la recherche de contact. */
export interface ContactItem {
  id: string;
  domain: string;
  /** URL réellement lue en HTTP 200 par le tri. */
  resolvedUrl: string;
}

export interface ContactResult {
  itemId: string;
  status: ContactStatus;
  email: string | null;
  emailSource: EmailSource | null;
  verification: Verification;
  verifier: string | null;
  contactUrl: string | null;
  formUrl: string | null;
  reason: string;
  /** Vrai seulement si l'email est vérifié valide (contrainte SQL identique). */
  sendable: boolean;
  /** Appels payants du finder / vérificateur (unités du fournisseur, pas des USD). */
  paidCalls: number;
}
