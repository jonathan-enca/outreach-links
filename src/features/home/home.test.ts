import { describe, expect, it } from "vitest";
import { fr } from "../../../messages/fr";
import { HOME_SECTIONS } from "./sections";
import { homeNavLinks } from "./site-header";

function texts(value: unknown, skip = new Set<string>()): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => texts(v, skip));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => (skip.has(k) ? [] : texts(v, skip)));
  return [];
}

describe("home FR", () => {
  it("chaque lien de l'en-tête pointe vers une section existante", () => {
    const ids = new Set<string>(Object.values(HOME_SECTIONS));
    ids.add("audit");
    for (const l of homeNavLinks()) expect(ids.has(l.href.slice(1))).toBe(true);
  });

  it("aucune promesse de garantie, aucun chiffre de preuve ni prix dans les textes", () => {
    const all = texts(fr.home, new Set(["mockup"])).join("\n");
    expect(all).not.toMatch(/garanti/i);
    expect(all).not.toMatch(/\d\s*(%|€|\$|\s?euros)/);
    expect(all).not.toMatch(/\b(x|×)\s?\d/i);
  });

  it("vouvoiement : pas de « tu / ton / ta » dans les textes", () => {
    const all = texts(fr.home).join("\n");
    expect(all).not.toMatch(/(?<![\p{L}])(tu|ton|ta|tes|toi)(?![\p{L}])/iu);
  });

  it("l'honnêteté est dite : aucun lien acheté", () => {
    expect(texts(fr.home.trust).join(" ")).toMatch(/aucun lien acheté/i);
    expect(texts(fr.home.whatItIs).join(" ")).toMatch(/ne faisons pas/i);
  });
});
