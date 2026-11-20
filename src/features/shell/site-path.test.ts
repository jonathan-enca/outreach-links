import { describe, expect, it } from "vitest";
import { pathForSite, siteInPath } from "./site-path";

const A = "0b5c6a3e-1f2d-4c3b-9a8e-7d6c5b4a3f21";
const B = "9a8e7d6c-5b4a-4f21-8b5c-6a3e1f2d4c3b";

describe("siteInPath", () => {
  it("lit le site des pages de campagne", () => {
    expect(siteInPath(`/app/site/${A}`)).toBe(A);
    expect(siteInPath(`/app/site/${A}/cibles`)).toBe(A);
    expect(siteInPath(`/app/site/${A.toUpperCase()}/analyse`)).toBe(A);
  });
  it("ignore les autres pages", () => {
    expect(siteInPath("/app/a-valider")).toBeNull();
    expect(siteInPath("/app/site")).toBeNull();
    expect(siteInPath("/app/site/pas-un-id/cibles")).toBeNull();
  });
});

describe("pathForSite", () => {
  it("garde la même page pour l'autre site", () => {
    expect(pathForSite(`/app/site/${A}/cibles`, B)).toBe(`/app/site/${B}/cibles`);
    expect(pathForSite(`/app/site/${A}`, B)).toBe(`/app/site/${B}`);
  });
  it("« tous les sites » renvoie à la liste des campagnes", () => {
    expect(pathForSite(`/app/site/${A}/cibles`, "all")).toBe("/app/campagnes");
  });
  it("ne change pas d'adresse hors des pages de campagne", () => {
    expect(pathForSite("/app/envois", B)).toBeNull();
  });
});
