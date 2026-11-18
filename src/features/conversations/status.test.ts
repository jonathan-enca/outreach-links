import { describe, expect, it } from "vitest";
import { cleanTag, isArchived, isUnread, threadStatus, type ThreadFacts } from "./status";

const f = (o: Partial<ThreadFacts> = {}): ThreadFacts => ({
  category: null,
  state: null,
  hasReply: false,
  bounced: false,
  followedUp: false,
  pendingDraft: false,
  answered: false,
  liveLink: false,
  ...o,
});

describe("statut d'un fil", () => {
  it("sans réponse : envoyé, puis relancé", () => {
    expect(threadStatus(f())).toBe("envoye");
    expect(threadStatus(f({ followedUp: true }))).toBe("relance");
  });
  it("une réponse attend la personne tant qu'on n'y a pas répondu", () => {
    expect(threadStatus(f({ hasReply: true, category: "question" }))).toBe("a_traiter");
    expect(threadStatus(f({ hasReply: true, category: "question", answered: true }))).toBe(
      "a_repondu",
    );
    expect(
      threadStatus(f({ hasReply: true, category: "question", answered: true, pendingDraft: true })),
    ).toBe("a_traiter");
    expect(threadStatus(f({ hasReply: true, category: "question", state: "archive" }))).toBe(
      "a_repondu",
    );
  });
  it("lien obtenu et refus l'emportent", () => {
    expect(threadStatus(f({ hasReply: true, liveLink: true }))).toBe("lien_obtenu");
    expect(threadStatus(f({ hasReply: true, state: "gagne" }))).toBe("lien_obtenu");
    expect(threadStatus(f({ hasReply: true, category: "refus_poli" }))).toBe("refuse");
    expect(threadStatus(f({ hasReply: true, category: "desinscription" }))).toBe("refuse");
  });
  it("message revenu en erreur, sans réponse", () => {
    expect(threadStatus(f({ bounced: true }))).toBe("erreur");
  });
});

describe("non lu et étiquettes", () => {
  it("non lu seulement s'il y a une réponse plus récente que la dernière lecture", () => {
    expect(isUnread(null, null)).toBe(false);
    expect(isUnread("2026-11-18T10:00:00Z", null)).toBe(true);
    expect(isUnread("2026-11-18T10:00:00Z", "2026-11-18T09:00:00Z")).toBe(true);
    expect(isUnread("2026-11-18T10:00:00Z", "2026-11-18T11:00:00Z")).toBe(false);
  });
  it("étiquette nettoyée", () => {
    expect(cleanTag("  À  Rappeler ")).toBe("à rappeler");
    expect(cleanTag("   ")).toBeNull();
    expect(cleanTag(12)).toBeNull();
    expect(cleanTag("x".repeat(40))!.length).toBe(30);
  });
});

describe("archivage d'un fil (« traité »)", () => {
  it("archivé tant qu'aucune réponse n'arrive après", () => {
    expect(isArchived(null, null)).toBe(false);
    expect(isArchived("2026-11-18T10:00:00Z", null)).toBe(true);
    expect(isArchived("2026-11-18T10:00:00Z", "2026-11-18T09:00:00Z")).toBe(true);
  });
  it("une réponse arrivée après l'archivage ramène le fil dans la boîte", () => {
    expect(isArchived("2026-11-18T10:00:00Z", "2026-11-18T11:00:00Z")).toBe(false);
  });
});
