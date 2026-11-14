import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { BudgetExceededError, createDataForSeoClient, MemoryCache } from "@/lib/dataforseo";
import { auditBacklinks, backlinksEventSchema } from "@/inngest/functions/audit-backlinks";
import { functions } from "@/inngest/functions";
import { BacklinksSection, type BacklinksView } from "./backlinks-section";
import { backlinksToCsv, csvCell } from "./csv";
import { buildBacklinksCsv, parseScope } from "./export";
import { COMPETITOR, FIXTURE_ITEMS, backlinksEnvelope } from "./fixtures";
import { estimateBacklinks } from "./limits";
import {
  BACKLINKS_EVENT,
  beginBacklinks,
  cleanAuditBacklinks,
  failBacklinks,
  fetchCompetitorBacklinks,
  finalizeBacklinks,
} from "./run";
import { startBacklinks } from "./service";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const WS_ID = "22222222-2222-4222-8222-222222222222";
const COMP_ID = "33333333-3333-4333-8333-333333333333";

function setup(over: { backlinksStatus?: string; cap?: number; status?: string } = {}) {
  const db = fakeSupabase({
    sites: [{ id: "site-1", workspace_id: WS_ID, domain: "mega-coloring.com", language: "fr" }],
    audits: [
      {
        id: AUDIT_ID,
        workspace_id: WS_ID,
        site_id: "site-1",
        status: over.status ?? "termine",
        plan: "gratuit",
        cost_cap_usd: over.cap ?? 0.25,
        actual_cost_usd: 0.018,
        backlinks_status: over.backlinksStatus ?? "confirme",
        backlinks_limit: 300,
      },
    ],
    competitors: [
      { id: COMP_ID, audit_id: AUDIT_ID, domain: COMPETITOR, selected: true, score: 1 },
      { id: "c2", audit_id: AUDIT_ID, domain: "pas-retenu.fr", selected: false, score: 0.1 },
    ],
    competitor_backlinks: [],
    cost_ledger: [{ audit_id: AUDIT_ID, estimated_cost_usd: 0.018, actual_cost_usd: 0.018 }],
    events: [],
  });
  const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { target: string; limit: number }[];
    expect(body[0]!.limit).toBe(300);
    return new Response(JSON.stringify(backlinksEnvelope(FIXTURE_ITEMS, body[0]!.target)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const dfs = createDataForSeoClient({
    costClient: db.client,
    cache: new MemoryCache(),
    auth: { login: "test", password: "test" },
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async () => {},
  });
  return { db, dfs, fetchImpl };
}

describe("beginBacklinks", () => {
  it("confirme -> en_cours, seuls les concurrents retenus", async () => {
    const { db } = setup();
    const run = await beginBacklinks(db.client, AUDIT_ID);
    expect(run).toMatchObject({ domain: "mega-coloring.com", language: "fr", limit: 300 });
    expect(run!.competitors.map((c) => ({ id: c.id, domain: c.domain }))).toEqual([
      { id: COMP_ID, domain: COMPETITOR },
    ]);
    expect(db.tables.audits![0]!.backlinks_status).toBe("en_cours");
  });
  it("n'exécute JAMAIS une étape non confirmée ou un audit non terminé", async () => {
    for (const s of ["aucun", "termine", "echoue"]) {
      const { db } = setup({ backlinksStatus: s });
      expect(await beginBacklinks(db.client, AUDIT_ID), s).toBeNull();
    }
    const { db } = setup({ status: "en_cours" });
    expect(await beginBacklinks(db.client, AUDIT_ID)).toBeNull();
  });
  it("reprend une étape déjà en_cours (nouvelle tentative)", async () => {
    const { db } = setup({ backlinksStatus: "en_cours" });
    expect(await beginBacklinks(db.client, AUDIT_ID)).not.toBeNull();
  });
});

describe("pipeline complet (client DataForSEO réel, fetch simulé, aucun réseau)", () => {
  it("récupère, nettoie, compte, journalise le coût, et rejouer ne duplique rien", async () => {
    const { db, dfs, fetchImpl } = setup();
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    const f = await fetchCompetitorBacklinks(db.client, dfs, run, run.competitors[0]!);
    expect(f).toMatchObject({ domain: COMPETITOR, fetched: FIXTURE_ITEMS.length, cacheHit: false });
    expect(f.actualCostUsd).toBe(0.0203);
    expect(db.tables.competitor_backlinks).toHaveLength(FIXTURE_ITEMS.length);
    const ledger = db.tables.cost_ledger!.at(-1)!;
    expect(ledger).toMatchObject({ provider: "dataforseo", operation: "backlinks.backlinks" });
    expect(ledger.audit_id).toBe(AUDIT_ID);

    // Rejouer l'étape : cache (pas de second appel réseau) et pas de lignes en double.
    const again = await fetchCompetitorBacklinks(db.client, dfs, run, run.competitors[0]!);
    expect(again.cacheHit).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(db.tables.competitor_backlinks).toHaveLength(FIXTURE_ITEMS.length);

    const stats = await cleanAuditBacklinks(db.client, run);
    expect(stats.before).toBe(FIXTURE_ITEMS.length);
    expect(stats.after).toBe(FIXTURE_ITEMS.length - 17);
    const kept = db.tables.competitor_backlinks!.filter((r) => r.clean_status === "garde");
    expect(kept).toHaveLength(stats.after);
    const excluded = db.tables.competitor_backlinks!.filter((r) => r.clean_status === "exclu");
    expect(excluded.every((r) => (r.exclusion_reasons as string[]).length > 0)).toBe(true);

    const done = await finalizeBacklinks(db.client, run, stats);
    expect(db.tables.audits![0]).toMatchObject({ backlinks_status: "termine" });
    expect(done.backlinksCostUsd).toBeCloseTo(0.0203, 6);
    expect(db.tables.events!.at(-1)).toMatchObject({ type: "audit.backlinks_completed" });
  });

  it("refuse l'appel payant si le plafond de l'audit serait dépassé", async () => {
    const { db, dfs, fetchImpl } = setup({ cap: 0.03 });
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    await expect(
      fetchCompetitorBacklinks(db.client, dfs, run, run.competitors[0]!),
    ).rejects.toThrow(BudgetExceededError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("failBacklinks marque l'étape échouée sans toucher l'audit", async () => {
    const { db } = setup({ backlinksStatus: "en_cours" });
    await failBacklinks(db.client, AUDIT_ID, "HTTP 500");
    expect(db.tables.audits![0]).toMatchObject({
      status: "termine",
      backlinks_status: "echoue",
      backlinks_error: "HTTP 500",
    });
  });
});

describe("startBacklinks (confirmation du coût)", () => {
  function startSetup(over: Parameters<typeof setup>[0] = { backlinksStatus: "aucun" }) {
    const s = setup(over);
    const user = fakeSupabase({}, {});
    user.tables.audits = s.db.tables.audits!;
    user.tables.competitors = s.db.tables.competitors!;
    user.tables.events = s.db.tables.events!;
    return { ...s, user };
  }

  it("fige limite et coût estimé, passe à confirme et envoie l'événement", async () => {
    const { db, user } = startSetup();
    const send = vi.fn(async () => undefined);
    const res = await startBacklinks(user.client, AUDIT_ID, () => db.client, send);
    expect(res.status).toBe("ok");
    expect(db.tables.audits![0]).toMatchObject({
      backlinks_status: "confirme",
      backlinks_limit: 300,
    });
    expect(Number(db.tables.audits![0]!.backlinks_estimated_cost_usd)).toBeCloseTo(0.04918, 4);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BACKLINKS_EVENT,
        data: expect.objectContaining({ auditId: AUDIT_ID }),
      }),
    );
  });
  it("refuse si l'audit n'est pas terminé, si aucun concurrent, si hors plafond", async () => {
    const a = startSetup({ backlinksStatus: "aucun", status: "en_cours" });
    expect((await startBacklinks(a.user.client, AUDIT_ID, () => a.db.client, vi.fn())).status).toBe(
      "error",
    );
    const b = startSetup({ backlinksStatus: "aucun" });
    b.user.tables.competitors!.forEach((c) => (c.selected = false));
    expect((await startBacklinks(b.user.client, AUDIT_ID, () => b.db.client, vi.fn())).status).toBe(
      "error",
    );
    const c = startSetup({ backlinksStatus: "aucun", cap: 0.02 });
    const send = vi.fn();
    expect((await startBacklinks(c.user.client, AUDIT_ID, () => c.db.client, send)).status).toBe(
      "error",
    );
    expect(send).not.toHaveBeenCalled();
    expect(c.db.tables.audits![0]!.backlinks_status).toBe("aucun");
  });
  it("déjà lancé : aucun nouvel événement ; échec d'envoi : reste confirmé", async () => {
    const a = startSetup({ backlinksStatus: "en_cours" });
    const send = vi.fn();
    const res = await startBacklinks(a.user.client, AUDIT_ID, () => a.db.client, send);
    expect(res.status).toBe("ok");
    expect(send).not.toHaveBeenCalled();

    const b = startSetup();
    const fail = vi.fn(async () => {
      throw new Error("pas de clé");
    });
    const r2 = await startBacklinks(b.user.client, AUDIT_ID, () => b.db.client, fail);
    expect(r2.status).toBe("error");
    expect(b.db.tables.audits![0]!.backlinks_status).toBe("confirme");
  });
  it("utilisateur déconnecté ou service indisponible", async () => {
    const a = startSetup();
    const anon = fakeSupabase({}, { userId: null });
    expect((await startBacklinks(anon.client, AUDIT_ID, () => a.db.client, vi.fn())).status).toBe(
      "error",
    );
    expect(
      (
        await startBacklinks(
          a.user.client,
          AUDIT_ID,
          () => {
            throw new Error("clé absente");
          },
          vi.fn(),
        )
      ).status,
    ).toBe("error");
  });
});

describe("estimateBacklinks", () => {
  it("coût par plan, limite réduite si le budget ne suffit pas, null si impossible", () => {
    expect(estimateBacklinks(3, "gratuit", 0.23)).toMatchObject({ limit: 300, totalUsd: 0.10724 });
    expect(estimateBacklinks(20, "payant", 1.48)).toMatchObject({ limit: 1000, totalUsd: 1.02075 });
    const reduced = estimateBacklinks(3, "gratuit", 0.095);
    expect(reduced!.limit).toBeLessThan(300);
    expect(reduced!.totalUsd).toBeLessThanOrEqual(0.095);
    expect(estimateBacklinks(3, "gratuit", 0.01)).toBeNull();
    expect(estimateBacklinks(0, "gratuit", 1)).toBeNull();
  });
});

describe("export CSV", () => {
  it("neutralise l'injection de formule et échappe les séparateurs", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+33 1")).toBe("'+33 1");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(true)).toBe("oui");
    expect(csvCell(12)).toBe("12");
  });
  it("en-têtes français, BOM, motifs lisibles", () => {
    const csv = backlinksToCsv([
      {
        competitorDomain: "c.fr",
        sourceDomain: "s.fr",
        sourceUrl: "https://s.fr/a",
        targetUrl: null,
        anchor: "ancre",
        itemType: "anchor",
        dofollow: false,
        isBroken: null,
        spamScore: 3,
        sourceRank: 10,
        lastSeen: "2026-11-10T00:00:00.000Z",
        cleanStatus: "exclu",
        reasons: ["spam", "doublon"],
      },
    ]);
    expect(csv.startsWith("﻿Concurrent;Domaine source;")).toBe(true);
    expect(csv).toContain("écarté;Spam probable, Doublon");
    expect(csv).toContain(";2026-11-10;");
  });
  it("buildBacklinksCsv : propres par défaut, tout avec motifs", async () => {
    const { db, dfs } = setup();
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    await fetchCompetitorBacklinks(db.client, dfs, run, run.competitors[0]!);
    await cleanAuditBacklinks(db.client, run);
    const kept = await buildBacklinksCsv(db.client, AUDIT_ID, parseScope(null));
    const all = await buildBacklinksCsv(db.client, AUDIT_ID, parseScope("tout"));
    const lines = (s: string) => s.trim().split("\r\n").length - 1;
    expect(lines(kept!.csv)).toBe(FIXTURE_ITEMS.length - 17);
    expect(lines(all!.csv)).toBe(FIXTURE_ITEMS.length);
    expect(all!.csv).toContain("Site étranger hors langue cible");
    expect(kept!.csv).not.toContain("casino-en-ligne-gratuit.fr");
    expect(kept!.domain).toBe("mega-coloring.com");
    expect(await buildBacklinksCsv(db.client, "inconnu", "tout")).toBeNull();
  });
});

describe("interface et job", () => {
  const noop = async () => ({ status: "idle" as const });
  const stats = {
    before: 28,
    after: 11,
    excluded: 17,
    domainsBefore: 25,
    domainsAfter: 10,
    byReason: { interne: 2, plateforme: 2, spam: 5, image_reuse: 3, foreign: 4, doublon: 1 },
    perCompetitor: [{ domain: COMPETITOR, before: 28, after: 11 }],
  };
  const base: BacklinksView = {
    status: "aucun",
    estimate: { totalUsd: 0.087, perCompetitorUsd: 0.029, competitors: 3, limit: 300 },
    stats: null,
    costUsd: null,
    errorMessage: null,
    sample: [],
    exportKeptHref: "/app/audit/a/export?portee=propres",
    exportAllHref: "/app/audit/a/export?portee=tout",
  };
  const render = (view: BacklinksView) =>
    renderToStaticMarkup(createElement(BacklinksSection, { view, startAction: noop }));

  it("propose l'estimation et un bouton de confirmation", () => {
    const html = render(base);
    expect(html).toContain("Confirmer et récupérer les backlinks");
    expect(html).toContain("Coût estimé");
    expect(render({ ...base, status: "confirme" })).toContain("Relancer l");
  });
  it("hors plafond : message, pas de bouton", () => {
    const html = render({ ...base, estimate: null });
    expect(html).toContain("ne permet pas");
    expect(html).not.toContain("<button");
  });
  it("en cours et échec", () => {
    expect(render({ ...base, status: "en_cours" })).toContain("en cours");
    const f = render({ ...base, status: "echoue", errorMessage: "HTTP 500" });
    expect(f).toContain("a échoué");
    expect(f).toContain("HTTP 500");
  });
  it("terminé : compteurs avant/après, motifs, exports", () => {
    const html = render({
      ...base,
      status: "termine",
      stats,
      costUsd: 0.0609,
      sample: [
        {
          sourceDomain: "blog-maman.fr",
          sourceUrl: "https://blog-maman.fr/a",
          anchor: null,
          spamScore: 5,
          dofollow: true,
        },
      ],
    });
    expect(html).toContain("Liens récupérés");
    expect(html).toContain(">28<");
    expect(html).toContain(">11<");
    expect(html).toContain("Spam probable");
    expect(html).toContain("blog-maman.fr");
    expect(html).toContain('href="/app/audit/a/export?portee=tout"');
  });
  it("le job est enregistré et exige un identifiant d'audit valide", () => {
    expect(functions).toContain(auditBacklinks);
    expect(backlinksEventSchema.safeParse({ auditId: "pas-un-uuid" }).success).toBe(false);
    expect(backlinksEventSchema.safeParse({ auditId: AUDIT_ID }).success).toBe(true);
  });
});
