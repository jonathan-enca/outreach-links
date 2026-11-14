import { auditBacklinks } from "./audit-backlinks";
import { auditDiscover } from "./audit-discover";
import { auditProfile } from "./audit-profile";
import { health } from "./health";

/** Toutes les fonctions Inngest de l'application (ajouter ici les nouvelles). */
export const functions = [health, auditDiscover, auditBacklinks, auditProfile];
