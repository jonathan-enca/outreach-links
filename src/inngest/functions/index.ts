import { auditBacklinks } from "./audit-backlinks";
import { auditDeadlinks } from "./audit-deadlinks";
import { auditDiscover } from "./audit-discover";
import { auditOpportunities } from "./audit-opportunities";
import { auditProfile } from "./audit-profile";
import { health } from "./health";
import { planTriage } from "./plan-triage";
import { publicAudit } from "./public-audit";

/** Toutes les fonctions Inngest de l'application (ajouter ici les nouvelles). */
export const functions = [
  health,
  auditDiscover,
  auditBacklinks,
  auditProfile,
  auditOpportunities,
  auditDeadlinks,
  planTriage,
  publicAudit,
];
