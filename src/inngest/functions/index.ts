import { auditBacklinks } from "./audit-backlinks";
import { auditDiscover } from "./audit-discover";
import { auditProfile } from "./audit-profile";
import { health } from "./health";
import { publicAudit } from "./public-audit";

/** Toutes les fonctions Inngest de l'application (ajouter ici les nouvelles). */
export const functions = [health, auditDiscover, auditBacklinks, auditProfile, publicAudit];
