import { describe, expect, it } from "vitest";
import { ALL_SITES, parseSiteChoice } from "./current-site";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseSiteChoice", () => {
  it("garde un site visible", () => expect(parseSiteChoice(A, [A, B])).toBe(A));
  it("revient à « tous » sans cookie, pour un site inconnu ou une valeur douteuse", () => {
    expect(parseSiteChoice(undefined, [A])).toBe(ALL_SITES);
    expect(parseSiteChoice(B, [A])).toBe(ALL_SITES);
    expect(parseSiteChoice("n'importe quoi", [A])).toBe(ALL_SITES);
    expect(parseSiteChoice(ALL_SITES, [A])).toBe(ALL_SITES);
  });
});
