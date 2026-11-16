import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { generateBrandProfile } from "@/features/brand/generate";
import { BRAND_LIMITS } from "@/features/brand/limits";
import { generatePublisherTypes, resolvePublishers } from "@/features/brand/publishers";
import { readSite } from "@/features/brand/read-site";
import { safeFetchPage } from "@/features/sites/verify";
import { createLlmClient } from "@/lib/llm";
import { buildQueryPlan, estimateQueryPhase } from "./plan";

/**
 * K0 : vérification RÉELLE sur un site d'un tout autre thème que le site de test. Lit le site, établit
 * le profil et les types d'éditeurs (deux appels LLM courts), construit les requêtes ; AUCUNE recherche
 * n'est lancée (aucun appel DataForSEO, aucune écriture en base). Ignoré sauf SECOND_SITE_LIVE=1 :
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true SECOND_SITE_LIVE=1 SECOND_SITE_DOMAIN=remove-me.io \
 *     pnpm vitest run src/features/queries/second-site.live.test.ts
 */
const live = process.env.SECOND_SITE_LIVE === "1";
const FORBIDDEN =
  /coloriage|colorier|coloring|ma[iî]tresse|scout|mandala|atsem|centres? de loisirs/i;

describe.skipIf(!live)("second site de test : types d'éditeurs et requêtes", () => {
  it("les types et les requêtes viennent du site, rien ne vient du site de test", async () => {
    const domain = process.env.SECOND_SITE_DOMAIN ?? "remove-me.io";
    const language = process.env.SECOND_SITE_LANGUAGE ?? "fr";
    const site = await readSite(domain, {
      fetch: safeFetchPage,
      sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
      now: () => Date.now(),
    });
    const db = fakeSupabase({ cost_ledger: [] });
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const llm = createLlmClient({
      costClient: db.client,
      provider,
      auth:
        provider === "anthropic"
          ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
          : process.env.OPENAI_API_KEY
            ? { apiKey: process.env.OPENAI_API_KEY }
            : "proxy",
      budgetUsd: BRAND_LIMITS.llmBudgetUsd,
      maxCostPerCallUsd: BRAND_LIMITS.llmMaxCostPerCallUsd,
    });
    const brand = await generateBrandProfile({ site, llm, workspaceId: null, language });
    expect(brand, `profil non établi (accueil HTTP ${site.home.status})`).not.toBeNull();
    const theme = brand!.profile.activity;
    const publishers = await generatePublisherTypes({
      profile: brand!.profile,
      theme,
      domain,
      language,
      llm,
      workspaceId: null,
    });
    expect(publishers, "types d'éditeurs non établis").not.toBeNull();
    const profile = {
      ...brand!.profile,
      publisher_types: publishers!.types,
      theme_terms: publishers!.themeTerms,
    };
    const resolved = resolvePublishers(profile, theme);
    const phase = estimateQueryPhase();
    const plan = buildQueryPlan({
      theme,
      language,
      domain,
      goal: "autorite_generale",
      targetKeywords: [],
      nameVariants: profile.name_variants,
      recipes: [],
      publisherTypes: resolved.types,
      themeTerms: resolved.themeTerms,
      maxQueries: phase.maxQueries,
      perQueryUsd: phase.perQueryUsd,
    });
    const total = db.tables.cost_ledger!.reduce((s, r) => s + Number(r.actual_cost_usd ?? 0), 0);
    const lines = [
      `Site : ${domain} (${language}), ${site.pages.length + 1} pages lues`,
      `Activité : ${profile.activity}`,
      `Personas : ${profile.personas.map((p) => p.label).join(" ; ")}`,
      `Mots du thème : ${resolved.themeTerms.join(" ; ")}`,
      `Types d'éditeurs (${resolved.types.length}) :`,
      ...resolved.types.map(
        (t) => `  - ${t.label} [${t.category}, ${t.origin}] : ${t.terms.join(", ")}`,
      ),
      `Requêtes (${plan.length}, dont ${plan.filter((q) => q.guaranteed).length} garanties) :`,
      ...plan.map(
        (q) => `  ${q.rank}. ${q.q}  (${q.persona ?? "marque"}${q.guaranteed ? ", garantie" : ""})`,
      ),
      `Coût LLM réel : ${total.toFixed(5)} USD, ${db.tables.cost_ledger!.length} appels ; aucune recherche lancée`,
    ];
    const report = lines.join("\n");
    console.log(report);
    if (process.env.SECOND_SITE_OUT) writeFileSync(process.env.SECOND_SITE_OUT, report);
    expect(resolved.types.length).toBeGreaterThanOrEqual(4);
    expect(resolved.types.some((t) => t.origin === "voisin")).toBe(true);
    for (const t of resolved.types) {
      expect(
        plan.filter((q) => q.guaranteed && q.persona === t.label).length,
      ).toBeGreaterThanOrEqual(
        Math.min(4, Math.floor((phase.maxQueries - 2) / resolved.types.length)),
      );
    }
    // Sur tout autre site que le site de test, aucun de ses mots ne doit apparaître.
    if (domain !== "mega-coloring.com") {
      expect(FORBIDDEN.test(JSON.stringify({ types: resolved.types, plan }))).toBe(false);
    }
    expect(total).toBeLessThan(0.1);
  }, 180_000);
});
