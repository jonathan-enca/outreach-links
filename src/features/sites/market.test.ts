import { describe, expect, it } from "vitest";
import { languageVersionHref, parseHtml } from "@/features/triage/page-reader";
import { brandSystem } from "@/features/brand/generate";
import { MARKETS, MARKET_COUNTRIES, serpLocation, sortedByLabel } from "./market";
import { t } from "@/lib/messages";

describe("liste des pays : français et anglais, triée", () => {
  it("retient les principaux marchés, Australie comprise, sans Monaco", () => {
    expect([...MARKET_COUNTRIES].sort()).toEqual(["AU", "BE", "CA", "CH", "FR", "GB", "LU", "US"]);
    expect(serpLocation("AU", "en")).toEqual({ location_code: 2036, language_code: "en" });
    for (const code of MARKET_COUNTRIES) expect(t.sites.countries[code]).toBeTruthy();
  });

  it("les listes s'affichent dans l'ordre alphabétique des libellés, pas dans l'ordre du code", () => {
    const labels = sortedByLabel(t.sites.countries).map((x) => x.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "fr")));
    expect(labels[0]).toBe("Australie");
    expect(sortedByLabel(t.sites.languages).map((x) => x.code)).toEqual(["en", "fr"]);
  });
});

describe("marché : pays et langue pilotent la recherche", () => {
  it("lieu et langue des recherches Google selon le pays", () => {
    expect(serpLocation("FR", "fr")).toEqual({ location_code: 2250, language_code: "fr" });
    expect(serpLocation("BE", "fr")).toEqual({ location_code: 2056, language_code: "fr" });
    expect(serpLocation("US", "en")).toEqual({ location_code: 2840, language_code: "en" });
    expect(serpLocation(undefined, undefined)).toEqual({
      location_code: 2250,
      language_code: "fr",
    });
    expect(serpLocation("ZZ", "fr").location_code).toBe(MARKETS.FR.location);
  });

  it("un site bilingue : la version demandée est retrouvée par hreflang, sans traduction", () => {
    const html = `<html lang="en"><head>
      <link rel="alternate" hreflang="fr" href="/fr/">
      <link rel="alternate" hreflang="en" href="/">
      <link rel="alternate" hreflang="x-default" href="/"></head><body>Coloring pages</body></html>`;
    const page = parseHtml(html, "https://mega-coloring.com/");
    expect(page.alternates).toEqual([
      { lang: "fr", href: "https://mega-coloring.com/fr/" },
      { lang: "en", href: "https://mega-coloring.com/" },
    ]);
    expect(languageVersionHref({ ...page }, "fr")).toBe("https://mega-coloring.com/fr/");
    expect(languageVersionHref({ ...page }, "en")).toBeNull(); // déjà dans la bonne langue
    expect(languageVersionHref({ ...page, alternates: [] }, "fr")).toBeNull();
  });

  it("le profil est rédigé dans la langue de la campagne", () => {
    expect(brandSystem("fr")).toContain("Rédige en français");
    expect(brandSystem("en")).toContain("Rédige en anglais");
    expect(brandSystem("en")).toContain("ne traduis rien");
  });
});
