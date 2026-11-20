import { describe, expect, it } from "vitest";
import { countStates } from "./cards";
import { messageStateOf, targetsLead } from "./service";
import type { TargetCard } from "./types";

const card = (id: string, alreadyValidated: boolean) =>
  ({ id, alreadyValidated }) as unknown as TargetCard;

describe("écran Cibles après validation", () => {
  it("donne l'état du message d'une cible retenue", () => {
    const base = { draftStatus: null, refused: false, running: false };
    expect(messageStateOf({ ...base, draftStatus: "valide" })).toBe("approuve");
    expect(messageStateOf({ ...base, draftStatus: "brouillon" })).toBe("a_relire");
    expect(messageStateOf({ ...base, refused: true })).toBe("refuse");
    expect(messageStateOf({ ...base, running: true })).toBe("en_redaction");
    expect(messageStateOf(base)).toBe("a_rediger");
    // Un brouillon compte avant un ancien refus (« Rédiger quand même » a été demandé).
    expect(messageStateOf({ draftStatus: "brouillon", refused: true, running: true })).toBe(
      "a_relire",
    );
  });

  it("compte les cibles retenues par état, une cible sans état connu étant en rédaction", () => {
    const kept = [card("a", true), card("b", true), card("c", true)];
    const counts = countStates(kept, { a: { state: "a_relire" }, b: { state: "refuse" } });
    expect(counts).toEqual({
      en_redaction: 1,
      a_rediger: 0,
      a_relire: 1,
      approuve: 0,
      refuse: 1,
    });
  });

  it("change la phrase d'introduction selon ce qui reste à décider", () => {
    expect(targetsLead({ cards: [card("a", false)] })).toMatch(/Décochez/);
    expect(targetsLead({ cards: [card("a", true), card("b", false)] })).toMatch(
      /^Il reste 1 site à décider/,
    );
    expect(targetsLead({ cards: [card("a", true)] })).toMatch(/^Toutes vos cibles sont retenues/);
  });
});
