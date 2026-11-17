import { describe, expect, it } from "vitest";
import { buildOverview, type OverviewRows } from "./overview";

const base: OverviewRows = {
  sites: [
    { id: "s1", domain: "a.fr", country: "FR" },
    { id: "s2", domain: "b.fr", country: "BE" },
  ],
  audits: [
    {
      id: "old",
      site_id: "s1",
      status: "termine",
      analysis_status: "termine",
      created_at: "2026-11-01",
    },
    {
      id: "new",
      site_id: "s1",
      status: "termine",
      analysis_status: "termine",
      created_at: "2026-11-17",
    },
  ],
  targetsByAudit: { new: 80, old: 12 },
  plans: [
    { id: "p1", site_id: "s1", item_count: 40 },
    { id: "p2", site_id: "s1", item_count: 21 },
  ],
  sent: [
    { id: "m1", plan_id: "p1" },
    { id: "m2", plan_id: "p2" },
    { id: "m3", plan_id: "inconnu" },
  ],
  replies: [{ sent_message_id: "m1" }, { sent_message_id: "orphelin" }],
  links: [{ site_id: "s1" }, { site_id: "s1" }],
  pendingDrafts: 12,
  pendingReplies: 2,
  pendingForms: 4,
  mailboxes: 0,
};

describe("vue d'ensemble de l'espace client", () => {
  const v = buildOverview(base);
  it("une campagne par site, comptée sur le DERNIER audit", () => {
    expect(v.campaigns.map((c) => c.domain)).toEqual(["a.fr", "b.fr"]);
    expect(v.campaigns[0]).toMatchObject({
      auditId: "new",
      targets: 80,
      validated: 61,
      contacted: 2,
      replies: 1,
      liveLinks: 2,
    });
    expect(v.campaigns[0]!.step.kind).toBe("cibles");
  });
  it("un site sans analyse : zéro partout, prochaine étape = vérification", () => {
    expect(v.campaigns[1]).toMatchObject({ auditId: null, targets: 0, contacted: 0 });
    expect(v.campaigns[1]!.step.kind).toBe("onboarding");
  });
  it("totaux, en attente, boîte d'envoi", () => {
    expect(v.totals).toEqual({ targets: 80, validated: 61, contacted: 2, replies: 1, links: 2 });
    expect(v.pending).toEqual({ drafts: 12, replies: 2, forms: 4 });
    expect(v.hasMailbox).toBe(false);
  });
});
