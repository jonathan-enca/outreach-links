import { describe, expect, it } from "vitest";
import type { PageRead } from "@/features/triage/page-reader";
import { QUALIFY_LIMITS } from "./limits";
import { prereadBoost, rescored } from "./prescore";
import type { QualCandidate, QualContext } from "./types";

const W = QUALIFY_LIMITS.preread.weights;
const ctx = { language: "fr", ownDomain: "monsite.fr", theme: "jardin" } as unknown as QualContext;

const candidate: QualCandidate = {
  domain: "blog-jardin.fr",
  url: "https://blog-jardin.fr/ressources",
  title: null,
  tactics: ["ressources"],
  sources: [{ source: "citation", persona: "monsite.fr" }] as unknown as QualCandidate["sources"],
  competitorsCount: 1,
  domainRank: 20,
  spamScore: 0,
  pageType: "blogs",
  signalCount: 1,
};

function read(over: Partial<PageRead> = {}): PageRead {
  return {
    url: "https://blog-jardin.fr/ressources",
    status: 200,
    blockedByRobots: false,
    unreachable: false,
    title: "Ressources jardin",
    description: "Liste de ressources pour le jardin",
    headings: [],
    text: "Contact : hello@blog-jardin.fr. Ressources utiles au jardinage.",
    lang: "fr",
    links: [],
    outbound: [],
    mailtos: ["hello@blog-jardin.fr"],
    hasContactForm: false,
    ...over,
  } as PageRead;
}

const citing = [
  { url: "https://monsite.fr/guide", anchor: "guide", zone: "body", context: "Un guide utile" },
  { url: "https://autre-site.fr/", anchor: "autre", zone: "body", context: "Une autre ressource" },
  { url: "https://troisieme.fr/", anchor: "troisième", zone: "body", context: "Encore une" },
] as unknown as PageRead["outbound"];

describe("prereadBoost (MQ.3)", () => {
  it("page morte : coefficient de descente", () => {
    const s = prereadBoost(read({ status: 404 }), candidate, ctx);
    expect(s.alive).toBe(false);
    expect(s.boost).toBe(W.dead);
  });

  it("injoignable ou interdite par robots.txt : même traitement qu'une page morte", () => {
    expect(prereadBoost(read({ unreachable: true, status: 0 }), candidate, ctx).boost).toBe(W.dead);
    expect(prereadBoost(read({ blockedByRobots: true, status: 0 }), candidate, ctx).boost).toBe(
      W.dead,
    );
  });

  it("page vivante et sans signal particulier : inchangée", () => {
    const s = prereadBoost(read(), candidate, ctx);
    expect(s.alive).toBe(true);
    expect(s.reason).toBeNull();
    expect(s.boost).toBe(1);
  });

  it("page vivante qui cite plusieurs sites et la ressource : monte", () => {
    const s = prereadBoost(
      read({ outbound: citing, title: "Ressources", text: "Liste de ressources" }),
      candidate,
      ctx,
    );
    expect(s.cites).toBeGreaterThanOrEqual(2);
    expect(s.boost).toBeGreaterThan(1);
  });

  it("page écartée par la lecture (parquée) : descend sans être écartée du tri", () => {
    const s = prereadBoost(
      read({
        title: "Ce domaine est à vendre",
        text: "Domaine à vendre, contactez le propriétaire",
      }),
      candidate,
      ctx,
    );
    expect(s.reason).not.toBeNull();
    expect(s.boost).toBe(W.excluded);
  });
});

describe("rescored", () => {
  it("applique le coefficient et arrondit au dixième", () => {
    expect(rescored(40, 1.25)).toBe(50);
    expect(rescored(33.3, 0.5)).toBe(16.7);
    expect(rescored(40, 1)).toBe(40);
  });
});
