import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { BrandProfile } from "@/features/brand/schema";
import type { LlmClient } from "@/lib/llm/client";
import { buildQueriesPrompt, generateRecipes, QUERIES_SYSTEM } from "./generate";
import { QUERY_LIMITS, queryBudgetUsd } from "./limits";
import {
  brandQueries,
  buildQueryPlan,
  cleanQuery,
  estimateQueryPhase,
  fallbackRecipe,
  nicheKey,
  perQueryUsd,
  personaKey,
  type PersonaRecipe,
} from "./plan";
import {
  buildAndStoreQueryUniverse,
  buildUniverse,
  ensureQueryUniverse,
  getLatestQueryUniverse,
  type QueryDeps,
} from "./service";

const PROFILE: BrandProfile = {
  activity: "Site de coloriages gratuits à imprimer pour les enfants.",
  offer: "Des centaines de coloriages à télécharger en PDF.",
  language: "fr",
  audience: ["Parents", "Enseignants"],
  linkable_resources: [],
  name_variants: ["Mega Coloring", "mega-coloring", "megacoloring", "mega-coloring.com"],
  tone: "chaleureux",
  personas: [
    {
      label: "Enseignants et assistantes maternelles",
      sites: "blogs de classe",
      reason: "Activités à imprimer pour la classe.",
    },
    {
      label: "Médiathèques",
      sites: "pages ressources en ligne",
      reason: "Elles recommandent des activités gratuites.",
    },
    {
      label: "Associations de loisirs",
      sites: "centres de loisirs",
      reason: "Animations pour les enfants.",
    },
  ],
};

const recipe = (
  label: string,
  qs: [string, "inconnus" | "ressources", number][],
): PersonaRecipe => ({
  label,
  origin: "llm",
  queries: qs.map(([q, tactic, rating]) => ({ q, tactic, rating })),
});

const RECIPES: PersonaRecipe[] = [
  recipe("Enseignants et assistantes maternelles", [
    ["coloriage maternelle blog de classe", "inconnus", 5],
    ["activités à imprimer pour la classe", "ressources", 4],
    ["ressources pédagogiques maternelle", "ressources", 4],
  ]),
  recipe("Médiathèques", [
    ["ressources en ligne enfants médiathèque", "ressources", 4],
    ["activités gratuites enfants bibliothèque", "inconnus", 3],
  ]),
  recipe("Associations de loisirs", [["centre de loisirs activités enfants", "inconnus", 3]]),
];

const base = {
  theme: "coloriages",
  language: "fr",
  domain: "mega-coloring.com",
  goal: "autorite_generale" as const,
  targetKeywords: [] as string[],
  nameVariants: PROFILE.name_variants,
  recipes: RECIPES,
  maxQueries: 40,
  perQueryUsd: 0.006,
};

describe("budget et annonce de coût", () => {
  it("une part du budget cible est réservée aux recherches d'éditeurs", () => {
    expect(queryBudgetUsd()).toBeCloseTo(0.2, 6);
    expect(queryBudgetUsd(2)).toBeCloseTo(0.4, 6);
  });

  it("le nombre de requêtes suit le budget, entre les bornes", () => {
    const e = estimateQueryPhase();
    expect(e.perQueryUsd).toBe(perQueryUsd());
    expect(e.maxQueries).toBeGreaterThanOrEqual(QUERY_LIMITS.minQueries);
    expect(e.maxQueries).toBeLessThanOrEqual(QUERY_LIMITS.maxQueries);
    expect(e.totalUsd).toBeLessThanOrEqual(e.budgetUsd + e.perQueryUsd);
    expect(estimateQueryPhase(2).maxQueries).toBeGreaterThan(e.maxQueries - 1);
    expect(estimateQueryPhase(0.01).maxQueries).toBe(QUERY_LIMITS.minQueries);
    expect(estimateQueryPhase(1000).maxQueries).toBe(QUERY_LIMITS.maxQueries);
  });
});

describe("nettoyage des requêtes", () => {
  it("retire opérateurs, adresses et guillemets, refuse trop court ou trop long", () => {
    expect(cleanQuery('"Coloriage Licorne" site:exemple.fr')).toBe("coloriage licorne");
    expect(cleanQuery("https://x.fr coloriage enfants")).toBe("coloriage enfants");
    expect(cleanQuery("coloriage")).toBeNull();
    expect(cleanQuery("a b c d e f g h i j")).toBeNull();
  });

  it("écarte une requête qui contient la marque", () => {
    expect(cleanQuery("avis mega coloring", ["megacoloring"])).toBeNull();
    expect(cleanQuery("coloriage maternelle", ["megacoloring"])).toBe("coloriage maternelle");
  });

  it("clés de niche et de persona stables malgré accents et casse", () => {
    expect(nicheKey("  Coloriages  à imprimer ")).toBe(nicheKey("coloriages a imprimer"));
    expect(personaKey("Médiathèques")).toBe(personaKey("mediatheques"));
  });
});

describe("requêtes de marque (tactique 3)", () => {
  it("variantes du nom entre guillemets, hors du site, sans domaine ni doublon", () => {
    const q = brandQueries("www.mega-coloring.com", PROFILE.name_variants);
    expect(q).toContain('"Mega Coloring" -site:mega-coloring.com');
    expect(q.some((x) => x.includes('.com"'))).toBe(false);
    expect(new Set(q).size).toBe(q.length);
    expect(q.length).toBeLessThanOrEqual(QUERY_LIMITS.maxMentionQueries);
  });
});

describe("plan classé", () => {
  it("objectif autorité : page citée = accueil, trois tactiques présentes, rangs consécutifs", () => {
    const plan = buildQueryPlan(base);
    expect(plan.every((q) => q.target === "home" && q.keyword === null)).toBe(true);
    expect(new Set(plan.map((q) => q.tactic))).toEqual(
      new Set(["inconnus", "ressources", "mentions"]),
    );
    expect(plan.map((q) => q.rank)).toEqual(plan.map((_, i) => i + 1));
    for (let i = 1; i < plan.length; i++)
      expect(plan[i - 1]!.score).toBeGreaterThanOrEqual(plan[i]!.score);
    expect(plan[0]!.q).toBe("coloriage maternelle blog de classe");
  });

  it("aucune requête de découverte ne contient la marque", () => {
    const withBrand = [
      ...RECIPES,
      recipe("Blogueurs", [
        ["avis mega coloring", "inconnus", 5],
        ["megacoloring test", "inconnus", 5],
      ]),
    ];
    const plan = buildQueryPlan({ ...base, recipes: withBrand });
    const discovery = plan.filter((q) => q.tactic !== "mentions");
    expect(discovery.some((q) => /mega.?coloring/i.test(q.q))).toBe(false);
  });

  it("objectif mots-clés : requêtes par mot-clé retenu, ciblant la page du mot-clé, promues", () => {
    const plan = buildQueryPlan({
      ...base,
      goal: "mots_cles",
      targetKeywords: ["coloriage licorne", "mandala enfant"],
    });
    const kw = plan.filter((q) => q.target === "keyword");
    expect(kw.map((q) => q.q)).toEqual(
      expect.arrayContaining([
        "ressources coloriage licorne",
        "blog coloriage licorne",
        "ressources mandala enfant",
      ]),
    );
    expect(kw.every((q) => q.keyword !== null && q.persona === null)).toBe(true);
    expect(plan.slice(0, 4).some((q) => q.target === "keyword")).toBe(true);
  });

  it("l'objectif autorité ignore les mots-clés laissés dans le site", () => {
    const plan = buildQueryPlan({ ...base, targetKeywords: ["coloriage licorne"] });
    expect(plan.some((q) => q.target === "keyword")).toBe(false);
  });

  it("coupe au budget, garde les requêtes de marque garanties, reste diversifié", () => {
    const plan = buildQueryPlan({ ...base, maxQueries: 6 });
    expect(plan).toHaveLength(6);
    expect(plan.filter((q) => q.tactic === "mentions")).toHaveLength(QUERY_LIMITS.reservedMentions);
    expect(new Set(plan.filter((q) => q.persona).map((q) => q.persona)).size).toBeGreaterThan(1);
  });

  it("dédoublonne les requêtes identiques entre personas", () => {
    const dup = [
      recipe("A", [["coloriage enfants blog", "inconnus", 4]]),
      recipe("B", [["Coloriage  enfants blog", "inconnus", 5]]),
    ];
    const plan = buildQueryPlan({ ...base, recipes: dup });
    expect(plan.filter((q) => q.q === "coloriage enfants blog")).toHaveLength(1);
  });

  it("le secours sans LLM produit des requêtes génériques du thème, dans la langue", () => {
    expect(fallbackRecipe("running", "en").queries.map((q) => q.q)).toContain("running resources");
    const plan = buildQueryPlan({ ...base, recipes: [fallbackRecipe("coloriages", "fr")] });
    expect(plan.some((q) => q.q === "ressources coloriages" && q.origin === "secours")).toBe(true);
  });

  it("coût estimé par requête et total cohérents", () => {
    const e = estimateQueryPhase();
    const plan = buildQueryPlan({ ...base, maxQueries: e.maxQueries, perQueryUsd: e.perQueryUsd });
    expect(plan.length * e.perQueryUsd).toBeLessThanOrEqual(e.totalUsd + 1e-9);
  });
});

function fakeLlm(
  out: (prompt: string) => unknown,
  cost = 0.0012,
): { llm: LlmClient; calls: { prompt: string }[] } {
  const calls: { prompt: string }[] = [];
  const llm = {
    generate: vi.fn(async (o: { prompt: string; schema: { parse: (x: unknown) => unknown } }) => {
      calls.push({ prompt: o.prompt });
      return { data: o.schema.parse(out(o.prompt)), costUsd: cost };
    }),
  } as unknown as LlmClient;
  return { llm, calls };
}

const llmOut = (labels: string[]) => ({
  personas: labels.map((label) => ({
    label,
    queries: [
      { q: `blog ${label.toLowerCase()} activités`, tactic: "inconnus", rating: 4 },
      { q: `ressources ${label.toLowerCase()} enfants`, tactic: "ressources", rating: 3 },
      { q: `avis mega coloring ${label.toLowerCase()}`, tactic: "inconnus", rating: 5 },
    ],
  })),
});

describe("génération des recettes (un seul appel LLM)", () => {
  it("le prompt encadre le contenu non fiable et n'envoie que les personas demandées", () => {
    const p = buildQueriesPrompt({
      theme: "coloriages",
      language: "fr",
      domain: "mega-coloring.com",
      profile: PROFILE,
      labels: ["Médiathèques"],
    });
    expect(p).toContain("<donnees_non_fiables>");
    expect(p).toContain("Médiathèques");
    expect(p).not.toContain("Associations de loisirs");
    expect(QUERIES_SYSTEM).toContain("NON FIABLE");
  });

  it("filtre les requêtes avec la marque, retrouve les personas malgré la casse, un appel", async () => {
    const { llm, calls } = fakeLlm(() => llmOut(["médiathèques", "ASSOCIATIONS DE LOISIRS"]));
    const out = await generateRecipes({
      req: {
        theme: "coloriages",
        language: "fr",
        domain: "mega-coloring.com",
        profile: PROFILE,
        labels: ["Médiathèques", "Associations de loisirs"],
      },
      brandKeys: ["megacoloring"],
      llm,
      workspaceId: "w1",
    });
    expect(calls).toHaveLength(1);
    expect([...out!.recipes.keys()]).toEqual(["Médiathèques", "Associations de loisirs"]);
    for (const qs of out!.recipes.values()) {
      expect(qs.some((q) => /mega/.test(q.q))).toBe(false);
      expect(qs).toHaveLength(2);
    }
  });

  it("renvoie null sans client, sans personas, en panne ou sortie inutilisable", async () => {
    const req = {
      theme: "coloriages",
      language: "fr",
      domain: "mega-coloring.com",
      profile: PROFILE,
      labels: ["Médiathèques"],
    };
    expect(await generateRecipes({ req, brandKeys: [], llm: null, workspaceId: null })).toBeNull();
    const { llm } = fakeLlm(() => llmOut([]));
    expect(
      await generateRecipes({ req: { ...req, labels: [] }, brandKeys: [], llm, workspaceId: null }),
    ).toBeNull();
    const broken = {
      generate: async () => {
        throw new Error("panne");
      },
    } as unknown as LlmClient;
    expect(
      await generateRecipes({ req, brandKeys: [], llm: broken, workspaceId: null }),
    ).toBeNull();
    const unknown = fakeLlm(() => llmOut(["Inconnue"]));
    expect(
      await generateRecipes({ req, brandKeys: [], llm: unknown.llm, workspaceId: null }),
    ).toBeNull();
  });
});

const LABELS = PROFILE.personas.map((p) => p.label);

function deps(llm: LlmClient | null, db: ReturnType<typeof fakeSupabase>): QueryDeps {
  return { makeLlm: () => llm, getServiceClient: () => db.client };
}

const input = {
  profile: PROFILE,
  theme: "coloriages",
  language: "fr",
  domain: "mega-coloring.com",
  goal: "autorite_generale" as const,
  targetKeywords: [] as string[],
  workspaceId: "w1",
};

describe("recettes en cache par niche, langue et persona", () => {
  it("1er client : un appel, recettes écrites ; 2e client de la même niche : zéro appel", async () => {
    const db = fakeSupabase({ query_recipes: [] });
    const first = fakeLlm(() => llmOut(LABELS));
    const a = await buildUniverse(input, deps(first.llm, db));
    expect(first.calls).toHaveLength(1);
    expect(a.recipes).toEqual({ cache: 0, generated: 3, fallback: 0 });
    expect(a.llmCostUsd).toBeCloseTo(0.0012, 6);
    expect(db.tables.query_recipes).toHaveLength(3);

    const second = fakeLlm(() => llmOut(LABELS));
    const b = await buildUniverse(
      { ...input, domain: "autre-site.fr", profile: { ...PROFILE, name_variants: ["Autre Site"] } },
      deps(second.llm, db),
    );
    expect(second.calls).toHaveLength(0);
    expect(b.recipes).toEqual({ cache: 3, generated: 0, fallback: 0 });
    expect(b.llmCostUsd).toBe(0);
    expect(b.queries.length).toBeGreaterThan(0);
  });

  it("une niche ou une langue différente ne réutilise pas la recette", async () => {
    const db = fakeSupabase({ query_recipes: [] });
    await buildUniverse(input, deps(fakeLlm(() => llmOut(LABELS)).llm, db));
    const other = fakeLlm(() => llmOut(LABELS));
    await buildUniverse({ ...input, theme: "chaussures de course" }, deps(other.llm, db));
    await buildUniverse({ ...input, language: "en" }, deps(other.llm, db));
    expect(other.calls).toHaveLength(2);
    expect(db.tables.query_recipes).toHaveLength(9);
  });

  it("seules les personas sans recette sont envoyées au modèle", async () => {
    const db = fakeSupabase({ query_recipes: [] });
    await buildUniverse(
      { ...input, profile: { ...PROFILE, personas: PROFILE.personas.slice(0, 2) } },
      deps(fakeLlm(() => llmOut(LABELS.slice(0, 2))).llm, db),
    );
    const next = fakeLlm(() => llmOut([LABELS[2]!]));
    const out = await buildUniverse(input, deps(next.llm, db));
    expect(next.calls).toHaveLength(1);
    expect(next.calls[0]!.prompt).toContain("Associations de loisirs");
    expect(next.calls[0]!.prompt).not.toContain("Médiathèques");
    expect(out.recipes).toEqual({ cache: 2, generated: 1, fallback: 0 });
  });

  it("sans clé LLM ou en panne : secours générique, rien en cache, jamais d'exception", async () => {
    const db = fakeSupabase({ query_recipes: [] });
    const out = await buildUniverse(input, deps(null, db));
    expect(out.recipes.fallback).toBe(1);
    expect(out.queries.some((q) => q.origin === "secours")).toBe(true);
    expect(db.tables.query_recipes).toHaveLength(0);
    const down = {
      makeLlm: () => {
        throw new Error("pas de clé");
      },
      getServiceClient: () => {
        throw new Error("pas de base");
      },
    };
    expect((await buildUniverse(input, down)).queries.length).toBeGreaterThan(0);
  });

  it("une recette illisible en cache est ignorée et régénérée", async () => {
    const db = fakeSupabase({
      query_recipes: [
        {
          niche_key: "coloriages",
          language: "fr",
          persona_key: personaKey(LABELS[1]!),
          recipe_version: 1,
          queries: [{ nope: true }],
        },
      ],
    });
    const llm = fakeLlm(() => llmOut(LABELS));
    const out = await buildUniverse(input, deps(llm.llm, db));
    expect(out.recipes.generated).toBe(3);
  });
});

describe("univers enregistré", () => {
  const site = {
    id: "s1",
    workspace_id: "w1",
    domain: "mega-coloring.com",
    niche: "coloriages",
    language: "fr",
    goal: "mots_cles",
    target_keywords: ["coloriage licorne"],
  };
  const profileRow = {
    site_id: "s1",
    version: 3,
    source: "llm",
    profile: PROFILE,
    pages_read: [],
    cost_usd: 0,
    created_at: "2026-11-15T00:00:00Z",
  };

  it("enregistre l'univers avec la version du profil, le budget et le coût, et le relit", async () => {
    const db = fakeSupabase({
      sites: [site],
      brand_profiles: [profileRow],
      query_recipes: [],
      query_universes: [],
      events: [],
    });
    const { llm } = fakeLlm(() => llmOut(LABELS));
    const stored = await buildAndStoreQueryUniverse(
      db.client,
      { siteId: "s1", userId: "u1" },
      deps(llm, db),
    );
    expect(stored).not.toBeNull();
    expect(stored!.brandProfileVersion).toBe(3);
    expect(stored!.goal).toBe("mots_cles");
    expect(stored!.queries.some((q) => q.target === "keyword")).toBe(true);
    expect(stored!.estimatedUsd).toBeCloseTo(stored!.queries.length * perQueryUsd(), 5);
    expect(stored!.estimatedUsd).toBeLessThanOrEqual(estimateQueryPhase().totalUsd + 1e-9);
    expect(db.tables.events!.some((e) => e.type === "query_universe.created")).toBe(true);
    const again = await getLatestQueryUniverse(db.client, "s1");
    expect(again?.queries).toHaveLength(stored!.queries.length);
  });

  it("sans profil de marque ou sans thème : rien n'est inventé", async () => {
    const llm = fakeLlm(() => llmOut(LABELS));
    const noProfile = fakeSupabase({
      sites: [site],
      brand_profiles: [],
      query_recipes: [],
      query_universes: [],
    });
    expect(
      await buildAndStoreQueryUniverse(
        noProfile.client,
        { siteId: "s1", userId: null },
        deps(llm.llm, noProfile),
      ),
    ).toBeNull();
    const noTheme = fakeSupabase({
      sites: [{ ...site, niche: null }],
      brand_profiles: [profileRow],
      query_universes: [],
    });
    expect(
      await buildAndStoreQueryUniverse(
        noTheme.client,
        { siteId: "s1", userId: null },
        deps(llm.llm, noTheme),
      ),
    ).toBeNull();
    expect(llm.calls).toHaveLength(0);
  });

  // MU.0 : en production, `query_universes` était vide : l'univers n'était écrit que par l'écran de
  // relecture. Le job de découverte le garantit désormais pour tout audit, d'où qu'il soit lancé.
  it("garantit l'univers d'un site qui n'en a pas (audit lancé hors de l'écran de relecture)", async () => {
    const db = fakeSupabase({
      sites: [site],
      brand_profiles: [profileRow],
      query_recipes: [],
      query_universes: [],
      events: [],
    });
    const { llm, calls } = fakeLlm(() => llmOut(LABELS));
    const out = await ensureQueryUniverse(db.client, { siteId: "s1", userId: "u1" }, deps(llm, db));
    expect(out.status).toBe("cree");
    expect(db.tables.query_universes).toHaveLength(1);
    expect(calls).toHaveLength(1);

    // Rejouable (reprise Inngest) : un univers à jour est réutilisé, sans nouvel appel payant.
    const again = await ensureQueryUniverse(
      db.client,
      { siteId: "s1", userId: "u1" },
      deps(llm, db),
    );
    expect(again.status).toBe("existant");
    expect(db.tables.query_universes).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it("régénère l'univers quand le profil de marque a changé de version", async () => {
    const db = fakeSupabase({
      sites: [site],
      brand_profiles: [profileRow],
      query_recipes: [],
      query_universes: [],
      events: [],
    });
    const { llm } = fakeLlm(() => llmOut(LABELS));
    await ensureQueryUniverse(db.client, { siteId: "s1", userId: null }, deps(llm, db));
    db.tables.brand_profiles!.push({ ...profileRow, version: 4 });
    const out = await ensureQueryUniverse(db.client, { siteId: "s1", userId: null }, deps(llm, db));
    expect(out.status).toBe("cree");
    expect(db.tables.query_universes).toHaveLength(2);
  });

  it("dit pourquoi l'univers est impossible au lieu d'échouer en silence", async () => {
    const noProfile = fakeSupabase({ sites: [site], brand_profiles: [], query_universes: [] });
    const { llm, calls } = fakeLlm(() => llmOut(LABELS));
    expect(
      await ensureQueryUniverse(
        noProfile.client,
        { siteId: "s1", userId: null },
        deps(llm, noProfile),
      ),
    ).toEqual({ status: "impossible", reason: "profil_absent" });
    const noSite = fakeSupabase({ sites: [], brand_profiles: [], query_universes: [] });
    expect(
      await ensureQueryUniverse(noSite.client, { siteId: "s1", userId: null }, deps(llm, noSite)),
    ).toEqual({ status: "impossible", reason: "site_introuvable" });
    expect(calls).toHaveLength(0);
  });

  it("l'objectif autorité n'utilise pas les mots-clés restés sur le site", async () => {
    const db = fakeSupabase({
      sites: [{ ...site, goal: "autorite_generale" }],
      brand_profiles: [profileRow],
      query_recipes: [],
      query_universes: [],
      events: [],
    });
    const stored = await buildAndStoreQueryUniverse(
      db.client,
      { siteId: "s1", userId: null },
      deps(fakeLlm(() => llmOut(LABELS)).llm, db),
    );
    expect(stored!.queries.every((q) => q.target === "home")).toBe(true);
  });

  it("une ligne illisible n'est jamais affichée", async () => {
    const db = fakeSupabase({
      query_universes: [
        {
          id: "u",
          site_id: "s1",
          brand_profile_version: 1,
          goal: "autorite_generale",
          budget_usd: 0.2,
          est_cost_usd: 0.1,
          llm_cost_usd: 0,
          queries: [{ q: 1 }],
          recipes: {},
          created_at: "2026-11-15T00:00:00Z",
        },
      ],
    });
    expect(await getLatestQueryUniverse(db.client, "s1")).toBeNull();
  });
});
