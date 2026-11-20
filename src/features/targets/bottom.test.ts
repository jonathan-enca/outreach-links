import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";

const M = t.targets;

/** Tous les textes du bas de l'écran « Cibles » (barre, sans contact, origine, signature). */
function bottomTexts(): string[] {
  const out: string[] = [M.description, M.messages.validated, M.list.selectedCount(27, 64)];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (typeof v === "function") out.push(String((v as (...a: number[]) => unknown)(2, 64)));
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  [M.validate, M.noContact, M.origin, M.founder].forEach(walk);
  return out;
}

describe("bas de l'écran « Cibles »", () => {
  it("le compteur et l'action suivent la sélection, au singulier comme au pluriel", () => {
    expect(M.list.selectedCount(3, 21)).toBe("3 sur 21 sélectionnés");
    expect(M.validate.button(27)).toBe("Préparer les 27 messages");
    expect(M.validate.button(1)).toBe("Préparer le message");
    expect(M.validate.button(0)).toBe("Préparer les messages");
    expect(M.validate.willPrepare(3)).toBe("3 messages seront préparés");
    expect(M.validate.note).toBe("Vous les relirez avant tout envoi.");
    expect(M.founder.saveAndValidate(27)).toBe("Enregistrer et rédiger les 27 messages");
    expect(M.founder.saveAndValidate(1)).toBe("Enregistrer et rédiger le message");
  });

  it("accorde les compteurs", () => {
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
