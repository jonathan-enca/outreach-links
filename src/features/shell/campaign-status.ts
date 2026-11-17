import type { CampaignView } from "./overview";

export type CampaignStatus =
  "onboarding" | "analyse" | "reprise" | "toValidate" | "ready" | "sending";

/** L'état d'une campagne tel qu'on l'affiche (pur) : où elle en est, de l'analyse aux envois. */
export function campaignStatus(c: CampaignView): CampaignStatus {
  if (c.step.kind !== "cibles") return c.step.kind;
  if (c.contacted > 0) return "sending";
  return c.validated > 0 ? "ready" : "toValidate";
}
