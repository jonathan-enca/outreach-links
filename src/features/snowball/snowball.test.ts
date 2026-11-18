import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { PUBLIC_RESOURCES_SYSTEM, SEEDS_SYSTEM } from "@/features/collection/resource-judge";
import type { CollectionContext } from "@/features/collection/types";
import { COLLECTION_LIMITS } from "@/features/collection/limits";
import { SNOWBALL_LIMITS, snowballCostUsd } from "./limits";
import { executeSnowball } from "./run";
import { persistSnowball } from "./service";
import {
  citedSites,
  isTargetPage,
  publicCandidates,
  seedCandidates,
  type SeedSource,
} from "./seeds";

const AUDIT = "11111111-1111-4111-8111-111111111111";
const ctx: CollectionContext = {
  ownDomain: "mon-site.fr",
  competitorDomains: ["concurrent.fr"],
  language: "fr",
  theme: "coloriages",
  nameVariants: [],
  targetKeywords: [],
  site: {
    domain: "mon-site.fr",
    theme: "coloriages",
    activity: "coloriages gratuits",
    offer: "coloriages à imprimer",
    audience: ["enseignants"],
    pages: ["Coloriages"],
  },
};

const page = (domain: string, cites: string[], over: Partial<SeedSource> = {}): SeedSource => ({
  domain,
  situation: "petit_editeur_ressources",
  reason: null,
  cites: { sites: cites.length, links: cites.map((c) => ({ anchor: c, domain: c })) },
  ...over,
});

describe("graines de la boule de neige", () => {
  it("compte les pages qui citent chaque site, sans le site, ses concurrents, la page elle-même ni les ressources déjà utilisées", () => {
    const pages = [
      page("blog-a.fr", ["hugo.fr", "mon-site.fr", "concurrent.fr", "blog-a.fr", "deja.fr"]),
      page("blog-b.fr", ["hugo.fr", "tete.fr"]),
      page("blog-c.fr", ["hugo.fr"], { situation: "aucune" }),
    ];
    expect(citedSites(pages, ctx, ["deja.fr"])).toEqual([
      { domain: "hugo.fr", citedBy: 3 },
      { domain: "tete.fr", citedBy: 1 },
    ]);
  });

  it("les graines ne viennent que des pages jugées cibles", () => {
    const pages = [
      page("blog-a.fr", ["hugo.fr"]),
      page("blog-c.fr", ["autre.fr"], { situation: "aucune" }),
      page("blog-d.fr", ["encore.fr"], { situation: null }),
    ];
    expect(seedCandidates(pages, ctx, []).map((c) => c.domain)).toEqual(["hugo.fr"]);
    expect(seedCandidates(pages, ctx, [])[0]).toMatchObject({ origin: "citee", citedBy: 1 });
    expect(isTargetPage(pages[1]!)).toBe(false);
  });

  it("le repli lit toutes les pages lues sauf les pages légales et les fermes à liens", () => {
    const pages = [
      page("blog-a.fr", ["haveibeenpwned.com"], { situation: "aucune" }),
      page("ferme.fr", ["agence.fr"], { situation: "ferme_a_liens", reason: "ferme_a_liens" }),
      page("legal.fr", ["cnil.fr"], { situation: "juridique", reason: "page_legale" }),
    ];
    expect(publicCandidates(pages, ctx, []).map((c) => c.domain)).toEqual(["haveibeenpwned.com"]);
    expect(seedCandidates(pages, ctx, [])).toEqual([]);
  });

  it("plafonne les candidats montrés au modèle", () => {
    const many = [
      page(
        "blog.fr",
        Array.from({ length: 80 }, (_, i) => `site-${i}.fr`),
      ),
    ];
    expect(seedCandidates(many, ctx, [])).toHaveLength(SNOWBALL_LIMITS.maxSeedCandidates);
  });
});

function fakeDfs() {
  const calls: string[] = [];
  return {
    calls,
    dfs: {
      backlinksBacklinks: vi.fn(async (p: { target: string }) => {
        calls.push(p.target);
        return {
          result: {
            items_count: 2,
            items: [
              {
                domain_from: `blog-de-${p.target}`,
                url_from: `https://blog-de-${p.target}/liens`,
                url_to: `https://${p.target}/`,
                anchor: "Hugo",
                dofollow: true,
                backlink_spam_score: 3,
                domain_from_rank: 30,
                page_from_language: "fr",
                page_from_title: "Liens",
              },
              {
                domain_from: "deja-connu.fr",
                url_from: "https://deja-connu.fr/x",
                url_to: `https://${p.target}/`,
                anchor: "Hugo",
                dofollow: true,
                backlink_spam_score: 3,
                domain_from_rank: 30,
                page_from_language: "fr",
                page_from_title: "x",
              },
            ],
          },
          actualCostUsd: 0.0294,
          cacheHit: false,
          estimatedCostUsd: 0.0294,
          taskId: null,
        };
      }),
    },
  };
}

const llmChoosing = (...answers: string[][]) => {
  let n = 0;
  const systems: string[] = [];
  return {
    systems,
    generate: vi.fn(async (o: { system: string }) => {
      systems.push(o.system);
      const domaines = answers[Math.min(n++, answers.length - 1)] ?? [];
      return {
        data: { choix: domaines.map((domaine) => ({ domaine, raison: "même offre" })) },
        costUsd: 0.002,
      };
    }),
  };
};

const run = () => ({
  auditId: AUDIT,
  workspaceId: "22222222-2222-4222-8222-222222222222",
  ctx,
  limits: { auditId: AUDIT, auditCapUsd: 2, safetyCapUsd: 5, dailyCapUsd: 25 },
});

describe("executeSnowball", () => {
  const pages = [
    page("blog-a.fr", ["hugo.fr", "tete.fr"]),
    page("blog-b.fr", ["hugo.fr", "agence.fr"]),
  ];

  it("juge les graines, interroge les ressources retenues et ne garde que les domaines nouveaux", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const llm = llmChoosing(["hugo.fr", "tete.fr"]);
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llm as never },
      { run: run(), pages, used: [], known: new Set(["deja-connu.fr"]) },
    );
    expect(llm.systems).toEqual([SEEDS_SYSTEM]);
    expect(calls.sort()).toEqual(["hugo.fr", "tete.fr"]);
    expect(out.stats).toMatchObject({
      by: "graines",
      stop: "termine",
      resources: ["hugo.fr", "tete.fr"],
      calls: 2,
      newCandidates: 2,
      seedCandidates: 3,
    });
    expect(out.candidates.map((c) => c.domain).sort()).toEqual([
      "blog-de-hugo.fr",
      "blog-de-tete.fr",
    ]);
    // la ressource est dans la source « citation » : file de lecture « citation:<domaine> » du pilotage.
    expect(out.candidates[0]!.sources[0]).toMatchObject({ source: "citation" });
    expect(out.stats.costUsd).toBeLessThanOrEqual(snowballCostUsd().worstUsd);
  });

  it("jamais plus de 6 ressources, même si le modèle en renvoie davantage", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const many = [
      page(
        "blog.fr",
        Array.from({ length: 10 }, (_, i) => `site-${i}.fr`),
      ),
    ];
    const llm = llmChoosing(Array.from({ length: 10 }, (_, i) => `site-${i}.fr`));
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llm as never },
      { run: run(), pages: many, used: [], known: new Set() },
    );
    expect(calls).toHaveLength(SNOWBALL_LIMITS.maxResources);
    expect(out.stats.resources).toHaveLength(SNOWBALL_LIMITS.maxResources);
    expect(snowballCostUsd().worstUsd).toBeCloseTo(
      SNOWBALL_LIMITS.maxResources * (0.02 + COLLECTION_LIMITS.citations.rowsPerCall * 0.00006) +
        SNOWBALL_LIMITS.pickReservedUsd * 2,
      2,
    );
  });

  it("repli « ressources publiques et gratuites » quand aucune graine n'est retenue (aucune cible)", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const none = [
      page("blog-a.fr", ["haveibeenpwned.com", "agence.fr"], { situation: "aucune" }),
      page("blog-b.fr", ["haveibeenpwned.com"], { situation: "aucune" }),
    ];
    const llm = llmChoosing(["haveibeenpwned.com"]);
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llm as never },
      { run: run(), pages: none, used: [], known: new Set() },
    );
    // aucune cible : pas de graine, un seul appel au modèle, avec la consigne du repli.
    expect(llm.systems).toEqual([PUBLIC_RESOURCES_SYSTEM]);
    expect(calls).toEqual(["haveibeenpwned.com"]);
    expect(out.stats).toMatchObject({ by: "repli", seedCandidates: 0, publicCandidates: 2 });
  });

  it("le repli prend aussi la main quand le modèle ne retient aucune graine", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const llm = llmChoosing([], ["hugo.fr"]);
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llm as never },
      { run: run(), pages, used: [], known: new Set() },
    );
    expect(llm.systems).toEqual([SEEDS_SYSTEM, PUBLIC_RESOURCES_SYSTEM]);
    expect(calls).toEqual(["hugo.fr"]);
    expect(out.stats.by).toBe("repli");
  });

  it("sans graine ni service public : rien n'est interrogé, rien n'est facturé", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llmChoosing([]) as never },
      { run: run(), pages, used: [], known: new Set() },
    );
    expect(calls).toEqual([]);
    expect(out.stats).toMatchObject({ by: "aucune", stop: "aucune_ressource", calls: 0 });
    expect(out.candidates).toEqual([]);
  });

  it("sans modèle, rien n'est fait (une graine ne se juge pas sans lui)", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: null },
      { run: run(), pages, used: [], known: new Set() },
    );
    expect(calls).toEqual([]);
    expect(out.stats.stop).toBe("sans_modele");
  });

  it("le plafond d'audit arrête la phase avant tout appel payant", async () => {
    const { client } = fakeSupabase({
      cost_ledger: [
        {
          audit_id: AUDIT,
          actual_cost_usd: 1.99,
          estimated_cost_usd: 1.99,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { dfs, calls } = fakeDfs();
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llmChoosing(["hugo.fr"]) as never },
      { run: run(), pages, used: [], known: new Set() },
    );
    expect(calls).toEqual([]);
    expect(out.stats.stop).toBe("plafond");
  });
});

describe("persistSnowball", () => {
  it("ajoute les pages aux candidats ET à la réserve de la qualification, une seule fois, et inscrit les compteurs", async () => {
    const { client, tables } = fakeSupabase({
      qualification_runs: [{ id: "run-1", stats: { shortlist: 4, stock: 10 } }],
      qualified_targets: [{ id: "x", run_id: "run-1", domain: "blog-de-hugo.fr" }],
    });
    const { dfs } = fakeDfs();
    const out = await executeSnowball(
      { dfs: dfs as never, service: client, llm: llmChoosing(["hugo.fr"]) as never },
      { run: run(), pages: [page("blog-a.fr", ["hugo.fr"])], used: [], known: new Set() },
    );
    const ids = { runId: "run-1", collectionId: "col-1", auditId: AUDIT, workspaceId: "ws-1" };
    await persistSnowball(client, ids, out, { shortlist: 4, stock: 10 });
    const cands = tables.collection_candidates as { domain: string; collection_id: string }[];
    expect(cands.map((c) => c.domain).sort()).toEqual(["blog-de-hugo.fr", "deja-connu.fr"]);
    const stock = (tables.qualified_targets as Record<string, unknown>[]).filter(
      (r) => r.exclusion_reason === "hors_budget_lecture",
    );
    // « blog-de-hugo.fr » existait déjà dans la réserve : jamais écrasé (ignoreDuplicates).
    expect(stock.map((r) => r.domain)).toEqual(["deja-connu.fr"]);
    expect(stock[0]).toMatchObject({ status: "reserve", stage_reached: 3, run_id: "run-1" });
    const stats = (tables.qualification_runs as { stats: Record<string, unknown> }[])[0]!.stats;
    expect(stats).toMatchObject({ shortlist: 4, stock: 12, snowball: { by: "graines" } });
  });
});
