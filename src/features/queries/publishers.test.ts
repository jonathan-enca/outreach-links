import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  categoryOf,
  derivePublisherTypes,
  generatePublisherTypes,
  normalizePublishers,
  publishersSystem,
  resolvePublishers,
  sanitizeTerm,
  termsOfLabel,
  userPublisherType,
} from "@/features/brand/publishers";
import type { BrandProfile, PublisherType } from "@/features/brand/schema";
import { brandProfileSchema } from "@/features/brand/schema";
import type { LlmClient } from "@/lib/llm/client";
import { QUERY_LIMITS } from "./limits";
import { buildQueryPlan, estimateQueryPhase } from "./plan";
import { GUARANTEED_PER_TYPE, joinWords, typeQueries } from "./templates";

/** Profil d'un tout autre thème que le site de test : un photographe de mariage. */
const photographer: BrandProfile = {
  activity: "Photographe de mariage à Lyon.",
  offer: "Reportages de mariage, séances couple, conseils pour préparer ses photos.",
  language: "fr",
  audience: ["futurs mariés", "organisateurs de mariage"],
  linkable_resources: [],
  name_variants: ["Studio Lumière"],
  tone: "chaleureux",
  personas: [
    {
      label: "Wedding planners et organisateurs",
      sites: "sites d'agences d'organisation, blogs de conseils mariage",
      reason: "Ils recommandent des prestataires à leurs clients.",
    },
    {
      label: "Lieux de réception",
      sites: "sites de domaines, châteaux et salles",
      reason: "Ils montrent des mariages célébrés chez eux.",
    },
    {
      label: "Mairies et offices de tourisme",
      sites: "pages « se marier dans la commune »",
      reason: "Ils listent les prestataires locaux.",
    },
  ],
};

const types: PublisherType[] = [
  {
    label: "Wedding planners",
    category: "professionnel",
    terms: ["wedding planner", "organisatrice de mariage"],
    origin: "persona",
  },
  {
    label: "Lieux de réception",
    category: "professionnel",
    terms: ["domaine", "château", "salle de réception"],
    origin: "persona",
  },
  { label: "Mairies", category: "collectivite", terms: ["mairie", "commune"], origin: "persona" },
  { label: "Fleuristes", category: "boutique", terms: ["fleuriste"], origin: "voisin" },
];
const theme = ["photographe mariage", "photos de mariage"];

const planInput = (
  publisherTypes: PublisherType[],
  maxQueries = estimateQueryPhase().maxQueries,
) => ({
  theme: "photographe de mariage",
  language: "fr",
  domain: "studio-lumiere.fr",
  goal: "autorite_generale" as const,
  targetKeywords: [],
  nameVariants: ["Studio Lumière"],
  recipes: [],
  publisherTypes,
  themeTerms: theme,
  maxQueries,
  perQueryUsd: 0.006,
});

describe("types d'éditeurs déduits du profil", () => {
  it("secours sans modèle : un type par persona, catégorie par vocabulaire générique, aucun type inventé", () => {
    const out = derivePublisherTypes(photographer);
    expect(out.map((t) => t.label)).toEqual(photographer.personas.map((p) => p.label));
    expect(out[2]).toMatchObject({ category: "collectivite", origin: "persona" });
    expect(out[2]!.terms).toEqual(["mairies", "offices de tourisme"]);
    expect(out.every((t) => t.origin === "persona")).toBe(true);
  });

  it("catégorie d'un libellé libre et mots de requête sûrs", () => {
    expect(categoryOf("Associations sportives")).toBe("association");
    expect(categoryOf("Médiathèques")).toBe("bibliotheque");
    expect(categoryOf("Forums de passionnés")).toBe("forum");
    expect(categoryOf("Artisans voisins")).toBe("boutique");
    expect(categoryOf("Tout autre chose")).toBe("autre");
    expect(termsOfLabel("Clubs et fédérations, amicales")).toEqual([
      "clubs",
      "fédérations",
      "amicales",
    ]);
    expect(sanitizeTerm('site:exemple.fr "truc"')).toBe("site exemple.fr truc");
    expect(sanitizeTerm("a")).toBeNull();
    expect(userPublisherType("  Clubs photo  ")).toMatchObject({
      label: "Clubs photo",
      category: "association",
      origin: "utilisateur",
    });
    expect(userPublisherType("?")).toBeNull();
  });

  it("le profil enregistré fait foi ; une étiquette désactivée n'est jamais cherchée", () => {
    const profile = {
      ...photographer,
      publisher_types: [types[0]!, { ...types[2]!, active: false }, types[3]!],
      theme_terms: theme,
    };
    expect(brandProfileSchema.safeParse(profile).success).toBe(true);
    const r = resolvePublishers(profile, "photographe de mariage");
    expect(r.stored).toBe(true);
    expect(r.types.map((t) => t.label)).toEqual(["Wedding planners", "Fleuristes"]);
    expect(r.themeTerms).toEqual(theme);
    const fallback = resolvePublishers(photographer, "photographe de mariage");
    expect(fallback.stored).toBe(false);
    expect(fallback.types).toHaveLength(3);
    expect(fallback.themeTerms).toEqual(["photographe de mariage"]);
  });

  it("sortie du modèle nettoyée : sans la marque, sans doublon, types voisins bornés", () => {
    const out = normalizePublishers(
      {
        theme_terms: ["Photographe Mariage", "studio lumière photos", "photos de mariage"],
        types: [
          {
            label: "Fleuristes",
            category: "boutique",
            terms: ["Fleuriste", "studio lumiere"],
            origin: "voisin",
          },
          { label: "fleuristes", category: "boutique", terms: ["fleuriste"], origin: "voisin" },
          { label: "Traiteurs", category: "professionnel", terms: ["traiteur"], origin: "voisin" },
        ],
      },
      ["studiolumiere"],
    );
    expect(out.themeTerms).toEqual(["photographe mariage", "photos de mariage"]);
    expect(out.types.map((t) => t.label)).toEqual(["Fleuristes", "Traiteurs"]);
    expect(out.types[0]!.terms).toEqual(["fleuriste"]);
  });

  it("un appel court ; panne ou sortie inutilisable = null (le secours prend le relais)", async () => {
    const llm = (data: unknown) =>
      ({ generate: async () => ({ data, costUsd: 0.002 }) }) as unknown as LlmClient;
    const input = {
      profile: photographer,
      theme: "photographe de mariage",
      domain: "studio-lumiere.fr",
      language: "fr",
      workspaceId: null,
    };
    const ok = await generatePublisherTypes({
      ...input,
      llm: llm({
        theme_terms: ["photographe mariage"],
        types: types.map(({ label, category, terms, origin }) => ({
          label,
          category,
          terms,
          origin,
        })),
      }),
    });
    expect(ok?.types).toHaveLength(4);
    expect(ok?.costUsd).toBe(0.002);
    expect(await generatePublisherTypes({ ...input, llm: null })).toBeNull();
    expect(await generatePublisherTypes({ ...input, llm: llm({ nope: true }) })).toBeNull();
    const broken = {
      generate: async () => Promise.reject(new Error("panne")),
    } as unknown as LlmClient;
    expect(await generatePublisherTypes({ ...input, llm: broken })).toBeNull();
  });
});

describe("gabarits de requêtes par type d'éditeur", () => {
  it("au moins 4 requêtes par type, faites des mots du type et du thème, opérateurs intitle et inurl", () => {
    for (const type of types) {
      const qs = typeQueries(type, theme, "fr");
      expect(qs.length).toBeGreaterThanOrEqual(GUARANTEED_PER_TYPE);
      expect(new Set(qs.map((q) => q.q)).size).toBe(qs.length);
      expect(qs[0]!.q).toBe(joinWords(type.terms[0], theme[0]));
      expect(qs.some((q) => q.q.includes("intitle:"))).toBe(true);
      expect(qs.some((q) => q.q.includes("inurl:"))).toBe(true);
      for (const q of qs) expect(q.q).toContain("mariage");
    }
    expect(typeQueries(types[0]!, theme, "fr")[1]!.q).toBe(
      'intitle:"wedding planner" photographe mariage',
    );
    expect(typeQueries(types[2]!, theme, "fr").map((q) => q.q)).toContain(
      "photographe mariage inurl:mairie",
    );
  });

  it("par langue ; rien sans mot de thème ; jamais de mot répété", () => {
    const en = typeQueries(
      { terms: ["florist"], category: "boutique" },
      ["wedding photographer"],
      "en",
    );
    expect(en.some((q) => q.q.includes("useful links"))).toBe(true);
    expect(typeQueries(types[0]!, [], "fr")).toEqual([]);
    expect(joinWords("blog", "blog mariage", "Mariage")).toBe("blog mariage");
  });
});

describe("plan de requêtes : garanties par type d'éditeur", () => {
  it("chaque type reçoit ses 4 requêtes garanties, à tour de rôle, avant tout le reste", () => {
    const plan = buildQueryPlan(planInput(types));
    const guaranteed = plan.filter((q) => q.guaranteed);
    expect(guaranteed).toHaveLength(types.length * GUARANTEED_PER_TYPE);
    for (const t of types) {
      expect(guaranteed.filter((q) => q.persona === t.label)).toHaveLength(GUARANTEED_PER_TYPE);
    }
    const serp = plan.filter((q) => q.tactic !== "mentions");
    // Tour de rôle : les 4 premières requêtes sont une par type.
    expect(new Set(serp.slice(0, types.length).map((q) => q.persona)).size).toBe(types.length);
    expect(serp.slice(0, guaranteed.length).every((q) => q.guaranteed)).toBe(true);
    expect(guaranteed.every((q) => q.category && q.origin === "regle")).toBe(true);
    // Au-delà des garanties, d'autres requêtes des mêmes types remplissent le budget restant.
    expect(plan.length).toBeGreaterThan(guaranteed.length + 2);
    expect(plan.every((q) => !/studio ?lumi/i.test(q.q) || q.tactic === "mentions")).toBe(true);
  });

  it("le budget par défaut porte 10 types × 4 requêtes garanties, plus les requêtes de marque", () => {
    const ten = Array.from({ length: 10 }, (_, i): PublisherType => ({
      label: `Type ${i}`,
      category: "association",
      terms: [`famille${i}`, `groupe${i}`],
      origin: "persona",
    }));
    const max = estimateQueryPhase().maxQueries;
    expect(max).toBeGreaterThanOrEqual(42);
    expect(max).toBeLessThanOrEqual(QUERY_LIMITS.maxQueries);
    const plan = buildQueryPlan(planInput(ten));
    expect(plan.filter((q) => q.guaranteed)).toHaveLength(40);
    expect(plan.filter((q) => q.tactic === "mentions").length).toBeGreaterThanOrEqual(1);
  });

  it("budget très serré : les requêtes de marque puis les premières garanties, jamais plus que le budget", () => {
    const plan = buildQueryPlan(planInput(types, 6));
    expect(plan).toHaveLength(6);
    expect(plan.filter((q) => q.tactic === "mentions")).toHaveLength(1);
    expect(new Set(plan.filter((q) => q.guaranteed).map((q) => q.persona)).size).toBe(4);
  });
});

/**
 * K0 : rien n'est propre à un thème. Les mots du site de test ne doivent apparaître ni dans le code
 * qui fabrique les requêtes, ni dans les gabarits, ni dans les textes des écrans de l'analyse et des
 * cibles. (Les commentaires qui citent une mesure sont retirés avant le contrôle.)
 */
describe("K0 : aucun mot propre au site de test", () => {
  const FORBIDDEN =
    /coloriage|colorier|coloring|ma[iî]tresse|scout|mandala|atsem|centres? de loisirs|assistantes? maternelles?|ludoth[eè]que|crayon/i;
  const root = resolve(import.meta.dirname, "../../..");
  const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

  const CODE = [
    "src/features/queries/generate.ts",
    "src/features/queries/plan.ts",
    "src/features/queries/templates.ts",
    "src/features/queries/service.ts",
    "src/features/queries/schema.ts",
    "src/features/queries/limits.ts",
    "src/features/brand/publishers.ts",
    "src/features/brand/generate.ts",
    "src/features/brand/schema.ts",
    "src/features/collection/plan.ts",
    "src/features/qualification/score.ts",
    "src/features/findings/request.ts",
    "src/features/targets/publishers.ts",
    "src/features/targets/targets-screen.tsx",
    "src/features/brand/brand-fields.tsx",
    "src/features/brand/publisher-tags.tsx",
  ];

  it.each(CODE)("%s", (file) => {
    const hit = FORBIDDEN.exec(stripComments(read(file)));
    expect(hit?.[0] ?? null).toBeNull();
  });

  it("textes des écrans de l'analyse, des cibles et du profil", () => {
    const src = read("messages/fr.ts");
    for (const section of [
      "targets",
      "analysis",
      "qualification",
      "findings",
      "collection",
      "brand",
    ]) {
      const start = src.indexOf(`\n  ${section}: {`);
      if (start < 0) continue;
      const rest = src.slice(start + 1);
      const end = rest.search(/\n  [a-zA-Z]+: \{/);
      const body = end < 0 ? rest : rest.slice(0, end);
      const hit = FORBIDDEN.exec(stripComments(body));
      expect(hit ? `${section} : ${hit[0]}` : null).toBeNull();
    }
  });

  it("les prompts demandent des types déduits du profil, sans exemple de thème", () => {
    expect(FORBIDDEN.test(publishersSystem("fr"))).toBe(false);
    expect(publishersSystem("en")).toContain("anglais");
  });

  it("les requêtes d'un autre thème ne contiennent que ses mots et le vocabulaire générique", () => {
    const plan = buildQueryPlan(planInput(types));
    for (const q of plan) expect(FORBIDDEN.test(q.q)).toBe(false);
  });
});
