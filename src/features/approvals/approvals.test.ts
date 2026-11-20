import { describe, expect, it } from "vitest";
import {
  campaignInitial,
  campaignOf,
  groupByCampaign,
  nextRowId,
  queueRows,
  selectionSummary,
} from "./queue-model";
import {
  isApprovable,
  isSnoozed,
  type PendingForm,
  type PendingMessage,
  type PendingReply,
} from "./service";

describe("file « À valider » : ce qui peut être approuvé", () => {
  const d = { status: "brouillon", ready: true, channel: "email", sendable: true };
  it("un email prêt dont le contact est vérifié", () => {
    expect(isApprovable(d)).toBe(true);
  });
  it("jamais un email sans contact vérifié, un message pas prêt ou déjà validé", () => {
    expect(isApprovable({ ...d, sendable: false })).toBe(false);
    expect(isApprovable({ ...d, ready: false })).toBe(false);
    expect(isApprovable({ ...d, status: "valide" })).toBe(false);
  });
  it("un message pour formulaire prêt, même sans email (il devient une tâche, jamais un envoi)", () => {
    expect(isApprovable({ ...d, channel: "formulaire", sendable: false })).toBe(true);
  });
});

describe("« Plus tard » durable", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  it("remis à plus tard tant que la date n'est pas passée", () => {
    expect(isSnoozed(null, now)).toBe(false);
    expect(isSnoozed("2026-11-19T10:00:00Z", now)).toBe(true);
    expect(isSnoozed("2026-11-18T10:00:00Z", now)).toBe(false);
    expect(isSnoozed("2026-11-17T10:00:00Z", now)).toBe(false);
  });
});

describe("file rangée par campagne", () => {
  const msg = (id: string, planId: string, ready = true) =>
    ({ id, planId, campaign: `site-${planId}.fr`, ready }) as unknown as PendingMessage;
  const reply = (id: string, planId: string) =>
    ({ id, planId, campaign: `site-${planId}.fr` }) as unknown as PendingReply;
  const form = (id: string, planId: string) =>
    ({ id, planId, campaign: `site-${planId}.fr` }) as unknown as PendingForm;
  const rows = queueRows({
    messages: [msg("m1", "b"), msg("m2", "a"), msg("m3", "a", false)],
    replies: [reply("r1", "a")],
    forms: [form("f1", "b")],
  });
  const campaigns = [
    { id: "a", label: "site-a.fr" },
    { id: "b", label: "site-b.fr" },
    { id: "c", label: "site-c.fr" },
  ];

  it("une campagne après l'autre, les réponses d'abord, sans groupe vide", () => {
    const groups = groupByCampaign(rows, campaigns);
    expect(groups.map((g) => g.id)).toEqual(["a", "b"]);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(["r1", "m2", "m3"]);
    expect(groups[1]!.rows.map((r) => r.id)).toEqual(["m1", "f1"]);
  });
  it("plusieurs plans d'un même site ne forment qu'une campagne", () => {
    // Quatre analyses du même site : quatre plans, une seule campagne à l'écran.
    const sameSite = queueRows({
      messages: ["p1", "p2", "p3", "p4"].map((planId, i) => ({
        ...msg(`m${i}`, planId),
        campaignId: "site-1",
        campaign: "site-1.fr · France",
      })),
      replies: [{ ...reply("r1", "p2"), campaignId: "site-1", campaign: "site-1.fr · France" }],
      forms: [],
    });
    const groups = groupByCampaign(sameSite, [{ id: "site-1", label: "site-1.fr · France" }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.rows).toHaveLength(5);
    const s = selectionSummary(sameSite, new Set(sameSite.map((r) => r.id)), true);
    expect(s.campaigns).toEqual([{ id: "site-1", label: "site-1.fr · France", count: 5 }]);
  });
  it("sans site connu, la campagne reste le plan", () => {
    expect(campaignOf({ planId: "p1" })).toBe("p1");
    expect(campaignOf({ planId: "p1", campaignId: "site-1" })).toBe("site-1");
  });
  it("une ligne dont la campagne est inconnue reste visible", () => {
    const groups = groupByCampaign(rows, []);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(rows.length);
  });
  it("dit ce que ferait chaque action sur la sélection", () => {
    const s = selectionSummary(rows, new Set(["r1", "m1", "m3", "f1"]), true);
    expect(s.total).toBe(4);
    expect(s.approveMessageIds).toEqual(["m1"]);
    expect(s.approveReplyIds).toEqual(["r1"]);
    expect(s.refuseMessageIds).toEqual(["m1", "m3"]);
    expect(s.notReady).toBe(1);
    expect(s.forms).toBe(1);
    expect(s.laterIds).toHaveLength(4);
    expect(s.campaigns.map((c) => [c.id, c.count])).toEqual([
      ["a", 2],
      ["b", 2],
    ]);
  });
  it("sans boîte d'envoi aucun email ne part, une réponse si", () => {
    const s = selectionSummary(rows, new Set(["r1", "m1"]), false);
    expect(s.approveMessageIds).toEqual([]);
    expect(s.noMailbox).toBe(1);
    expect(s.approveReplyIds).toEqual(["r1"]);
  });
  it("après une décision : le suivant, sinon le précédent, sinon rien", () => {
    const list = [{ id: "x" }, { id: "y" }, { id: "z" }];
    expect(nextRowId(list, "y")).toBe("z");
    expect(nextRowId(list, "z")).toBe("y");
    expect(nextRowId([{ id: "x" }], "x")).toBeNull();
  });
  it("initiale de la pastille de campagne", () => {
    expect(campaignInitial("www.atelier-coloriage.fr · France")).toBe("A");
    expect(campaignInitial("")).toBe("?");
  });
});
