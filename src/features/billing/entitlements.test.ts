import { describe, expect, it } from "vitest";
import {
  campaignBlocked,
  entitlementsFor,
  planBlockMessage,
  replyBlock,
  sendBlock,
  type PlanRow,
} from "./entitlements";

const STARTER: PlanRow = {
  key: "starter",
  monthly_send_cap: 100,
  max_sites: 1,
  max_mailboxes: 1,
  monthly_campaigns: 1,
  dedicated_domain: false,
  link_checks: true,
  link_monitoring: false,
  contacts_visible: true,
  readable_drafts: null,
  export_csv: true,
  ready_replies: false,
  catalogue_cap: 200,
  lifetime_campaigns: null,
};
const PRO: PlanRow = {
  key: "pro",
  monthly_send_cap: 300,
  max_sites: 3,
  max_mailboxes: 2,
  monthly_campaigns: 3,
  dedicated_domain: false,
  link_checks: true,
  link_monitoring: true,
  contacts_visible: true,
  readable_drafts: null,
  export_csv: true,
  ready_replies: true,
  catalogue_cap: 500,
  lifetime_campaigns: null,
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

  it("tout voir, rien envoyer : contacts masqués, 3 messages lisibles, pas d'export", () => {
    const e = entitlementsFor("gratuit", null, 0, false);
    expect(e).toMatchObject({
      contactsVisible: false,
      readableDrafts: 3,
      exportCsv: false,
      linkChecks: false,
      readyReplies: false,
      catalogueCap: 100,
      lifetimeCampaigns: 1,
    });
    expect(replyBlock(e)).toMatch(/forfait payant/);
  });

  it("une seule analyse, à vie : refusée dès la deuxième, même un autre mois", () => {
    const e = entitlementsFor("gratuit", null, 0, false);
    expect(campaignBlocked(e, 0, 0)).toBe(false);
    expect(campaignBlocked(e, 0, 1)).toBe(true);
    expect(planBlockMessage(e, "campagne")).toMatch(/une fois/);
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

  it("bloque les nouveaux contacts une fois le plafond mensuel atteint, pas les réponses", () => {
    const e = entitlementsFor("starter", STARTER, 100, false);
    expect(sendBlock(e)).toMatch(/Plafond mensuel atteint \(100 cibles contactées/);
    expect(replyBlock(e)).toBeNull();
  });

  it("droits par offre : contacts, export et liens vérifiés partout ; surveillance et réponses prêtes dès Pro", () => {
    const starter = entitlementsFor("starter", STARTER, 0, false);
    const pro = entitlementsFor("pro", PRO, 0, false);
    expect(starter).toMatchObject({
      contactsVisible: true,
      readableDrafts: null,
      exportCsv: true,
      linkChecks: true,
      linkMonitoring: false,
      readyReplies: false,
      catalogueCap: 200,
    });
    expect(pro).toMatchObject({ linkMonitoring: true, readyReplies: true, catalogueCap: 500 });
  });

  it("campagnes : plafond mensuel seul pour un abonné", () => {
    const e = entitlementsFor("starter", STARTER, 0, false);
    expect(campaignBlocked(e, 0, 40)).toBe(false);
    expect(campaignBlocked(e, 1, 40)).toBe(true);
  });

  it("sans ligne de plan lisible, refuse l'envoi", () => {
    expect(entitlementsFor("pro", null, 0, false).canSend).toBe(false);
  });
});
