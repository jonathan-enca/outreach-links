import { describe, expect, it } from "vitest";
import {
  assessTechnical,
  buildAnchorProfile,
  classifyAnchor,
  computeGap,
  estimateRequiredDomains,
  groupKeywordsByPage,
  median,
  normalizePageUrl,
  proximityWeight,
  roundOrder,
  type CompetitorLinkRow,
} from "./compute";

describe("normalizePageUrl", () => {
  it("retire ancre, suivi et slash final, garde la requête utile", () => {
    expect(normalizePageUrl("https://Exemple.fr/page/?utm_source=x&b=2&a=1#haut")).toBe(
      "https://exemple.fr/page?a=1&b=2",
    );
    expect(normalizePageUrl("https://exemple.fr/")).toBe("https://exemple.fr/");
    expect(normalizePageUrl("ftp://exemple.fr")).toBeNull();
    expect(normalizePageUrl("n'importe quoi")).toBeNull();
  });
});

describe("classifyAnchor", () => {
  const d = "mega-coloring.com";
  it("reconnaît marque, URL, générique, vide, autre", () => {
    expect(classifyAnchor("Mega Coloring", d)).toBe("marque");
    expect(classifyAnchor("megacoloring", d)).toBe("marque");
    expect(classifyAnchor("https://mega-coloring.com/x", d)).toBe("url");
    expect(classifyAnchor("mega-coloring.com", d)).toBe("url");
    expect(classifyAnchor("Cliquez ici", d)).toBe("generique");
    expect(classifyAnchor("  ", d)).toBe("vide");
    expect(classifyAnchor(null, d)).toBe("vide");
    expect(classifyAnchor("coloriage licorne", d)).toBe("autre");
  });
});

describe("buildAnchorProfile", () => {
  it("calcule parts, top et part dofollow", () => {
    const links = [
      ...Array.from({ length: 6 }, () => ({ anchor: "coloriage licorne", dofollow: true })),
      { anchor: "Mega Coloring", dofollow: true },
      { anchor: "ici", dofollow: false },
      { anchor: "", dofollow: null },
    ];
    const p = buildAnchorProfile(links, "mega-coloring.com");
    expect(p.sampleSize).toBe(9);
    expect(p.top[0]).toMatchObject({ anchor: "coloriage licorne", count: 6, kind: "autre" });
    expect(p.dofollowShare).toBeCloseTo(7 / 8, 3);
    expect(p.shares.marque).toBeCloseTo(1 / 9, 3);
    // Échantillon trop petit : jamais de drapeau de sur-optimisation.
    expect(p.overOptimized).toBe(false);
  });
  it("signale une ancre commerciale dominante sur un échantillon suffisant", () => {
    const links = [
      ...Array.from({ length: 10 }, () => ({ anchor: "coloriage licorne", dofollow: true })),
      ...Array.from({ length: 30 }, (_, i) => ({ anchor: `site ${i}`, dofollow: true })),
    ];
    expect(buildAnchorProfile(links, "mega-coloring.com").overOptimized).toBe(true);
  });
  it("gère un échantillon vide", () => {
    const p = buildAnchorProfile([], "x.fr");
    expect(p.dofollowShare).toBeNull();
    expect(p.top).toEqual([]);
  });
});

describe("groupKeywordsByPage", () => {
  const kw = (keyword: string, url: string, position: number, volume: number) => ({
    keyword,
    url,
    position,
    volume,
  });
  const items = [
    kw("coloriage licorne", "https://mega-coloring.com/licorne", 14, 74000),
    kw("licorne a colorier", "https://mega-coloring.com/licorne/?utm_source=a", 9, 5000),
    kw("coloriage chat", "https://mega-coloring.com/chat", 2, 90000),
    kw("coloriage dragon", "https://mega-coloring.com/dragon", 18, 30),
    kw("coloriage dinosaure", "https://mega-coloring.com/dino", 6, 20000),
    kw("autre site", "https://autre.fr/x", 5, 9999),
    kw("doublon", "https://mega-coloring.com/dino", 8, 100),
    kw("doublon", "https://mega-coloring.com/dino", 5, 100),
  ];
  const pages = groupKeywordsByPage(items, "mega-coloring.com");
  it("regroupe par URL normalisée et ignore les autres domaines", () => {
    expect(pages.map((p) => p.url).sort()).toEqual([
      "https://mega-coloring.com/chat",
      "https://mega-coloring.com/dino",
      "https://mega-coloring.com/dragon",
      "https://mega-coloring.com/licorne",
    ]);
    const lic = pages.find((p) => p.url.endsWith("/licorne"))!;
    expect(lic.keywordsCount).toBe(2);
    expect(lic.totalVolume).toBe(79000);
    expect(lic.bestPosition).toBe(9);
  });
  it("garde la meilleure position d'un mot-clé en double", () => {
    const dino = pages.find((p) => p.url.endsWith("/dino"))!;
    expect(dino.keywords.find((k) => k.keyword === "doublon")!.position).toBe(5);
  });
  it("priorise positions 4 à 20 à volume notable, par score décroissant", () => {
    const prio = pages.filter((p) => p.isPriority);
    expect(prio.map((p) => p.url.split("/").pop())).toEqual(["licorne", "dino"]);
    expect(prio.map((p) => p.priorityRank)).toEqual([1, 2]);
    // Position 2 (hors 4-20) et volume 30 (< seuil) : non prioritaires.
    expect(pages.find((p) => p.url.endsWith("/chat"))!.isPriority).toBe(false);
    expect(pages.find((p) => p.url.endsWith("/dragon"))!.isPriority).toBe(false);
    // Les prioritaires viennent en premier.
    expect(pages[0]!.isPriority).toBe(true);
  });
  it("poids de proximité : 1 en position 4, 0 en position 21", () => {
    expect(proximityWeight(4)).toBe(1);
    expect(proximityWeight(21)).toBe(0);
    expect(proximityWeight(12)).toBeGreaterThan(proximityWeight(18));
  });
});

describe("estimateRequiredDomains", () => {
  it("donne un ordre de grandeur croissant avec le repère, décroissant avec les liens existants", () => {
    const base = { avgPosition: 14, benchmarkDomains: 500, pageReferringDomains: 0 };
    const a = estimateRequiredDomains(base)!;
    expect(a.estimated).toBe(100);
    expect(a.low).toBeLessThan(a.estimated);
    expect(a.high).toBeGreaterThan(a.estimated);
    expect(estimateRequiredDomains({ ...base, pageReferringDomains: 40 })!.estimated).toBe(60);
    expect(estimateRequiredDomains({ ...base, benchmarkDomains: 1000 })!.estimated).toBe(200);
  });
  it("une page proche du haut a besoin de moins de liens", () => {
    const far = estimateRequiredDomains({
      avgPosition: 15,
      benchmarkDomains: 500,
      pageReferringDomains: 0,
    })!;
    const near = estimateRequiredDomains({
      avgPosition: 6,
      benchmarkDomains: 500,
      pageReferringDomains: 0,
    })!;
    expect(near.estimated).toBeLessThan(far.estimated);
  });
  it("jamais négatif et null sans repère", () => {
    expect(
      estimateRequiredDomains({ avgPosition: 8, benchmarkDomains: 50, pageReferringDomains: 99 })!
        .estimated,
    ).toBe(0);
    expect(
      estimateRequiredDomains({ avgPosition: 8, benchmarkDomains: null, pageReferringDomains: 1 }),
    ).toBeNull();
    expect(
      estimateRequiredDomains({ avgPosition: 8, benchmarkDomains: 0, pageReferringDomains: 1 }),
    ).toBeNull();
  });
  it("arrondit en ordre de grandeur", () => {
    expect(roundOrder(7.4)).toBe(7);
    expect(roundOrder(23)).toBe(25);
    expect(roundOrder(143)).toBe(140);
  });
});

describe("median", () => {
  it("médiane impaire, paire, vide", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("computeGap", () => {
  const row = (
    competitorDomain: string,
    sourceDomain: string,
    over: Partial<CompetitorLinkRow> = {},
  ) => ({
    competitorDomain,
    sourceDomain,
    sourceUrl: `https://${sourceDomain}/p`,
    anchor: null,
    dofollow: true,
    spamScore: 10,
    sourceRank: 100,
    ...over,
  });
  const rows = [
    row("a.fr", "ecole.fr", { sourceRank: 300 }),
    row("b.fr", "ecole.fr", { sourceRank: 200, spamScore: 3 }),
    row("a.fr", "blog.fr"),
    row("a.fr", "deja-chez-nous.fr"),
    row("a.fr", "www.moi.fr"),
    row("a.fr", "sous.moi.fr"),
    row("a.fr", "ecole.fr", { sourceUrl: "https://ecole.fr/autre" }),
  ];
  const gap = computeGap(["deja-chez-nous.fr", "WWW.Autre.fr"], rows, "moi.fr");
  it("exclut les domaines qui citent déjà le site, le site lui-même et ses sous-domaines", () => {
    expect(gap.map((g) => g.domain)).toEqual(["ecole.fr", "blog.fr"]);
  });
  it("classe par nombre de concurrents puis agrège les valeurs", () => {
    expect(gap[0]).toMatchObject({
      domain: "ecole.fr",
      competitorsCount: 2,
      competitors: ["a.fr", "b.fr"],
      bestRank: 300,
      minSpamScore: 3,
    });
  });
  it("respecte la limite", () => {
    expect(computeGap([], rows, "moi.fr", 1)).toHaveLength(1);
  });
});

describe("assessTechnical", () => {
  it("page saine", () => {
    expect(
      assessTechnical({ status_code: 200, onpage_score: 92, checks: { is_https: true } }),
    ).toEqual({
      status: "ok",
      issues: [],
      httpStatus: 200,
      onpageScore: 92,
    });
  });
  it("erreur HTTP et non indexable : problème", () => {
    expect(assessTechnical({ status_code: 404 })).toMatchObject({
      status: "probleme",
      issues: ["http_erreur"],
    });
    expect(assessTechnical({ status_code: 200, checks: { is_noindex: true } }).status).toBe(
      "probleme",
    );
  });
  it("manques de balises, redirection, score faible : attention", () => {
    const r = assessTechnical({
      status_code: 301,
      onpage_score: 40,
      checks: { no_title: true, no_description: true, no_h1_tag: true },
    });
    expect(r.status).toBe("attention");
    expect(r.issues).toEqual([
      "redirection",
      "sans_titre",
      "sans_description",
      "sans_h1",
      "score_faible",
    ]);
  });
  it("un contrôle absent n'est pas un défaut", () => {
    expect(assessTechnical({}).status).toBe("ok");
  });
});
