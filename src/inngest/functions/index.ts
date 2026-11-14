import { auditDiscover } from "./audit-discover";
import { health } from "./health";

/** Toutes les fonctions Inngest de l'application (ajouter ici les nouvelles). */
export const functions = [health, auditDiscover];
