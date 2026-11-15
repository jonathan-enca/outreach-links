import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { BrandProfile } from "@/features/brand/schema";
import { createLlmClient } from "@/lib/llm";
import { QUERY_LIMITS } from "./limits";
import { estimateQueryPhase } from "./plan";
import { buildUniverse } from "./service";

/**
 * Univers de requêtes RÉEL (MT.2b) sur 3 sites de niches différentes : UN appel LLM plafonné pour les
 * trois (une fois par site), cache en mémoire, aucun appel DataForSEO, aucune écriture en base, aucun
 * site lu. Ignoré sauf QUERIES_LIVE_DEMO=1. Lancer :
 * NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true QUERIES_LIVE_OUT=/chemin/rapport.txt pnpm demo:queries
 */
const live = process.env.QUERIES_LIVE_DEMO === "1";

interface Case {
  domain: string;
  theme: string;
  profile: BrandProfile;
  goal: "autorite_generale" | "mots_cles";
  keywords: string[];
  /** Mots attendus dans au moins une requête de chaque persona-clé (contrôle de pertinence grossier). */
  expect: RegExp[];
}

const CASES: Case[] = [
  {
    domain: "mega-coloring.com",
    theme: "coloriages à imprimer",
    goal: "autorite_generale",
    keywords: [],
    expect: [/classe|enseign|maternelle|école|ecole/, /médiath|mediath|bibliothèque|bibliotheque/],
    profile: {
      activity: "Site de coloriages gratuits à imprimer pour les enfants.",
      offer: "Des centaines de coloriages classés par thème, à télécharger en PDF.",
      language: "fr",
      audience: ["Parents", "Enseignants", "Animateurs"],
      linkable_resources: [],
      name_variants: ["Mega Coloring", "mega-coloring", "megacoloring"],
      tone: "chaleureux",
      personas: [
        {
          label: "Enseignants et assistantes maternelles",
          sites: "blogs de classe, sites de ressources pédagogiques",
          reason: "Ils cherchent des activités à imprimer pour leurs élèves.",
        },
        {
          label: "Parents blogueurs",
          sites: "blogs de parents, forums de parents modérés",
          reason: "Ils partagent des idées d'activités pour occuper les enfants.",
        },
        {
          label: "Associations et centres de loisirs",
          sites: "scoutisme, centres de loisirs, patronages",
          reason: "Ils animent des ateliers pour les enfants.",
        },
        {
          label: "Médiathèques et bibliothèques",
          sites: "pages « ressources en ligne » des collectivités",
          reason: "Elles recommandent des activités gratuites pour les enfants.",
        },
      ],
    },
  },
  {
    domain: "trail-running-lab.fr",
    theme: "chaussures de trail",
    goal: "mots_cles",
    keywords: ["chaussures trail femme", "test salomon speedcross"],
    expect: [/club|association|course/, /blog|test|avis|coureur/],
    profile: {
      activity: "Blog et comparateur de chaussures de trail running.",
      offer: "Tests détaillés, guides d'achat et comparatifs de chaussures de trail.",
      language: "fr",
      audience: ["Coureurs de trail", "Débutants en course à pied"],
      linkable_resources: [],
      name_variants: ["Trail Running Lab", "trailrunninglab"],
      tone: "technique et accessible",
      personas: [
        {
          label: "Clubs et associations de course à pied",
          sites: "sites de clubs d'athlétisme, de trail, de randonnée",
          reason: "Leurs adhérents cherchent des conseils de matériel.",
        },
        {
          label: "Blogueurs outdoor et running",
          sites: "blogs de coureurs, de randonneurs",
          reason: "Ils citent des tests et guides pour leurs lecteurs.",
        },
        {
          label: "Organisateurs de courses",
          sites: "pages pratiques des trails et courses nature",
          reason: "Ils recommandent du matériel à leurs participants.",
        },
        {
          label: "Magasins de sport indépendants",
          sites: "boutiques locales avec blog ou page conseils",
          reason: "Ils complètent leurs conseils avec des tests indépendants.",
        },
      ],
    },
  },
  {
    domain: "comptabilite-asso.fr",
    theme: "comptabilité d'association",
    goal: "autorite_generale",
    keywords: [],
    expect: [
      /association|bénévole|benevole|trésor|tresor/,
      /mairie|commune|collectivité|collectivite|maison des associations/,
    ],
    profile: {
      activity: "Guides et modèles gratuits pour tenir la comptabilité d'une petite association.",
      offer:
        "Modèles Excel, guides pas à pas et calendrier des obligations pour trésoriers bénévoles.",
      language: "fr",
      audience: ["Trésoriers d'association", "Présidents d'association bénévoles"],
      linkable_resources: [],
      name_variants: ["Comptabilité Asso", "comptabilite-asso", "comptabiliteasso"],
      tone: "pédagogique",
      personas: [
        {
          label: "Maisons des associations et mairies",
          sites: "pages « vie associative » des communes",
          reason: "Elles orientent les bénévoles vers des ressources gratuites.",
        },
        {
          label: "Fédérations et réseaux associatifs",
          sites: "sites de fédérations sportives, culturelles, d'éducation populaire",
          reason: "Leurs adhérents ont besoin d'outils de gestion simples.",
        },
        {
          label: "Blogs de bénévoles et de gestion associative",
          sites: "blogs sur la vie associative et le bénévolat",
          reason: "Ils partagent des ressources pratiques pour les trésoriers.",
        },
        {
          label: "Experts-comptables spécialisés associations",
          sites: "cabinets avec pages ressources pour associations",
          reason: "Ils renvoient les petites structures vers des modèles gratuits.",
        },
      ],
    },
  },
];

describe.skipIf(!live)("univers de requêtes : run réel sur 3 niches", () => {
  it("produit des requêtes pertinentes, classées, dans le budget", async () => {
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const lines: string[] = [];
    let totalLlm = 0;
    for (const c of CASES) {
      const ledger = fakeSupabase({ cost_ledger: [], query_recipes: [] });
      const llm = createLlmClient({
        costClient: ledger.client as never,
        provider,
        auth:
          provider === "anthropic"
            ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
            : process.env.OPENAI_API_KEY
              ? { apiKey: process.env.OPENAI_API_KEY }
              : "proxy",
        budgetUsd: QUERY_LIMITS.llmBudgetUsd,
        maxCostPerCallUsd: QUERY_LIMITS.llmMaxCostPerCallUsd,
      });
      const t0 = Date.now();
      const out = await buildUniverse(
        {
          profile: c.profile,
          theme: c.theme,
          language: "fr",
          domain: c.domain,
          goal: c.goal,
          targetKeywords: c.keywords,
          workspaceId: null,
        },
        { makeLlm: () => llm, getServiceClient: () => ledger.client },
      );
      const ms = Date.now() - t0;
      const calls = ledger.tables.cost_ledger!.length;
      totalLlm += out.llmCostUsd;
      lines.push(
        `\n=== ${c.domain} (${c.theme}), objectif ${c.goal} ===\n` +
          `${out.queries.length} requêtes, coût SERP max ${out.estimatedUsd.toFixed(4)} USD (budget ${out.budgetUsd} USD), ` +
          `LLM : ${calls} appel, ${out.llmCostUsd.toFixed(5)} USD, ${ms} ms, recettes ${JSON.stringify(out.recipes)}\n` +
          out.queries
            .map(
              (q) =>
                `${String(q.rank).padStart(2)}. [${q.tactic}] ${q.q}  (${q.persona ?? q.keyword ?? "marque"}, ${q.score.toFixed(2)})`,
            )
            .join("\n"),
      );
      expect(calls).toBe(1);
      expect(out.recipes.generated).toBe(c.profile.personas.length);
      expect(out.queries.length).toBeLessThanOrEqual(estimateQueryPhase().maxQueries);
      expect(out.estimatedUsd).toBeLessThanOrEqual(estimateQueryPhase().totalUsd + 1e-9);
      expect(out.llmCostUsd).toBeLessThan(0.01);
      const text = out.queries.map((q) => q.q.toLowerCase()).join(" | ");
      for (const re of c.expect) expect(text).toMatch(re);
      const discovery = out.queries.filter((q) => q.tactic !== "mentions");
      const brand = c.profile.name_variants.map((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ""));
      for (const q of discovery) {
        const squashed = q.q.toLowerCase().replace(/[^a-z0-9]/g, "");
        expect(brand.some((b) => squashed.includes(b))).toBe(false);
      }
      expect(out.queries.some((q) => q.tactic === "mentions")).toBe(true);
      if (c.goal === "mots_cles")
        expect(out.queries.some((q) => q.target === "keyword")).toBe(true);
      else expect(out.queries.every((q) => q.target === "home")).toBe(true);
    }
    lines.push(`\nCoût LLM total des 3 sites : ${totalLlm.toFixed(5)} USD`);
    const report = lines.join("\n");
    console.log(report);
    if (process.env.QUERIES_LIVE_OUT) writeFileSync(process.env.QUERIES_LIVE_OUT, report);
  }, 120_000);
});
