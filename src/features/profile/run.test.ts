import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { functions } from "@/inngest/functions";
import { auditProfile, profileEventSchema } from "@/inngest/functions/audit-profile";
import { BudgetExceededError } from "@/lib/dataforseo";
import { median } from "./compute";
import { estimateProfile, PROFILE_LIMITS } from "./limits";
import { ProfileSection, type ProfileView } from "./profile-section";
import {
  beginProfile,
  collectOwnProfile,
  collectPages,
  computeGapStep,
  computePageNeeds,
  failProfile,
  fetchBenchmark,
  finalizeProfile,
  PROFILE_EVENT,
  runOnpage,
  summarizeProfile,
  type ProfileData,
} from "./run";
import { startProfile } from "./service";
import { containsRankingPromise } from "./summary";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const WS_ID = "22222222-2222-4222-8222-222222222222";
const C1 = "33333333-3333-4333-8333-333333333333";
const C2 = "44444444-4444-4444-8444-444444444444";
const DOMAIN = "mega-coloring.com";

function setup(over: { profileStatus?: string; cap?: number; backlinksStatus?: string } = {}) {
  return fakeSupabase({
    sites: [{ id: "site-1", workspace_id: WS_ID, domain: DOMAIN, language: "fr" }],
    audits: [
      {
        id: AUDIT_ID,
        workspace_id: WS_ID,
        site_id: "site-1",
        status: "termine",
        plan: "gratuit",
        cost_cap_usd: over.cap ?? 0.25,
        actual_cost_usd: 0.018,
        backlinks_cost_usd: 0.087,
        backlinks_status: over.backlinksStatus ?? "termine",
        profile_status: over.profileStatus ?? "confirme",
        profile_limits: {
          ...PROFILE_LIMITS.gratuit,
          keywords: 50,
          referringDomains: 50,
          backlinksSample: 50,
        },
      },
    ],
    competitors: [
      { id: C1, audit_id: AUDIT_ID, domain: "hugolescargot.com", selected: true, score: 2 },
      { id: C2, audit_id: AUDIT_ID, domain: "tete-a-modeler.com", selected: true, score: 1 },
      { id: "c3", audit_id: AUDIT_ID, domain: "pas-retenu.fr", selected: false, score: 0.1 },
    ],
    competitor_backlinks: [
      bl(C1, "ecole.fr", "garde"),
      bl(C2, "ecole.fr", "garde"),
      bl(C1, "blog-maman.fr", "garde"),
      bl(C1, "deja-chez-nous.fr", "garde"),
      bl(C1, "spam.xyz", "exclu"),
    ],
    audit_pages: [],
    audit_gap_domains: [],
    cost_ledger: [{ audit_id: AUDIT_ID, estimated_cost_usd: 0.105, actual_cost_usd: 0.105 }],
    events: [],
  });
}

function bl(competitor_id: string, source_domain: string, clean_status: string) {
  return {
    audit_id: AUDIT_ID,
    workspace_id: WS_ID,
    competitor_id,
    source_domain,
    source_url: `https://${source_domain}/p`,
    anchor: "coloriage",
    dofollow: true,
    spam_score: 5,
    source_rank: 100,
    clean_status,
  };
}

const kwItem = (keyword: string, url: string, rank: number, volume: number) => ({
  keyword_data: { keyword, keyword_info: { search_volume: volume } },
  ranked_serp_element: { serp_item: { rank_group: rank, url } },
});

function stubDfs() {
  return {
    backlinksSummary: vi.fn(async ({ target }: { target: string }) => ({
      result: {
        referring_domains: target === DOMAIN ? 58 : target.startsWith("hugo") ? 400 : 600,
        backlinks: 340,
        broken_backlinks: 3,
        rank: 120,
        backlinks_spam_score: 4,
      },
    })),
    backlinksReferringDomains: vi.fn(async () => ({
      result: {
        total_count: 2,
        items: [{ domain: "deja-chez-nous.fr" }, { domain: "www.autre.fr" }],
      },
    })),
    backlinksBacklinks: vi.fn(async () => ({
      result: {
        items: [
          {
            domain_from: "autre.fr",
            url_to: `https://${DOMAIN}/licorne`,
            anchor: "coloriage licorne",
            dofollow: true,
          },
          {
            domain_from: "deja-chez-nous.fr",
            url_to: `https://${DOMAIN}/licorne/`,
            anchor: "Mega Coloring",
            dofollow: true,
          },
          { domain_from: "autre.fr", url_to: `https://${DOMAIN}/`, anchor: "ici", dofollow: false },
        ],
      },
    })),
    labsRankedKeywords: vi.fn(async () => ({
      result: {
        items: [
          kwItem("coloriage licorne", `https://${DOMAIN}/licorne`, 14, 74000),
          kwItem("coloriage chat", `https://${DOMAIN}/chat`, 2, 90000),
          kwItem("coloriage dino", `https://${DOMAIN}/dino`, 7, 12000),
        ],
      },
    })),
    onpageInstantPages: vi.fn(async ({ url }: { url: string }) => ({
      result: {
        items: [
          url.endsWith("/dino")
            ? { status_code: 404, onpage_score: 30, checks: {} }
            : { status_code: 200, onpage_score: 92, checks: {} },
        ],
      },
    })),
  };
}

const OK_SUMMARY =
  "Le site compte 58 domaines référents, contre une médiane d'environ 500 chez les concurrents mesurés. Deux pages sont en positions 4 à 20.";

async function runAll(db: ReturnType<typeof setup>, llm: unknown) {
  const dfs = stubDfs();
  const run = (await beginProfile(db.client, AUDIT_ID))!;
  const own = await collectOwnProfile(db.client, dfs as never, run);
  const bench = [];
  for (const c of run.benchmark) bench.push(await fetchBenchmark(db.client, dfs as never, run, c));
  const benchmarkMedian = median(bench.map((b) => b.referringDomains!).filter((n) => n !== null));
  const pages = await collectPages(db.client, dfs as never, run, own.pageDomains);
  await computePageNeeds(db.client, run, benchmarkMedian);
  const tech = await runOnpage(db.client, dfs as never, run);
  const gap = await computeGapStep(db.client, run, own.ownDomains);
  const data: ProfileData = {
    totals: own.totals,
    anchors: own.anchors,
    ownDomainsPartial: own.ownDomainsPartial,
    benchmark: bench,
    benchmarkMedian,
    pages: { total: pages.pages, keywords: pages.keywords, priority: pages.priority, ...tech },
    gap,
    limits: run.limits,
  };
  const summary = await summarizeProfile(db.client, llm as never, run, data);
  const done = await finalizeProfile(db.client, run, data);
  return { dfs, run, own, bench, benchmarkMedian, pages, tech, gap, data, summary, done };
}

describe("beginProfile", () => {
  it("confirme -> en_cours, concurrents de repère limités et ordonnés", async () => {
    const db = setup();
    const run = await beginProfile(db.client, AUDIT_ID);
    expect(run).toMatchObject({ domain: DOMAIN, plan: "gratuit" });
    expect(run!.benchmark.map((c) => c.domain)).toEqual([
      "hugolescargot.com",
      "tete-a-modeler.com",
    ]);
    expect(db.tables.audits![0]!.profile_status).toBe("en_cours");
  });
  it("n'exécute JAMAIS une étape non confirmée, ni sans backlinks terminés", async () => {
    for (const s of ["aucun", "termine", "echoue"]) {
      expect(await beginProfile(setup({ profileStatus: s }).client, AUDIT_ID)).toBeNull();
    }
    expect(await beginProfile(setup({ backlinksStatus: "en_cours" }).client, AUDIT_ID)).toBeNull();
  });
  it("reprise : déjà en_cours reste exécutable", async () => {
    expect(
      await beginProfile(setup({ profileStatus: "en_cours" }).client, AUDIT_ID),
    ).not.toBeNull();
  });
});

describe("pipeline complet sur fixtures", () => {
  const llm = {
    generate: vi.fn(async () => ({ data: { summary: OK_SUMMARY }, model: "gpt-4o-mini" })),
  };

  it("remplit audit_pages, l'écart et le résumé ; termine avec le coût de l'étape", async () => {
    const db = setup();
    const r = await runAll(db, llm);

    expect(r.own.totals.referringDomains).toBe(58);
    expect(r.own.ownDomains).toEqual(["deja-chez-nous.fr", "autre.fr"]);
    expect(r.own.pageDomains[`https://${DOMAIN}/licorne`]).toBe(2);
    expect(r.benchmarkMedian).toBe(500);

    const pages = db.tables.audit_pages!;
    expect(pages).toHaveLength(3);
    const licorne = pages.find((p) => String(p.url).endsWith("/licorne"))!;
    expect(licorne).toMatchObject({ is_priority: true, priority_rank: 1, referring_domains: 2 });
    // Besoin : 500 x 0,2 x 1 - 2 = 98 -> ordre de grandeur 100.
    expect(licorne.required_domains_estimated).toBe(100);
    expect(Number(licorne.required_domains_low)).toBeLessThan(100);
    expect(Number(licorne.required_domains_high)).toBeGreaterThan(100);
    const chat = pages.find((p) => String(p.url).endsWith("/chat"))!;
    expect(chat.is_priority).toBe(false);
    expect(chat.required_domains_estimated).toBeUndefined();
    const dino = pages.find((p) => String(p.url).endsWith("/dino"))!;
    expect(dino).toMatchObject({
      tech_status: "probleme",
      tech_issues: ["http_erreur", "score_faible"],
    });
    expect(r.tech).toEqual({ checked: 3, problems: 1 });

    // Écart : ecole.fr (2 concurrents) puis blog-maman.fr ; pas les exclus ni ceux qui nous citent.
    expect(db.tables.audit_gap_domains!.map((g) => g.domain)).toEqual([
      "ecole.fr",
      "blog-maman.fr",
    ]);
    expect(r.gap).toEqual({ count: 2, topCount: 2 });

    const audit = db.tables.audits![0]!;
    expect(audit).toMatchObject({
      profile_status: "termine",
      profile_summary: OK_SUMMARY,
      profile_summary_source: "llm",
    });
    // Le coût de l'étape = total du ledger - découverte - backlinks (ici 0 : stubs sans ledger).
    expect(Number(audit.profile_cost_usd)).toBe(0);
    expect(db.tables.events!.map((e) => e.type)).toContain("audit.profile_completed");
  });

  it("le résumé stocké ne contient aucune promesse, même si le LLM en produit", async () => {
    const db = setup();
    const bad = {
      generate: vi.fn(async () => ({
        data: {
          summary:
            "Avec ces liens, la page licorne atteindra la première place, c'est garanti sans aucun doute.",
        },
        model: "m",
      })),
    };
    await runAll(db, bad);
    const audit = db.tables.audits![0]!;
    expect(audit.profile_summary_source).toBe("modele");
    expect(containsRankingPromise(String(audit.profile_summary))).toBe(false);
    expect(bad.generate).toHaveBeenCalledTimes(2);
  });

  it("sans LLM configuré : résumé de modèle, l'audit n'échoue pas", async () => {
    const db = setup();
    await runAll(db, null);
    expect(db.tables.audits![0]).toMatchObject({
      profile_status: "termine",
      profile_summary_source: "modele",
    });
  });

  it("est rejouable : pas de doublons de pages ni de domaines d'écart", async () => {
    const db = setup();
    const r = await runAll(db, llm);
    const dfs = stubDfs();
    await collectPages(db.client, dfs as never, r.run, r.own.pageDomains);
    await computeGapStep(db.client, r.run, r.own.ownDomains);
    expect(db.tables.audit_pages).toHaveLength(3);
    expect(db.tables.audit_gap_domains).toHaveLength(2);
  });
});

describe("plafond de l'audit", () => {
  it("BudgetExceededError AVANT tout appel payant quand le plafond est atteint", async () => {
    const db = setup({ cap: 0.11 });
    const dfs = stubDfs();
    const run = (await beginProfile(db.client, AUDIT_ID))!;
    await expect(collectOwnProfile(db.client, dfs as never, run)).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(dfs.backlinksReferringDomains).not.toHaveBeenCalled();
    expect(dfs.backlinksBacklinks).not.toHaveBeenCalled();
  });
});

describe("failProfile", () => {
  it("passe en echoue uniquement depuis un état actif", async () => {
    const a = setup({ profileStatus: "en_cours" });
    await failProfile(a.client, AUDIT_ID, "boum");
    expect(a.tables.audits![0]).toMatchObject({ profile_status: "echoue", profile_error: "boum" });
    const b = setup({ profileStatus: "termine" });
    await failProfile(b.client, AUDIT_ID, "boum");
    expect(b.tables.audits![0]!.profile_status).toBe("termine");
  });
});

describe("estimateProfile", () => {
  it("gratuit après découverte et backlinks : tient dans le plafond restant, lignes réduites", () => {
    const e = estimateProfile(3, "gratuit", 0.25 - 0.105)!;
    expect(e).not.toBeNull();
    expect(e.totalUsd).toBeLessThanOrEqual(0.145);
    expect(e.limits.benchmarkCompetitors).toBe(3);
    expect(e.limits.keywords).toBeLessThanOrEqual(100);
  });
  it("payant : limites pleines", () => {
    const e = estimateProfile(10, "payant", 0.4)!;
    expect(e.limits).toEqual(PROFILE_LIMITS.payant);
    expect(e.totalUsd).toBeLessThan(0.4);
  });
  it("retire des concurrents de repère puis refuse si rien ne passe", () => {
    const small = estimateProfile(3, "gratuit", 0.11)!;
    expect(small.limits.benchmarkCompetitors).toBeLessThan(3);
    expect(estimateProfile(3, "gratuit", 0.02)).toBeNull();
    expect(estimateProfile(0, "gratuit", 5)).toBeNull();
  });
  it("limite le repère au nombre de concurrents retenus", () => {
    expect(estimateProfile(2, "payant", 1)!.limits.benchmarkCompetitors).toBe(2);
  });
});

describe("startProfile (confirmation du coût)", () => {
  function startSetup(over: Parameters<typeof setup>[0] = { profileStatus: "aucun" }) {
    const db = setup(over);
    const user = fakeSupabase({}, {});
    user.tables.audits = db.tables.audits!;
    user.tables.competitors = db.tables.competitors!;
    user.tables.events = db.tables.events!;
    return { db, user };
  }
  it("fige limites et coût estimé, passe à confirme et envoie l'événement", async () => {
    const { db, user } = startSetup();
    const send = vi.fn(async () => undefined);
    const res = await startProfile(user.client, AUDIT_ID, () => db.client, send);
    expect(res.status).toBe("ok");
    const audit = db.tables.audits![0]!;
    expect(audit.profile_status).toBe("confirme");
    expect(Number(audit.profile_estimated_cost_usd)).toBeGreaterThan(0);
    expect(Number(audit.profile_estimated_cost_usd)).toBeLessThanOrEqual(0.145);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: PROFILE_EVENT,
        data: expect.objectContaining({ auditId: AUDIT_ID }),
      }),
    );
  });
  it("refuse sans backlinks terminés, sans concurrent, ou hors plafond ; aucun envoi", async () => {
    const send = vi.fn();
    const a = startSetup({ profileStatus: "aucun", backlinksStatus: "aucun" });
    expect((await startProfile(a.user.client, AUDIT_ID, () => a.db.client, send)).status).toBe(
      "error",
    );
    const b = startSetup();
    b.user.tables.competitors!.forEach((c) => (c.selected = false));
    expect((await startProfile(b.user.client, AUDIT_ID, () => b.db.client, send)).status).toBe(
      "error",
    );
    const c = startSetup({ profileStatus: "aucun", cap: 0.12 });
    expect((await startProfile(c.user.client, AUDIT_ID, () => c.db.client, send)).status).toBe(
      "error",
    );
    expect(send).not.toHaveBeenCalled();
    expect(c.db.tables.audits![0]!.profile_status).toBe("aucun");
  });
  it("déjà lancé : aucun événement ; échec d'envoi : reste confirmé et relançable", async () => {
    const a = startSetup({ profileStatus: "en_cours" });
    const send = vi.fn();
    expect((await startProfile(a.user.client, AUDIT_ID, () => a.db.client, send)).status).toBe(
      "ok",
    );
    expect(send).not.toHaveBeenCalled();
    const b = startSetup();
    const failing = vi.fn(async () => {
      throw new Error("inngest down");
    });
    expect((await startProfile(b.user.client, AUDIT_ID, () => b.db.client, failing)).status).toBe(
      "error",
    );
    expect(b.db.tables.audits![0]!.profile_status).toBe("confirme");
    const ok = vi.fn(async () => undefined);
    expect((await startProfile(b.user.client, AUDIT_ID, () => b.db.client, ok)).status).toBe("ok");
    expect(ok).toHaveBeenCalledTimes(1);
  });
  it("refuse un utilisateur non connecté", async () => {
    const db = setup({ profileStatus: "aucun" });
    const user = fakeSupabase({}, { userId: null });
    expect((await startProfile(user.client, AUDIT_ID, () => db.client, vi.fn())).status).toBe(
      "error",
    );
  });
});

describe("job Inngest", () => {
  it("est enregistré et valide son événement", () => {
    expect(functions).toContain(auditProfile);
    expect(profileEventSchema.safeParse({ auditId: AUDIT_ID }).success).toBe(true);
    expect(profileEventSchema.safeParse({ auditId: "x" }).success).toBe(false);
  });
});

describe("ProfileSection", () => {
  const base: ProfileView = {
    status: "aucun",
    estimate: { totalUsd: 0.1, competitors: 3, rows: 50, pages: 3 },
    data: null,
    summary: null,
    summarySource: null,
    costUsd: null,
    errorMessage: null,
    pages: [],
    gap: [],
  };
  const render = (view: ProfileView) =>
    renderToStaticMarkup(
      createElement(ProfileSection, {
        view,
        startAction: async () => ({ status: "idle" as const }),
      }),
    );

  it("propose la confirmation du coût avant lancement", () => {
    const html = render(base);
    expect(html).toContain("Confirmer et analyser le profil de liens");
    expect(html).toContain("Coût estimé");
  });
  it("affiche l'échec et le bouton de relance", () => {
    expect(render({ ...base, status: "echoue", errorMessage: "boum" })).toContain("a échoué");
  });
  it("affiche le résumé, les pages, l'écart et l'avertissement sans promesse", async () => {
    const db = setup();
    const r = await runAll(db, {
      generate: async () => ({ data: { summary: OK_SUMMARY }, model: "m" }),
    });
    const html = render({
      ...base,
      status: "termine",
      data: r.data,
      summary: OK_SUMMARY,
      summarySource: "llm",
      costUsd: 0.1,
      pages: [
        {
          url: `https://${DOMAIN}/licorne`,
          avgPosition: 14,
          totalVolume: 74000,
          pageDomains: 2,
          neededLow: 60,
          neededHigh: 140,
          neededEstimated: 100,
          techStatus: "probleme",
          techIssues: ["http_erreur"],
        },
      ],
      gap: [
        {
          domain: "ecole.fr",
          competitorsCount: 2,
          competitors: ["a.fr", "b.fr"],
          sampleUrl: "https://ecole.fr/p",
        },
      ],
    });
    expect(html).toContain(OK_SUMMARY.replace(/'/g, "&#x27;"));
    expect(html).toContain("ordres de grandeur, jamais une promesse de classement");
    expect(html).toContain("~100 (60-140)");
    expect(html).toContain("page en erreur");
    expect(html).toContain("ecole.fr");
  });
});
