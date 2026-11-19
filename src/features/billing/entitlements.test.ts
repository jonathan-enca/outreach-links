import { describe, expect, it } from "vitest";
import { entitlementsFor, sendBlock, type PlanRow } from "./entitlements";

const STARTER: PlanRow = {
  key: "starter",
  monthly_send_cap: 100,
  max_sites: 1,
  max_mailboxes: 1,
  monthly_campaigns: 1,
  dedicated_domain: false,
  link_checks: false,
};
const PRO: PlanRow = {
  key: "pro",
  monthly_send_cap: 300,
  max_sites: 3,
  max_mailboxes: 2,
  monthly_campaigns: 3,
  dedicated_domain: false,
  link_checks: true,
};

describe("forfait gratuit", () => {
  it("n'envoie rien, ne connecte pas de boîte, un site, une campagne en aperçu par mois", () => {
    const e = entitlementsFor("gratuit", null, 0, false);
    expect(e.canSend).toBe(false);
    expect(e.maxMailboxes).toBe(0);
    expect(e.maxSites).toBe(1);
    expect(e.monthlyCampaigns).toBe(1);
    expect(sendBlock(e)).toMatch(/forfait payant/);
  });

  it("bêta : envoie avec les droits du forfait Starter, plafonnés", () => {
    const e = entitlementsFor("gratuit", STARTER, 0, true);
    expect(e.canSend).toBe(true);
    expect(e.sendCap).toBe(100);
    expect(e.maxMailboxes).toBe(1);
  });

  it("bêta sans ligne de forfait : refus (jamais d'envoi par défaut)", () => {
    expect(entitlementsFor("gratuit", null, 0, true).canSend).toBe(false);
  });
});

describe("forfait payant", () => {
  it("prend les plafonds de la table plans", () => {
    const e = entitlementsFor("pro", PRO, 12, false);
    expect(e).toMatchObject({
      canSend: true,
      sendCap: 300,
      sendUsed: 12,
      maxSites: 3,
      maxMailboxes: 2,
      monthlyCampaigns: 3,
      linkChecks: true,
      dedicatedDomain: false,
    });
    expect(sendBlock(e)).toBeNull();
  });

  it("bloque l'envoi une fois le plafond mensuel atteint", () => {
    const e = entitlementsFor("starter", STARTER, 100, false);
    expect(sendBlock(e)).toMatch(/Plafond mensuel atteint/);
  });

  it("sans ligne de plan lisible, refuse l'envoi", () => {
    expect(entitlementsFor("pro", null, 0, false).canSend).toBe(false);
  });
});
