import { auditBacklinks } from "./audit-backlinks";
import { auditDeadlinks } from "./audit-deadlinks";
import { auditDiscover } from "./audit-discover";
import { auditOpportunities } from "./audit-opportunities";
import { auditProfile } from "./audit-profile";
import { planContacts } from "./plan-contacts";
import { planDrafts } from "./plan-drafts";
import { health } from "./health";
import { planTriage } from "./plan-triage";
import { publicAudit } from "./public-audit";
import { replyClassify } from "./reply-classify";
import { replyDrafts } from "./reply-drafts";
import { replySendTick } from "./reply-send-tick";
import { replyTick } from "./reply-tick";
import { sendTick } from "./send-tick";

/** Toutes les fonctions Inngest de l'application (ajouter ici les nouvelles). */
export const functions = [
  health,
  auditDiscover,
  auditBacklinks,
  auditProfile,
  auditOpportunities,
  auditDeadlinks,
  planTriage,
  planContacts,
  planDrafts,
  publicAudit,
  sendTick,
  replyTick,
  replyClassify,
  replyDrafts,
  replySendTick,
];
