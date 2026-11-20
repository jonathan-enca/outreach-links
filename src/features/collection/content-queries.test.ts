import { describe, expect, it } from "vitest";
import type { PlannedQuery } from "@/features/queries/schema";
import type { SearchRow } from "@/features/search-console/api";
import {
  CONTENT_QUERY_LIMITS,
  contentQueries,
  searchConsoleRowsOf,
  searchConsoleSeeds,
} from "./content-queries";
import { pisteOf } from "@/features/targets/tracking";
import { fromSerp } from "./normalize";
import { buildCollectionPlan } from "./plan";

const row = (key: string, clicks: number, impressions = 50): SearchRow => ({
  key,
  clicks,
  impressions,
  position: 8,
});

const base = {
  theme: "coloriage enfant",
  language: "fr",
  domain: "mega-coloring.com",
  nameVariants: ["Mega Coloring"],
  perQueryUsd: 0.0105,
};

describe("contentQueries (MQ.4)", () => {
  it("ajoute les gabarits du thème, avec la piste ressources et l'origine contenu_theme", () => {
    const out = contentQueries(base);
    expect(out.map((q) => q.q)).toEqual([
      "liste de ressources coloriage enfant",
      "sites de référence coloriage enfant",
    ]);
    for (const q of out) {
      expect(q.tactic).toBe("ressources");
      expect(q.origin).toBe("contenu_theme");
      expect(q.target).toBe("home");
      expect(q.estUsd).toBe(0.0105);
    }
  });

  it("ajoute les requêtes Search Console, les plus de clics d'abord, avec leur origine", () => {
    const out = contentQueries({
      ...base,
      searchConsoleQueries: [row("dessin à imprimer", 3), row("coloriage licorne", 40)],
    });
    const sc = out.filter((q) => q.origin === "contenu_search_console");
    expect(sc.map((q) => q.q)).toEqual([
      "liste de ressources coloriage licorne",
      "liste de ressources dessin à imprimer",
    ]);
    expect(sc.every((q) => q.tactic === "ressources")).toBe(true);
  });

  it("n'utilise jamais une requête de marque ni une requête peu vue", () => {
    const seeds = searchConsoleSeeds(
      [
        row("mega coloring", 90),
        row("megacoloring avis", 50),
        row("coloriage rare", 5, 2),
        row("coloriage licorne", 40),
      ],
      "mega-coloring.com",
      ["Mega Coloring"],
    );
    expect(seeds).toEqual(["coloriage licorne"]);
  });

  it("dédoublonne et plafonne les requêtes Search Console", () => {
    const many = Array.from({ length: 9 }, (_, i) => row(`sujet ${i} enfant`, 100 - i));
    const seeds = searchConsoleSeeds([...many, row("Sujet 0 Enfant", 1)], "mega-coloring.com", []);
    expect(seeds).toHaveLength(CONTENT_QUERY_LIMITS.maxSearchConsoleQueries);
    expect(new Set(seeds.map((s) => s.toLowerCase())).size).toBe(seeds.length);
  });

  it("ne duplique pas une requête déjà présente dans l'univers", () => {
    const out = contentQueries({
      ...base,
      existing: ["Liste de ressources coloriage enfant"],
    });
    expect(out.map((q) => q.q)).toEqual(["sites de référence coloriage enfant"]);
  });

  it("ignore les lignes abîmées de l'état des lieux sans jamais lever", () => {
    expect(searchConsoleRowsOf(null)).toEqual([]);
    expect(searchConsoleRowsOf({ searchConsole: { queries: "x" } })).toEqual([]);
    expect(
      searchConsoleRowsOf({
        searchConsole: {
          queries: [{ key: "coloriage", clicks: "4", impressions: 9 }, 7, { clicks: 1 }],
        },
      }),
    ).toEqual([{ key: "coloriage", clicks: 4, impressions: 9, position: 0 }]);
  });

  it("produit des requêtes anglaises pour un site en anglais", () => {
    const out = contentQueries({ ...base, language: "en", theme: "kids colouring" });
    expect(out.map((q) => q.q)).toContain("kids colouring resource list");
  });
});

describe("buildCollectionPlan avec les requêtes de contenu (MQ.4)", () => {
  const universe = (n: number): PlannedQuery[] =>
    Array.from({ length: n }, (_, i) => ({
      q: `ressources sujet ${i}`,
      tactic: "ressources" as const,
      persona: "Blogueurs",
      target: "home" as const,
      keyword: null,
      score: 1 - i * 0.01,
      rank: i + 1,
      estUsd: 0.01,
      origin: "llm" as const,
    }));

  const input = {
    competitorDomains: [],
    theme: "coloriage enfant",
    nameVariants: ["Mega Coloring"],
    domain: "mega-coloring.com",
    goal: "autorite_generale" as const,
    targetKeywords: [],
  };

  it("place les requêtes de contenu après l'univers et renumérote les rangs", () => {
    const extra = contentQueries({ ...base, searchConsoleQueries: [row("coloriage licorne", 9)] });
    const plan = buildCollectionPlan({ ...input, queries: universe(3), contentQueries: extra });
    expect(plan.serp.map((q) => q.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(plan.serp.slice(3).map((q) => q.origin)).toEqual([
      "contenu_theme",
      "contenu_theme",
      "contenu_search_console",
    ]);
  });

  it("garde le plafond de la phase SERP, extras compris", () => {
    const extra = contentQueries({ ...base, searchConsoleQueries: [row("coloriage licorne", 9)] });
    const plan = buildCollectionPlan({ ...input, queries: universe(200), contentQueries: extra });
    expect(plan.serp.length).toBeLessThanOrEqual(60);
    expect(plan.serp.slice(-extra.length).map((q) => q.origin)).toEqual([
      "contenu_theme",
      "contenu_theme",
      "contenu_search_console",
    ]);
  });

  it("sans requêtes de contenu, le plan est identique à l'ancien", () => {
    const plan = buildCollectionPlan({ ...input, queries: universe(4) });
    expect(plan.serp.map((q) => q.q)).toEqual(universe(4).map((q) => q.q));
  });
});

describe("contentQueries : publics du profil (MQ.4)", () => {
  const base = {
    theme: "calendrier scolaire",
    language: "fr",
    domain: "mon-site.fr",
    nameVariants: [],
    perQueryUsd: 0.006,
  };

  it("une requête « sites de référence {public} {thème} » par public, origine contenu_public", () => {
    const out = contentQueries({ ...base, publics: ["enseignants", "parents"] });
    const pub = out.filter((q) => q.origin === "contenu_public");
    expect(pub.map((q) => q.q)).toEqual([
      "sites de référence enseignants calendrier scolaire",
      "sites de référence parents calendrier scolaire",
    ]);
    expect(pub.every((q) => q.tactic === "ressources")).toBe(true);
  });

  it("plafonné à maxPublics, dédoublonné, sans public vide", () => {
    const out = contentQueries({
      ...base,
      publics: ["Enseignants", "enseignants", " ", "parents", "élèves", "profs"],
    });
    const pub = out.filter((q) => q.origin === "contenu_public");
    expect(pub).toHaveLength(CONTENT_QUERY_LIMITS.maxPublics);
    expect(pub[0]?.q).toContain("enseignants");
  });

  it("aucun public : aucune requête de public, la requête de thème reste", () => {
    const out = contentQueries({ ...base, publics: [] });
    expect(out.some((q) => q.origin === "contenu_public")).toBe(false);
    expect(out.length).toBeGreaterThan(0);
  });

  it("sans thème, aucune requête de public ni de thème", () => {
    const out = contentQueries({ ...base, theme: "", publics: ["enseignants"] });
    expect(out).toEqual([]);
  });
});

const CTX = {
  ownDomain: "mon-site.fr",
  competitorDomains: [],
  language: "fr",
  theme: "calendrier scolaire",
  nameVariants: [],
  targetKeywords: [],
};

describe("piste propre des requêtes de contenu (MQ.4)", () => {
  it("un résultat de requête de contenu garde la source requete_contenu", () => {
    const q = {
      q: "liste de ressources calendrier",
      tactic: "ressources",
      persona: null,
      target: "home",
      keyword: null,
      score: 0.5,
      rank: 1,
      estUsd: 0.006,
      origin: "contenu_theme",
    } as const;
    const [c] = fromSerp(
      q as never,
      [{ domain: "exemple.fr", url: "https://exemple.fr/a", title: "A", rank: 1 } as never],
      CTX,
    );
    expect(c?.source).toBe("requete_contenu");
  });

  it("une requête ordinaire reste en source serp", () => {
    const q = {
      q: "calendrier scolaire",
      tactic: "inconnus",
      persona: "x",
      origin: "llm",
    } as const;
    const [c] = fromSerp(
      q as never,
      [{ domain: "exemple.fr", url: "https://exemple.fr/a", title: "A", rank: 1 } as never],
      CTX,
    );
    expect(c?.source).toBe("serp");
  });

  it("pisteOf : requete_contenu l'emporte sur serp, cède à content", () => {
    expect(pisteOf([{ source: "serp" }, { source: "requete_contenu" }], ["ressources"])).toBe(
      "requete_contenu",
    );
    expect(pisteOf([{ source: "content" }, { source: "requete_contenu" }], [])).toBe("content");
  });
});
