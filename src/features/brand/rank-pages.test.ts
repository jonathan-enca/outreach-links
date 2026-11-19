import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_RANK } from "./limits";
import {
  pageKey,
  pageScore,
  positionFactor,
  rankPages,
  trafficScorer,
  type RankedKeyword,
} from "./rank-pages";
import { rankedPageSchema } from "./schema";

/**
 * Données FIGÉES, tirées de la base le 19/11/2026 (aucun appel payant) : les mots-clés positionnés de
 * deux sites de thèmes différents, tels que DataForSEO les a renvoyés pour leur audit du 18/11
 * (`audits.links_state.keywords.top` et `dataforseo_cache`). Une ligne = mot-clé|position|volume|adresse.
 */
function fixture(site: string): RankedKeyword[] {
  return readFileSync(path.join(__dirname, "fixtures", `ranked-keywords.${site}.txt`), "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      const [keyword = "", position, volume, url = ""] = line.split("|");
      return { keyword, position: Number(position), volume: Number(volume), url };
    });
}

const kw = (url: string, position: number, volume: number, keyword = `mot ${url}`) => ({
  keyword,
  position,
  volume,
  url,
});
const paths = (pages: { url: string }[]) => pages.map((p) => new URL(p.url).pathname);

describe("formule volume × position (MC.7)", () => {
  it("facteur de position : faible en haut de page 1, maximal de 4 à 20, jamais nul au-delà", () => {
    expect([1, 3].map(positionFactor)).toEqual([0.3, 0.3]);
    expect([4, 20].map(positionFactor)).toEqual([1, 1]);
    expect([21, 50].map(positionFactor)).toEqual([0.7, 0.7]);
    expect([51, 80, 500].map(positionFactor)).toEqual([0.4, 0.4, 0.4]);
    expect(PAGE_RANK.beyondFactor).toBeGreaterThan(0);
  });

  it("score = log10(1 + volume) × facteur ; nul sans volume ou sans position", () => {
    expect(pageScore(999, 10)).toBe(3);
    expect(pageScore(999, 2)).toBe(0.9);
    expect(pageScore(999, 30)).toBe(2.1);
    expect(pageScore(999, 80)).toBe(1.2);
    expect(pageScore(0, 5)).toBe(0);
    expect(pageScore(100, 0)).toBe(0);
  });

  it("une page à fort volume en position 80 reste devant une page à faible volume en position 10", () => {
    expect(pageScore(40_000, 80)).toBeGreaterThan(pageScore(30, 10));
  });
});

describe("classement des pages sur des données réelles figées", () => {
  it("squadraplanning.com : les calculateurs et l'article sur le temps de pause sont dans les 5 premières pages", () => {
    const pages = rankPages(fixture("squadraplanning"), {
      domain: "squadraplanning.com",
      language: "fr",
    });
    expect(paths(pages).slice(0, 5)).toEqual([
      "/fr/blog/temps-pause-legal-travail",
      "/fr/calculators/conges-payes",
      "/fr/calculators/jours-ouvres",
      "/fr/calculators/cout-salarie",
    ]);
    // Volume total, meilleure position et nombre de mots-clés de chaque page.
    expect(pages.map((p) => [p.volume, p.position, p.count])).toEqual([
      [470, 21, 2],
      [1360, 77, 6],
      [1170, 85, 4],
      [880, 82, 8],
    ]);
    expect(pages[2]!.keywords[0]).toBe("calcul nombre de jours ouvrés entre deux dates");
    for (const p of pages) expect(rankedPageSchema.safeParse(p).success).toBe(true);
  });

  it("monjardinbio.com (autre thème) : les pages à fort volume en positions 4 à 20 passent devant", () => {
    const pages = rankPages(fixture("monjardinbio"), {
      domain: "monjardinbio.com",
      language: "fr",
    });
    expect(pages).toHaveLength(53);
    const top = pages.slice(0, 5);
    expect(paths(top)).toEqual([
      "/blogs/infos/les-cloportes-des-auxiliaires-indispensables-au-jardin",
      "/blogs/infos/comment-cultiver-les-celeris-raves",
      "/blogs/infos/comment-tailler-lolivier",
      "/products/gazon-de-placage-vendu-au-m2",
      "/products/larves-de-coccinelles-15-pots-ou-2-arbustes",
    ]);
    for (const p of top) {
      expect(p.position).toBeGreaterThanOrEqual(4);
      expect(p.position).toBeLessThanOrEqual(20);
    }
    expect(top[0]).toMatchObject({ volume: 99_000, position: 17, count: 2 });
    const rank = (needle: string) => pages.findIndex((p) => p.url.includes(needle)) + 1;
    // Déjà premier ou deuxième sur Google : gros volume, mais loin derrière (un lien change peu).
    expect(rank("collections/paillage-vegetal")).toBeGreaterThan(40);
    expect(rank("la-blette-culture-et-recettes")).toBeGreaterThan(40);
    // Position 93 : toujours classée, jamais éliminée.
    expect(rank("courge-jack-o-lantern-bio")).toBeGreaterThan(0);
    // Classement décroissant, sans page à score nul.
    const scores = pages.map((p) => pageScore(p.volume, p.position));
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(Math.min(...scores)).toBeGreaterThan(0);
  });

  it("garde au plus 5 mots-clés par page, les plus recherchés d'abord", () => {
    const pages = rankPages(fixture("squadraplanning"), { domain: "squadraplanning.com" });
    const cost = pages.find((p) => p.url.endsWith("/cout-salarie"))!;
    expect(cost.count).toBe(8);
    expect(cost.keywords).toHaveLength(PAGE_RANK.keptKeywordsPerPage);
    expect(cost.keywords.slice(0, 2).sort()).toEqual([
      "calcul coût salaire",
      "cout salarié entreprise",
    ]);
  });
});

describe("rankPages : ce qui est écarté ou regroupé", () => {
  const o = "https://exemple.fr";

  it("regroupe les écritures d'une même adresse (www, barre finale) et additionne les volumes", () => {
    const pages = rankPages(
      [kw(`${o}/guide`, 12, 100, "a"), kw("https://www.exemple.fr/guide/", 8, 50, "b")],
      { domain: "exemple.fr" },
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ volume: 150, position: 8, count: 2, keywords: ["a", "b"] });
  });

  it("un mot-clé cité deux fois pour la même page ne compte qu'une fois", () => {
    const pages = rankPages([kw(`${o}/guide`, 12, 100, "a"), kw(`${o}/guide`, 15, 100, "a")], {
      domain: "exemple.fr",
    });
    expect(pages[0]).toMatchObject({ volume: 100, position: 12, count: 1 });
  });

  it("écarte l'accueil, les autres domaines, les fichiers, les pages jamais proposées et les adresses à paramètres", () => {
    const pages = rankPages(
      [
        kw(`${o}/`, 1, 9_000),
        kw(o, 1, 9_000),
        kw("https://autre.fr/guide", 5, 9_000),
        kw(`${o}/catalogue.pdf`, 5, 9_000),
        kw(`${o}/mentions-legales`, 5, 9_000),
        kw(`${o}/panier`, 5, 9_000),
        kw(`${o}/recherche?q=a`, 5, 9_000),
        kw("pas une adresse", 5, 9_000),
        kw(`${o}/sans-volume`, 5, 0),
        kw(`${o}/guide`, 0, 500),
        kw(`${o}/outil`, 40, 300),
      ],
      { domain: "exemple.fr", language: "fr" },
    );
    expect(paths(pages)).toEqual(["/outil"]);
  });

  it("site à plusieurs langues : seule la version de la campagne, jamais la racine d'une langue", () => {
    const list = [
      kw(`${o}/fr/guide`, 10, 100),
      kw(`${o}/en/guide`, 10, 900),
      kw(`${o}/fr`, 2, 5_000),
      kw(`${o}/outil`, 10, 50),
    ];
    expect(paths(rankPages(list, { domain: "exemple.fr", language: "fr" }))).toEqual([
      "/fr/guide",
      "/outil",
    ]);
    expect(paths(rankPages(list, { domain: "exemple.fr", language: "en" }))).toEqual([
      "/en/guide",
      "/outil",
    ]);
  });

  it("site sans mot-clé positionné : aucun classement (l'ancien tri par adresse s'applique)", () => {
    expect(rankPages([], { domain: "exemple.fr", language: "fr" })).toEqual([]);
  });

  it("est déterministe, à égalité : plus gros volume, puis meilleure position, puis adresse", () => {
    const list = [kw(`${o}/b`, 10, 100), kw(`${o}/a`, 10, 100), kw(`${o}/c`, 5, 100)];
    const once = paths(rankPages(list, { domain: "exemple.fr" }));
    expect(once).toEqual(["/c", "/a", "/b"]);
    expect(paths(rankPages([...list].reverse(), { domain: "exemple.fr" }))).toEqual(once);
  });
});

describe("trafficScorer", () => {
  it("retrouve le score d'une page quelle que soit l'écriture de son adresse, 0 sinon", () => {
    const score = trafficScorer([
      { url: "https://www.exemple.fr/guide", volume: 999, position: 10, count: 1, keywords: ["a"] },
    ]);
    expect(score("https://exemple.fr/guide/")).toBe(3);
    expect(score("https://exemple.fr/autre")).toBe(0);
    expect(trafficScorer(undefined)("https://exemple.fr/guide")).toBe(0);
    expect(pageKey("https://www.exemple.fr/guide/")).toBe("exemple.fr/guide");
  });
});
