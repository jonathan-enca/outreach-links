import { describe, expect, it } from "vitest";
import {
  cleanBacklinks,
  computeStats,
  dedupeKey,
  isForeignSource,
  looksSpammy,
  normalizeUrl,
  type ExclusionReason,
} from "./clean";
import { COMPETITOR, FIXTURE_ITEMS } from "./fixtures";
import { normalizeBacklinkItems, parseSeen } from "./normalize";

const ctx = { language: "fr", ownDomain: "mega-coloring.com" };
const rows = normalizeBacklinkItems(
  FIXTURE_ITEMS as unknown as Parameters<typeof normalizeBacklinkItems>[0],
  COMPETITOR,
);
const classified = cleanBacklinks(rows, ctx);
const reasonsOf = (domain: string, i = 0) =>
  classified.filter((c) => c.row.sourceDomain === domain)[i]?.reasons;

describe("normalizeBacklinkItems", () => {
  it("normalise domaine, type, rang et dates ; ignore les lignes sans source", () => {
    expect(rows).toHaveLength(FIXTURE_ITEMS.length);
    const first = rows[0]!;
    expect(first).toMatchObject({
      competitorDomain: COMPETITOR,
      sourceDomain: "ecole-saint-exupery.fr",
      itemType: "anchor",
      sourceRank: 250,
      spamScore: 5,
    });
    expect(first.firstSeen).toBe("2025-06-02T00:00:00.000Z");
    expect(normalizeBacklinkItems([{ url_from: "", domain_from: "" } as never], "x.fr")).toEqual(
      [],
    );
    expect(parseSeen("pas une date")).toBeNull();
  });
  it("borne le score de spam entre 0 et 100", () => {
    const [r] = normalizeBacklinkItems(
      [{ domain_from: "a.fr", url_from: "https://a.fr/x", backlink_spam_score: 250 } as never],
      "c.fr",
    );
    expect(r!.spamScore).toBe(100);
  });
});

describe("règles de nettoyage sur fixtures", () => {
  it("conserve les liens propres, y compris nofollow, cassés et sous-domaines légitimes", () => {
    for (const d of [
      "ecole-saint-exupery.fr",
      "blog-maman.fr",
      "assmat-du-village.be",
      "wanderlust-voyages.com",
      "startup.io",
      "mairie-de-lyon.fr",
      "alphabet-des-enfants.fr",
      "ancien-blog.fr",
    ]) {
      expect(reasonsOf(d), d).toEqual([]);
    }
  });
  it("spam : score du fournisseur, domaine et ancre", () => {
    for (const d of [
      "super-site.fr",
      "casino-en-ligne-gratuit.fr",
      "meilleurs-liens.xyz",
      "top-bet-france.fr",
      "annuaire-gratuit.fr",
    ]) {
      expect(reasonsOf(d), d).toContain("spam");
    }
  });
  it("heuristiques de spam sans faux positif sur 'alphabet'", () => {
    expect(looksSpammy("alphabet-des-enfants.fr")).toBe(false);
    expect(looksSpammy("bet.fr")).toBe(true);
    expect(looksSpammy("a-b-c-d-e-f.fr")).toBe(true);
    expect(looksSpammy("site12345678.fr")).toBe(true);
    expect(looksSpammy("jolie-ecole.fr", "voir la page")).toBe(false);
  });
  it("images réutilisées : 3 liens image d'un même domaine, pas une image isolée", () => {
    const scraper = classified.filter((c) => c.row.sourceDomain === "scraper-images.fr");
    expect(scraper).toHaveLength(3);
    expect(scraper.every((c) => c.reasons.includes("image_reuse"))).toBe(true);
    expect(reasonsOf("prof-des-ecoles.fr")).toEqual([]);
  });
  it("étrangers : ccTLD hors marché, écritures non latines, IDN ; francophones et génériques acceptés", () => {
    expect(reasonsOf("kinderspiele.de")).toEqual(["foreign"]);
    expect(reasonsOf("pintar-ninos.es")).toEqual(["foreign"]);
    expect(reasonsOf("raskraska.com")).toEqual(["foreign"]);
    expect(reasonsOf("tokyo-kids.com")).toEqual(["foreign"]);
    expect(isForeignSource("exemple.be", null, "fr")).toBe(false);
    expect(isForeignSource("exemple.io", null, "fr")).toBe(false);
    expect(isForeignSource("xn--caf-dma.fr", null, "fr")).toBe(true);
    expect(isForeignSource("exemple.co.uk", null, "fr")).toBe(true);
    expect(isForeignSource("exemple.co.uk", null, "en")).toBe(false);
    // Langue sans règle : pas de filtre par ccTLD.
    expect(isForeignSource("exemple.de", null, "de")).toBe(false);
  });
  it("plateformes génériques et liens internes", () => {
    expect(reasonsOf("fr.pinterest.com")).toContain("plateforme");
    expect(reasonsOf("youtube.com")).toContain("plateforme");
    expect(reasonsOf("boutique.hugolescargot.com")).toContain("interne");
    expect(reasonsOf("mega-coloring.com")).toContain("interne");
  });
  it("doublons : même lien avec www, fragment, suivi et slash final ; garde le dofollow", () => {
    const d = classified.filter((c) => c.row.sourceDomain === "doublon-blog.fr");
    expect(d).toHaveLength(2);
    const kept = d.filter((c) => c.reasons.length === 0);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.row.dofollow).toBe(true);
    expect(d.find((c) => c.reasons.includes("doublon"))!.row.dofollow).toBe(false);
  });
  it("normalizeUrl et dedupeKey", () => {
    expect(normalizeUrl("https://www.A.fr/x/?utm_source=z&b=1&a=2#f")).toBe("a.fr/x?a=2&b=1");
    expect(normalizeUrl(null)).toBe("");
    expect(
      dedupeKey({ competitorDomain: "C.fr", sourceUrl: "http://s.fr/", targetUrl: null }),
    ).toBe("c.fr|s.fr|");
  });
  it("seuils configurables", () => {
    const r = normalizeBacklinkItems(
      [{ domain_from: "ok.fr", url_from: "https://ok.fr/a", backlink_spam_score: 30 } as never],
      "c.fr",
    );
    expect(cleanBacklinks(r, { ...ctx, spamThreshold: 20 })[0]!.reasons).toEqual(["spam"]);
    expect(cleanBacklinks(r, ctx)[0]!.reasons).toEqual([]);
    expect(cleanBacklinks(r, { ...ctx, extraExcluded: ["ok.fr"] })[0]!.reasons).toEqual([
      "plateforme",
    ]);
  });
});

describe("compteurs avant / après", () => {
  const stats = computeStats(classified);
  it("avant = total, après = lignes sans motif, la somme des motifs principaux = exclus", () => {
    expect(stats.before).toBe(FIXTURE_ITEMS.length);
    expect(stats.after).toBe(classified.filter((c) => c.reasons.length === 0).length);
    expect(stats.excluded).toBe(stats.before - stats.after);
    const sum = Object.values(stats.byReason).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.excluded);
  });
  it("valeurs attendues par motif principal sur la fixture", () => {
    const expected: Record<ExclusionReason, number> = {
      interne: 2,
      plateforme: 2,
      spam: 5,
      image_reuse: 3,
      foreign: 4,
      doublon: 1,
    };
    expect(stats.byReason).toEqual(expected);
    expect(stats.after).toBe(FIXTURE_ITEMS.length - 17);
  });
  it("domaines distincts avant / après et détail par concurrent", () => {
    expect(stats.domainsAfter).toBeLessThan(stats.domainsBefore);
    expect(stats.perCompetitor).toEqual([
      { domain: COMPETITOR, before: stats.before, after: stats.after },
    ]);
  });
});
