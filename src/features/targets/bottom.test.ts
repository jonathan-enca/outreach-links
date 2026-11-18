import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";

const M = t.targets;

/** Tous les textes du bas de l'écran « Vos cibles » (barre, sans contact, origine, signature). */
function bottomTexts(): string[] {
  const out: string[] = [M.description, M.toPlan(12), M.messages.validated];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (typeof v === "function") out.push(String((v as (...a: number[]) => unknown)(2, 64)));
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  [M.validate, M.noContact, M.origin, M.founder, M.list.selectAll, M.list.selectNone].forEach(walk);
  out.push(M.list.selected(27), M.list.selectedOf(64));
  return out;
}

describe("bas de l'écran « Vos cibles »", () => {
  it("le bouton vert dit ce qui se passe, au singulier comme au pluriel", () => {
    expect(M.validate.button(27)).toBe("Rédiger les 27 messages");
    expect(M.validate.button(1)).toBe("Rédiger le message");
    expect(M.validate.button(0)).toBe("Rédiger les messages");
    expect(M.founder.saveAndValidate(27)).toBe("Enregistrer et rédiger les 27 messages");
    expect(M.founder.saveAndValidate(1)).toBe("Enregistrer et rédiger le message");
  });

  it("garde « Tout retenir » et « Tout écarter » (décision du 18/11)", () => {
    expect(M.list.selectAll).toBe("Tout retenir");
    expect(M.list.selectNone).toBe("Tout écarter");
  });

  it("accorde les compteurs", () => {
    expect(M.list.selected(1)).toBe("1 site retenu");
    expect(M.validate.count(1)).toBe("1 demande retenue");
    expect(M.noContact.title(1)).toBe("1 site pertinent, sans contact trouvé");
    expect(M.noContact.title(6)).toBe("6 sites pertinents, sans contact trouvé");
    expect(M.origin.body(18)).toContain("des 18 sites qui apparaissent");
    expect(M.origin.body(0)).not.toMatch(/\d/);
  });

  it("ne parle ni de lot, ni d'argent, et ne crie pas", () => {
    for (const text of bottomTexts()) {
      expect(text).not.toMatch(/\blots?\b/i);
      expect(text).not.toMatch(/budget|coût|€|\$|dollar|euro/i);
      expect(text).not.toContain("!");
    }
  });
});
