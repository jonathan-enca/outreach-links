import { describe, expect, it } from "vitest";
import type { PlannedQuery } from "@/features/queries/schema";
import { collectionPlanSchema } from "./run";
import { buildCollectionPlan, estimateCollection } from "./plan";
import {
  brandMentionPlan,
  deadPagesSkipReason,
  isGenericBrand,
  queryHasBrand,
  WORTH_LIMITS,
} from "./worth";

const THEME = ["coloriages gratuits à imprimer"];

describe("chantier C : liens morts, ne chercher que ce qui a une chance", () => {
  it("un géant n'est jamais cherché, un site de taille inconnue l'est toujours", () => {
    expect(
      deadPagesSkipReason({ domain: "gros.com", referringDomains: 21_154, sampleUrl: null }, "fr"),
    ).toMatch(/trop gros/);
    expect(
      deadPagesSkipReason(
        {
          domain: "petit.fr",
          referringDomains: WORTH_LIMITS.giantReferringDomains - 1,
          sampleUrl: null,
        },
        "fr",
      ),
    ).toBeNull();
    expect(
      deadPagesSkipReason({ domain: "inconnu.com", referringDomains: null, sampleUrl: null }, "fr"),
    ).toBeNull();
  });

  it("autre langue : visible dans l'adresse d'exemple ou dans l'extension de pays", () => {
    expect(
      deadPagesSkipReason(
        { domain: "outil.io", referringDomains: 3000, sampleUrl: "https://outil.io/es/page" },
        "fr",
      ),
    ).toMatch(/autre langue/);
    expect(
      deadPagesSkipReason({ domain: "shop.de", referringDomains: 300, sampleUrl: null }, "fr"),
    ).toMatch(/autre langue/);
    expect(
      deadPagesSkipReason({ domain: "boutique.fr", referringDomains: 300, sampleUrl: null }, "fr"),
    ).toBeNull();
    // Sans signal de langue (.com sans adresse parlante) : on ne présume rien.
    expect(
      deadPagesSkipReason({ domain: "site.com", referringDomains: 300, sampleUrl: null }, "fr"),
    ).toBeNull();
  });
});

describe("chantier C : mentions de marque, un nom descriptif ne se cherche pas", () => {
  it("un nom fait du thème (même collé) ou trop court est générique", () => {
    expect(isGenericBrand("Mega Coloring", THEME)).toBe(true);
    expect(isGenericBrand("MegaColoring", THEME)).toBe(true);
    expect(isGenericBrand("megacoloring", THEME)).toBe(true);
    expect(isGenericBrand("mega-coloring.com", THEME)).toBe(true);
    expect(isGenericBrand("Coloriages Pro", THEME)).toBe(true);
    expect(isGenericBrand("Zed", THEME)).toBe(true);
  });

  it("un nom distinctif se cherche", () => {
    expect(isGenericBrand("Atelier Plumeau", THEME)).toBe(false);
    expect(isGenericBrand("Pixelmo", THEME)).toBe(false);
    expect(isGenericBrand("Les Petits Pinceaux", THEME)).toBe(false);
  });

  it("jamais de liste propre à un thème : le même nom change de verdict avec le thème", () => {
    expect(isGenericBrand("Atelier Plumeau", ["atelier plumeau sur mesure"])).toBe(true);
    expect(isGenericBrand("Atelier Plumeau", ["jardinage au naturel"])).toBe(false);
  });

  it("plan de marque : garde les écritures distinctives, sinon dit pourquoi rien n'est lancé", () => {
    expect(brandMentionPlan(["Mega Coloring", "Pixelmo"], THEME)).toEqual({
      variants: ["Pixelmo"],
      skipReason: null,
    });
    const none = brandMentionPlan(["Mega Coloring", "megacoloring"], THEME);
    expect(none.variants).toEqual([]);
    expect(none.skipReason).toMatch(/descriptif/);
    expect(brandMentionPlan([], THEME).skipReason).toMatch(/aucun nom/);
  });

  it("requête de marque : comparaison sur le texte compacté", () => {
    expect(queryHasBrand('"Mega Coloring" -site:x.com', ["Mega Coloring"])).toBe(true);
    expect(queryHasBrand('"megacoloring" -site:x.com', ["Mega Coloring"])).toBe(true);
    expect(queryHasBrand('"Pixelmo" -site:x.com', ["Mega Coloring"])).toBe(false);
  });
});

describe("chantier C : plan de collecte et coût annoncé", () => {
  const q = (i: number, over: Partial<PlannedQuery> = {}): PlannedQuery => ({
    q: `requête ${i}`,
    tactic: "inconnus",
    persona: "P",
    target: "home",
    keyword: null,
    score: 0.9,
    rank: i,
    estUsd: 0.006,
    origin: "regle",
    ...over,
  });
  const base = {
    queries: [
      q(2),
      q(3),
      q(1, { q: '"Mega Coloring" -site:mega-coloring.com', tactic: "mentions", persona: null }),
    ],
    competitorDomains: ["magnific.com", "esle.io", "lululataupe.com", "picotatoo.com", "auzou.fr"],
    competitors: [
      {
        domain: "magnific.com",
        referringDomains: 21_154,
        sampleUrl: "https://www.magnific.com/ai",
      },
      {
        domain: "esle.io",
        referringDomains: 3208,
        sampleUrl: "https://esle.io/es/coloring-page/x",
      },
      { domain: "lululataupe.com", referringDomains: 4432, sampleUrl: null },
      { domain: "picotatoo.com", referringDomains: 279, sampleUrl: null },
      { domain: "auzou.fr", referringDomains: 1662, sampleUrl: null },
    ],
    language: "fr",
    theme: THEME[0]!,
    nameVariants: ["Mega Coloring", "MegaColoring"],
    domain: "mega-coloring.com",
    goal: "autorite_generale" as const,
    targetKeywords: [] as string[],
  };

  it("cas mesuré : le géant étranger et le nom descriptif ne coûtent plus rien", () => {
    const plan = buildCollectionPlan(base);
    expect(plan.deadPages).toEqual(["lululataupe.com", "picotatoo.com", "auzou.fr"]);
    expect(plan.skipped.deadPages.map((d) => d.domain)).toEqual(["magnific.com", "esle.io"]);
    expect(plan.mentionKeywords).toEqual([]);
    expect(plan.mentionSerp).toEqual([]);
    expect(plan.skipped.mentions).toMatch(/descriptif/);

    const before = estimateCollection(
      buildCollectionPlan({
        ...base,
        competitors: undefined,
        language: undefined,
        nameVariants: ["Pixelmo"],
        queries: [
          ...base.queries,
          q(9, { q: '"Pixelmo" -site:x.com', tactic: "mentions", persona: null }),
        ],
      }),
    );
    const after = estimateCollection(plan);
    expect(after.phases.morts.calls).toBe(3);
    expect(after.phases.mentions.calls).toBe(0);
    expect(after.phases.mentions.expectedUsd).toBe(0);
    expect(after.expectedUsd).toBeLessThan(before.expectedUsd);
  });

  it("sans information sur les concurrents (anciens appels) : rien n'est écarté", () => {
    const plan = buildCollectionPlan({ ...base, competitors: undefined, language: undefined });
    expect(plan.deadPages).toHaveLength(5);
    expect(plan.skipped.deadPages).toEqual([]);
  });

  it("nom distinctif : la tactique garde ses requêtes", () => {
    const plan = buildCollectionPlan({
      ...base,
      nameVariants: ["Pixelmo"],
      queries: [q(1, { q: '"Pixelmo" -site:x.com', tactic: "mentions", persona: null })],
    });
    expect(plan.mentionKeywords).toEqual(['"Pixelmo"']);
    expect(plan.mentionSerp).toHaveLength(1);
    expect(plan.skipped.mentions).toBeNull();
  });

  it("un plan figé avant le chantier C (sans `skipped`) reste lisible", () => {
    const parsed = collectionPlanSchema.parse({
      intersectionTargets: [],
      serp: [],
      mentionSerp: [],
      mentionKeywords: [],
      content: [],
    });
    expect(parsed.skipped).toEqual({ deadPages: [], mentions: null });
  });
});
