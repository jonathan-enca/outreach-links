import { analysisLinksState } from "./analysis-links-state";
import { analysisRun } from "./analysis-run";
import { auditBacklinks } from "./audit-backlinks";
import { auditCollect } from "./audit-collect";
import { auditDeadlinks } from "./audit-deadlinks";
import { auditFindings } from "./audit-findings";
import { auditDiscover } from "./audit-discover";
import { auditOpportunities } from "./audit-opportunities";
import { auditProfile } from "./audit-profile";
import { auditQualify } from "./audit-qualify";
import { auditQualifyAutoStart } from "./audit-qualify-auto-start";
import { auditQualifyMore } from "./audit-qualify-more";
import { notifyTick } from "./notify-tick";
import { planContacts } from "./plan-contacts";
import { planDrafts } from "./plan-drafts";
import { draftModelsCheck } from "./draft-models-check";
import { linkCheckTick } from "./link-check-tick";
import { health } from "./health";
import { planTriage } from "./plan-triage";
import { publicAudit } from "./public-audit";
import { replyClassify } from "./reply-classify";
import { replyDrafts } from "./reply-drafts";
import { replySendTick } from "./reply-send-tick";
import { replyTick } from "./reply-tick";
import { sendTick } from "./send-tick";
import { stepWatchdog } from "./step-watchdog";

/** Toutes les fonctions Inngest de l'application (ajouter ici les nouvelles). */
export const functions = [
  health,
  auditDiscover,
  auditBacklinks,
  auditProfile,
  auditOpportunities,
  auditDeadlinks,
  auditCollect,
  auditQualify,
  auditQualifyMore,
  auditQualifyAutoStart,
  auditFindings,
  analysisRun,
  analysisLinksState,
  planTriage,
  planContacts,
  planDrafts,
  draftModelsCheck,
  publicAudit,
  sendTick,
  replyTick,
  replyClassify,
  replyDrafts,
  replySendTick,
  linkCheckTick,
  stepWatchdog,
  notifyTick,
];
