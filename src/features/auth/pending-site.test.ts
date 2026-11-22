import { describe, expect, it } from "vitest";
import { pendingSite } from "./pending-site";
import { signupHref } from "./signup-href";

describe("site saisi avant l'inscription", () => {
  it("nettoie une adresse complète en nom de domaine", () => {
    expect(pendingSite("https://www.Exemple.fr/page?x=1")).toBe("exemple.fr");
    expect(pendingSite(" exemple.fr ")).toBe("exemple.fr");
  });
  it("écarte ce qui n'est pas un domaine public", () => {
    for (const raw of ["", "bonjour", "localhost", "127.0.0.1", "<script>", null, undefined]) {
      expect(pendingSite(raw)).toBeNull();
    }
  });
  it("emporte la saisie vers l'inscription, encodée", () => {
    expect(signupHref("exemple.fr")).toBe("/inscription?site=exemple.fr");
    expect(signupHref(" mon site.fr/a&b ")).toBe("/inscription?site=mon%20site.fr%2Fa%26b");
    expect(signupHref("   ")).toBe("/inscription");
  });
});
