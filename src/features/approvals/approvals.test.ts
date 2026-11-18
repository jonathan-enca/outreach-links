import { describe, expect, it } from "vitest";
import { isApprovable, isSnoozed } from "./service";

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
