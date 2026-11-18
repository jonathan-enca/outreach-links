import { describe, expect, it, vi } from "vitest";
import { AUDIT_BUDGET } from "@/features/audits/beta";
import { advanceChain } from "@/features/audits/chain";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { PLAN_LIMITS } from "@/features/audits/plans";
import {
  computeAuditEstimate,
  confirmAudit,
  createAudit,
  type SendEvent,
} from "@/features/audits/service";
import { t } from "@/lib/messages";
import { estimateAnalysis, linksStateUsd } from "./estimate";
import { executeLinksState } from "./links-state";
import {
  runAnalysis,
  trackedRunner,
  type AnalysisRun,
  type Orchestration,
  type Stage,
  type StageResult,
  type StepRunner,
} from "./orchestrate";
import { cleanCounters, MemoryProgress } from "./progress";
import { beginAnalysis, failAnalysis, realOrchestration, type AnalysisDeps } from "./run";
import { ANALYSIS_EVENT, startAnalysis } from "./service";
import { ANALYSIS_STEP_KEYS, SEQUENTIAL_STEPS, stepPosition } from "./steps";

const RUN: AnalysisRun = {
  auditId: "audit-1",
  workspaceId: "ws-1",
  siteId: "site-1",
  domain: "exemple-coloriage.fr",
  actorId: "user-1",
  costCapUsd: 2,
  nonce: "2026-11-16T10:00:00.000Z",
};

/** `step.run` d'Inngest en miniature : un step déjà joué rend son résultat sans rejouer sa fonction. */
function memoRunner() {
  const memo = new Map<string, unknown>();
  const executed: string[] = [];
  const runStep: StepRunner = async (id, fn) => {
    if (memo.has(id)) return memo.get(id) as never;
    executed.push(id);
    const out = await fn();
    memo.set(id, JSON.parse(JSON.stringify(out ?? null)));
    return memo.get(id) as never;
  };
  return { runStep, executed, memo };
}

const direct: StepRunner = (_id, fn) => fn();

function fakeOrchestration(
  results: Partial<Record<string, StageResult>> = {},
  over: Partial<Orchestration> = {},
) {
  const calls: string[] = [];
  const progress = new MemoryProgress();
  const stage = (key: Stage["key"]): Stage => ({
    key,
    run: async (_run, { runStep }) =>
      runStep(key, async () => {
        calls.push(key);
        return results[key] ?? { status: "fait" };
      }),
  });
  const o: Orchestration = {
    begin: async () => RUN,
    launchParallel: async () => {
      calls.push("parallele");
    },
    stages: (["comprendre", "concurrents", "recherche", "tri", "constats"] as const).map(stage),
    progressFor: () => progress,
    finalize: async () => {
      calls.push("fin");
      return { shortlist: 12, findings: 2, costUsd: 0.31, durationSeconds: 420 };
    },
    stop: async (_run, key, message) => {
      calls.push(`arret:${key}:${message}`);
    },
    ...over,
  };
  return { o, calls, progress };
}

describe("les étapes de l'analyse", () => {
  it("huit étapes, dans l'ordre affiché, chacune avec son nom", () => {
    expect(ANALYSIS_STEP_KEYS).toHaveLength(8);
    expect(ANALYSIS_STEP_KEYS.map(stepPosition)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const key of ANALYSIS_STEP_KEYS) expect(t.analysis.steps[key].length).toBeGreaterThan(3);
    expect(SEQUENTIAL_STEPS).not.toContain("etat_des_lieux");
  });
});

describe("coût annoncé de l'analyse", () => {
  it("l'attendu tient dans le budget cible ; le pire cas (jugement à 0,40 USD) reste sous le plafond", () => {
    const e = estimateAnalysis(0.018);
    expect(e.expectedUsd).toBeGreaterThan(0.3);
    expect(e.expectedUsd).toBeLessThanOrEqual(1);
    expect(e.expectedUsd).toBeLessThanOrEqual(AUDIT_BUDGET.targetUsd);
    // Chantier G : budget de jugement porté à 0,40 USD ; le pire cas dépasse la cible, jamais le plafond.
    expect(e.worstUsd).toBeLessThanOrEqual(1.5);
    expect(e.worstUsd).toBeLessThanOrEqual(PLAN_LIMITS.payant.costCapUsd);
    expect(e.expectedUsd).toBeCloseTo(e.discoveryUsd + e.analysisUsd, 6);
    expect(linksStateUsd()).toBeLessThan(0.1);
  });

  it("par défaut le coût affiché est celui de l'analyse unique : plus de backlinks des concurrents", () => {
    const site = {
      domain: "exemple-coloriage.fr",
      niche: "coloriages",
      offeredAsset: null,
      priorityQueries: ["a b", "c d", "e f"],
      workspacePlan: "payant",
    };
    const next = computeAuditEstimate(site);
    expect(next.chain.analysisUsd).toBeGreaterThan(0);
    expect(next.chain.backlinksUsd).toBe(0);
    expect(next.chain.opportunitiesUsd).toBe(0);
    expect(next.chain.uncovered).toEqual([]);
    expect(next.chain.totalUsd).toBeLessThanOrEqual(1);
    const legacy = computeAuditEstimate({ ...site, legacyChain: true });
    expect(legacy.chain.analysisUsd).toBeUndefined();
    expect(legacy.chain.backlinksUsd).toBeGreaterThan(0);
  });
});

describe("orchestrateur", () => {
  it("un seul lancement enchaîne toutes les étapes, l'état des lieux partant en parallèle au début", async () => {
    const { o, calls } = fakeOrchestration();
    const out = await runAnalysis(o, "audit-1", direct);
    expect(calls).toEqual([
      "parallele",
      "comprendre",
      "concurrents",
      "recherche",
      "tri",
      "constats",
      "fin",
    ]);
    expect(out).toMatchObject({ status: "termine", shortlist: 12, costUsd: 0.31 });
  });

  it("ne fait rien si l'analyse n'est pas confirmée (jamais d'appel payant sans accord)", async () => {
    const { o, calls } = fakeOrchestration({}, { begin: async () => null });
    expect(await runAnalysis(o, "audit-1", direct)).toEqual({ status: "ignore" });
    expect(calls).toEqual([]);
  });

  it("l'état des lieux qui ne part pas n'arrête jamais la suite", async () => {
    const { o, calls } = fakeOrchestration(
      {},
      {
        launchParallel: async () => {
          throw new Error("Inngest injoignable");
        },
      },
    );
    const out = await runAnalysis(o, "audit-1", direct);
    expect(out.status).toBe("termine");
    expect(calls).toContain("constats");
  });

  it("un arrêt propre met l'analyse en échec avec le message, et n'exécute pas la suite", async () => {
    const { o, calls } = fakeOrchestration({
      concurrents: { status: "arret", message: t.analysis.errors.noCompetitors },
    });
    const out = await runAnalysis(o, "audit-1", direct);
    expect(out).toMatchObject({ status: "arret", step: "concurrents" });
    expect(calls).toEqual([
      "parallele",
      "comprendre",
      "concurrents",
      `arret:concurrents:${t.analysis.errors.noCompetitors}`,
    ]);
  });

  it("une étape sans objet ou déjà faite laisse l'analyse se terminer", async () => {
    const { o } = fakeOrchestration({
      comprendre: { status: "deja" },
      constats: { status: "saute" },
    });
    const out = await runAnalysis(o, "audit-1", direct);
    expect(out).toMatchObject({
      status: "termine",
      stages: { comprendre: "deja", constats: "saute", tri: "fait" },
    });
  });

  it("une panne puis une nouvelle tentative ne rejoue aucun step déjà fait", async () => {
    let failures = 1;
    const { o, calls } = fakeOrchestration();
    const flaky: Stage = {
      key: "tri",
      run: async (_r, { runStep }) =>
        runStep("tri", async () => {
          if (failures-- > 0) throw new Error("panne du lecteur");
          calls.push("tri");
          return { status: "fait" } as StageResult;
        }),
    };
    const stages = o.stages.map((s) => (s.key === "tri" ? flaky : s));
    const m = memoRunner();
    await expect(runAnalysis({ ...o, stages }, "audit-1", m.runStep)).rejects.toThrow("panne");
    const before = [...calls];
    expect(before).toEqual(["parallele", "comprendre", "concurrents", "recherche"]);
    const out = await runAnalysis({ ...o, stages }, "audit-1", m.runStep);
    expect(out.status).toBe("termine");
    // Seules les étapes restantes ont travaillé : rien de déjà fait n'a été rejoué.
    expect(calls).toEqual([...before, "tri", "constats", "fin"]);
    // Seul le step qui avait échoué (« tri ») a été joué deux fois ; tous les autres une seule.
    const counts = new Map<string, number>();
    for (const id of m.executed) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect([...counts].filter(([, n]) => n > 1)).toEqual([["tri", 2]]);
  });
});

describe("progression écrite dans le step qui travaille", () => {
  it("compte les appels et cumule les résultats ; un step mémorisé n'écrit rien au rejeu", async () => {
    const progress = new MemoryProgress();
    const m = memoRunner();
    const play = async () => {
      const run = trackedRunner<{ n: number; label: string }>(
        { runStep: m.runStep, progress },
        "recherche",
        { prefix: "recherche", total: 3, found: (o) => o.n, example: (o) => o.label },
      );
      await run("serp-1", async () => ({ n: 4, label: "coloriages blog de classe" }));
      await run("serp-2", async () => ({ n: 6, label: "coloriages médiathèque" }));
    };
    await play();
    expect(m.executed).toEqual(["recherche:serp-1", "recherche:serp-2"]);
    expect(progress.steps.get("recherche")).toMatchObject({
      counters: { done: 2, total: 3, found: 10 },
      example: "coloriages médiathèque",
    });
    const writes = progress.writes.length;
    await play();
    expect(progress.writes).toHaveLength(writes);
  });

  it("une étape terminée n'est pas rouverte ; les compteurs illisibles sont écartés", async () => {
    const p = new MemoryProgress();
    await p.update("tri", { status: "termine", counters: { done: 3 } });
    await p.update("tri", { counters: { done: 1 } });
    await p.update("tri", { status: "en_cours" });
    expect(p.steps.get("tri")).toMatchObject({ status: "termine", counters: { done: 3 } });
    expect(cleanCounters({ done: 2.4, total: NaN, found: -1 })).toEqual({ done: 2 });
    expect(cleanCounters({})).toBeNull();
  });
});

// ----- Lancement et reprise -----------------------------------------------------

const AUDIT = {
  id: "audit-1",
  workspace_id: "ws-1",
  site_id: "site-1",
  status: "confirme",
  analysis_status: "aucun",
  analysis_confirmed_at: null,
  analysis_started_at: null,
  estimated_cost_usd: 0.018,
  cost_cap_usd: 2,
  created_by: "user-1",
};

function db(audit: Record<string, unknown> = {}, extra: Record<string, unknown[]> = {}) {
  const rpc = vi.fn<(name: string, args: unknown) => { data: unknown; error: null }>(() => ({
    data: true,
    error: null,
  }));
  const f = fakeSupabase(
    {
      audits: [{ ...AUDIT, ...audit }],
      sites: [{ id: "site-1", domain: "exemple-coloriage.fr" }],
      cost_ledger: [],
      events: [],
      analysis_steps: [],
      analysis_feed: [],
      ...(extra as Record<string, Record<string, unknown>[]>),
    },
    { rpc },
  );
  return { ...f, rpc };
}

describe("startAnalysis : un seul contrôle de budget, un seul événement", () => {
  it("premier lancement : l'analyse est confirmée et UN événement part, avec un identifiant stable", async () => {
    const { client, tables } = db();
    const send = vi.fn<SendEvent>(async () => {});
    const res = await startAnalysis(client, "audit-1", send, "user-1");
    expect(res).toMatchObject({ status: "ok", message: t.analysis.messages.started });
    const audit = tables.audits![0]!;
    expect(audit.analysis_status).toBe("confirme");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      id: `analysis-audit-1-${audit.analysis_confirmed_at}`,
      name: ANALYSIS_EVENT,
      data: { auditId: "audit-1" },
    });
    expect(tables.events!.map((e) => e.type)).toEqual(["analysis.requested"]);
    // Un second clic renvoie le MÊME événement (Inngest l'ignore) : pas de double lancement.
    await startAnalysis(client, "audit-1", send, "user-1");
    expect(send.mock.calls[1]![0]).toEqual(send.mock.calls[0]![0]);
  });

  it("reprise après échec : nouvelle confirmation, la découverte échouée repart, rien d'autre ne change", async () => {
    const { client, tables } = db({
      status: "echoue",
      analysis_status: "echoue",
      analysis_confirmed_at: "2026-11-16T09:00:00.000Z",
      analysis_error: "panne",
    });
    const send = vi.fn<SendEvent>(async () => {});
    const res = await startAnalysis(client, "audit-1", send, "user-1");
    expect(res).toMatchObject({ status: "ok", message: t.analysis.messages.resumed });
    expect(tables.audits![0]).toMatchObject({
      status: "confirme",
      analysis_status: "confirme",
      analysis_error: null,
    });
    expect(tables.audits![0]!.analysis_confirmed_at).not.toBe("2026-11-16T09:00:00.000Z");
    expect(tables.events!.map((e) => e.type)).toEqual(["analysis.resumed"]);
  });

  it("refuse sans rien envoyer : plafond d'audit, plafond du jour, audit non confirmé, pas connecté", async () => {
    const send = vi.fn<SendEvent>(async () => {});
    const low = db({ cost_cap_usd: 0.25 });
    expect(await startAnalysis(low.client, "audit-1", send, "user-1")).toMatchObject({
      status: "error",
      message: t.analysis.messages.overCap,
    });
    const spent = db({}, { cost_ledger: [{ audit_id: "audit-1", actual_cost_usd: 2 }] });
    expect((await startAnalysis(spent.client, "audit-1", send, "user-1")).message).toBe(
      t.analysis.messages.overCap,
    );
    const day = db(
      {},
      {
        cost_ledger: [
          { audit_id: "autre", actual_cost_usd: 30, created_at: new Date().toISOString() },
        ],
      },
    );
    expect((await startAnalysis(day.client, "audit-1", send, "user-1")).message).toBe(
      t.analysis.messages.dailyCap,
    );
    const estimated = db({ status: "estime" });
    expect((await startAnalysis(estimated.client, "audit-1", send, "user-1")).message).toBe(
      t.analysis.messages.notConfirmed,
    );
    expect((await startAnalysis(db().client, "audit-1", send, null)).status).toBe("error");
    expect(send).not.toHaveBeenCalled();
    expect(low.tables.audits![0]!.analysis_status).toBe("aucun");
  });

  it("déjà en cours ou terminée : aucun événement", async () => {
    const send = vi.fn<SendEvent>(async () => {});
    for (const s of ["en_cours", "termine"]) {
      const res = await startAnalysis(db({ analysis_status: s }).client, "audit-1", send, "user-1");
      expect(res.status).toBe("ok");
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("si l'envoi échoue, l'analyse reste confirmée et le renvoi est possible", async () => {
    const { client, tables } = db();
    const res = await startAnalysis(
      client,
      "audit-1",
      async () => {
        throw new Error("Inngest injoignable");
      },
      "user-1",
    );
    expect(res).toMatchObject({ status: "error", message: t.analysis.messages.sendFailed });
    expect(tables.audits![0]!.analysis_status).toBe("confirme");
    const send = vi.fn<SendEvent>(async () => {});
    expect((await startAnalysis(client, "audit-1", send, "user-1")).status).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("le parcours existant lance désormais l'analyse unique", () => {
  const SITE = {
    id: "site-1",
    workspace_id: "ws-1",
    domain: "exemple-coloriage.fr",
    priority_queries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
  };
  function setup(plan: string) {
    const user = fakeSupabase({
      sites: [SITE],
      audits: [],
      workspaces: [{ id: "ws-1", plan }],
      events: [],
    });
    const service = fakeSupabase({ cost_ledger: [] }, { uniqueActivePerSite: true });
    service.tables.audits = user.tables.audits!;
    service.tables.events = user.tables.events!;
    return { user, service, getService: () => service.client };
  }

  it("confirmer l'audit envoie le seul événement de l'analyse, pas celui de l'ancienne chaîne", async () => {
    const { user, service, getService } = setup("payant");
    const created = await createAudit(user.client, "site-1", getService);
    expect(created.status).toBe("ok");
    const send = vi.fn<SendEvent>(async () => {});
    const res = await confirmAudit(user.client, created.auditId!, getService, send);
    expect(res.status).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toMatchObject({ name: ANALYSIS_EVENT });
    expect(service.tables.audits![0]).toMatchObject({
      status: "confirme",
      analysis_status: "confirme",
    });
  });

  it("un plafond qui ne couvre pas toute l'analyse ne lance rien (au lieu de payer une découverte sans suite)", async () => {
    const { user, service, getService } = setup("gratuit");
    const res = await createAudit(user.client, "site-1", getService);
    expect(res).toMatchObject({ status: "error", message: t.audits.messages.overCap });
    expect(service.tables.audits).toHaveLength(0);
  });

  it("l'ancienne chaîne ne s'enchaîne plus après la découverte", async () => {
    const { client } = db({ status: "termine", auto_chain: true, backlinks_status: "aucun" });
    const send = vi.fn<SendEvent>(async () => {});
    expect(await advanceChain(client, "audit-1", send)).toEqual({ started: null });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("début et échec de l'analyse", () => {
  it("confirme -> en_cours, crée les huit lignes d'étape ; une nouvelle tentative retrouve l'analyse", async () => {
    const { client, tables } = db({
      analysis_status: "confirme",
      analysis_confirmed_at: RUN.nonce,
    });
    const run = await beginAnalysis(client, "audit-1");
    expect(run).toMatchObject({ auditId: "audit-1", actorId: "user-1", nonce: RUN.nonce });
    expect(tables.audits![0]!.analysis_status).toBe("en_cours");
    expect(tables.analysis_steps!.map((s) => s.key)).toEqual([...ANALYSIS_STEP_KEYS]);
    const again = await beginAnalysis(client, "audit-1");
    expect(again?.auditId).toBe("audit-1");
    expect(tables.analysis_steps).toHaveLength(8);
  });

  it("ne démarre pas une analyse non confirmée, terminée ou échouée", async () => {
    for (const s of ["aucun", "termine", "echoue"]) {
      expect(await beginAnalysis(db({ analysis_status: s }).client, "audit-1")).toBeNull();
    }
  });

  it("à la reprise, les étapes échouées repartent d'« en attente », les terminées restent", async () => {
    const { client, rpc } = db(
      { analysis_status: "confirme" },
      {
        analysis_steps: [
          { audit_id: "audit-1", key: "comprendre", status: "termine" },
          { audit_id: "audit-1", key: "recherche", status: "echoue" },
        ],
      },
    );
    await beginAnalysis(client, "audit-1");
    expect(rpc.mock.calls.map((c) => c[1])).toEqual([
      { p_audit: "audit-1", p_key: "recherche", p_status: "attente" },
    ]);
  });

  it("l'échec garde un message lisible, n'emporte jamais l'étape parallèle, et rend la reprise possible", async () => {
    const { client, tables, rpc } = db(
      { analysis_status: "en_cours" },
      {
        analysis_steps: [
          { audit_id: "audit-1", key: "etat_des_lieux", status: "en_cours" },
          { audit_id: "audit-1", key: "recherche", status: "en_cours" },
          { audit_id: "audit-1", key: "comprendre", status: "termine" },
        ],
      },
    );
    await failAnalysis(client, "audit-1", t.analysis.errors.interrupted);
    expect(tables.audits![0]).toMatchObject({
      analysis_status: "echoue",
      analysis_error: t.analysis.errors.interrupted,
    });
    const failed = rpc.mock.calls.map((c) => (c[1] as { p_key: string }).p_key);
    expect(failed).toEqual(["recherche"]);
    expect(tables.events!.map((e) => e.type)).toEqual(["analysis.failed"]);
    // Une analyse déjà terminée n'est jamais repassée en échec.
    const finished = db({ analysis_status: "termine" });
    await failAnalysis(finished.client, "audit-1", "x");
    expect(finished.tables.audits![0]!.analysis_status).toBe("termine");
  });
});

describe("étapes réelles : rien n'est refait ni repayé", () => {
  const paidCall = () => {
    throw new Error("appel payant inattendu");
  };
  function deps(client: ReturnType<typeof fakeSupabase>["client"], over: Partial<AnalysisDeps>) {
    const base: AnalysisDeps = {
      service: () => client,
      dfs: () => ({
        serpOrganicLive: paidCall,
        backlinksBulkReferringDomains: paidCall,
        backlinksDomainIntersection: paidCall,
        contentAnalysisSearch: paidCall,
        backlinksBacklinks: paidCall,
      }),
      brand: {
        readSite: async () => {
          throw new Error("lecture inattendue");
        },
        makeLlm: () => null,
      },
      queries: { makeLlm: () => null, getServiceClient: () => client },
      qualDeps: paidCall,
      findDeps: paidCall,
      launchLinksState: async () => {},
    };
    return { ...base, ...over };
  }
  const profileRow = {
    site_id: "site-1",
    version: 2,
    source: "llm",
    cost_usd: 0.0006,
    created_at: "2026-11-16T09:00:00Z",
    pages_read: [{ url: "https://exemple-coloriage.fr/", title: "Accueil" }],
    profile: null as unknown,
  };

  it("profil déjà établi : l'étape se termine sans lire le site ni appeler le modèle", async () => {
    const { client } = db({ analysis_status: "en_cours" }, { brand_profiles: [] });
    const progress = new MemoryProgress();
    const stage = realOrchestration(deps(client, {})).stages[0]!;
    // Sans profil et site illisible : arrêt propre, message lisible.
    const stopped = await stage.run(RUN, { runStep: direct, progress });
    expect(stopped).toEqual({ status: "arret", message: t.analysis.errors.siteUnreadable });
    expect(profileRow.site_id).toBe("site-1");
  });

  it("concurrents déjà trouvés et mesurés : aucune recherche payante n'est relancée", async () => {
    const { client } = db(
      { status: "termine", analysis_status: "en_cours", plan: "payant" },
      {
        competitors: [
          {
            audit_id: "audit-1",
            domain: "coloriez.com",
            selected: true,
            referring_domains: 812,
            score: 9,
          },
          {
            audit_id: "audit-1",
            domain: "momes.net",
            selected: true,
            referring_domains: 4000,
            score: 7,
          },
        ],
      },
    );
    const progress = new MemoryProgress();
    const stage = realOrchestration(deps(client, {})).stages[1]!;
    const out = await stage.run(RUN, { runStep: direct, progress });
    expect(out).toEqual({ status: "deja" });
    expect(progress.steps.get("concurrents")).toMatchObject({
      status: "termine",
      counters: { found: 2 },
      example: "coloriez.com",
    });
    expect(progress.feedEntries).toEqual([]);
  });

  it("aucun concurrent retenu : arrêt propre avec un message qui dit quoi corriger", async () => {
    const { client } = db({ status: "termine", analysis_status: "en_cours" }, { competitors: [] });
    const stage = realOrchestration(deps(client, {})).stages[1]!;
    const out = await stage.run(RUN, { runStep: direct, progress: new MemoryProgress() });
    expect(out).toEqual({ status: "arret", message: t.analysis.errors.noCompetitors });
  });
});

describe("état des lieux (étape parallèle)", () => {
  const run = {
    auditId: "audit-1",
    workspaceId: "ws-1",
    domain: "exemple-coloriage.fr",
    costCapUsd: 2,
  };
  const ok =
    <T>(result: T) =>
    async () => ({
      result,
      taskId: null,
      estimatedCostUsd: 0,
      actualCostUsd: 0,
      cacheHit: false,
    });
  const dfsOk = {
    backlinksSummary: ok({ referring_domains: 310, backlinks: 2200, rank: 180 }),
    backlinksReferringDomains: ok({
      total_count: 310,
      items: [
        { domain: "www.Ecole-Exemple.fr", rank: 120 },
        { domain: "blog-parents.fr", rank: 80 },
      ],
    }),
    labsRankedKeywords: ok({
      total_count: 950,
      items: [
        {
          keyword_data: { keyword: "coloriage licorne", keyword_info: { search_volume: 9900 } },
          ranked_serp_element: {
            serp_item: { rank_group: 7, url: "https://exemple-coloriage.fr/licorne" },
          },
        },
        { keyword_data: { keyword: "sans position" }, ranked_serp_element: null },
      ],
    }),
  } as never;

  it("écrit le résumé, les domaines et les mots-clés, étape terminée", async () => {
    const { client, tables } = db();
    const progress = new MemoryProgress();
    const out = await executeLinksState(
      { service: () => client, dfs: () => dfsOk },
      run,
      direct,
      progress,
    );
    expect(out.status).toBe("termine");
    expect(out.state.missing).toEqual([]);
    expect(out.state.totals).toMatchObject({ referringDomains: 310, backlinks: 2200 });
    expect(out.state.referringDomains?.sample[0]).toEqual({
      domain: "ecole-exemple.fr",
      rank: 120,
    });
    expect(out.state.keywords).toMatchObject({
      total: 950,
      top: [{ keyword: "coloriage licorne", position: 7, volume: 9900 }],
    });
    expect(tables.audits![0]!.links_state).toMatchObject({ missing: [] });
    expect(progress.steps.get("etat_des_lieux")).toMatchObject({
      status: "termine",
      counters: { done: 3, total: 3, found: 310, keywords: 950 },
    });
  });

  it("une partie en panne est notée manquante ; tout en panne : l'étape échoue, pas l'analyse", async () => {
    const boom = async () => {
      throw new Error("503");
    };
    const partial = db();
    const one = await executeLinksState(
      {
        service: () => partial.client,
        dfs: () => ({ ...(dfsOk as object), labsRankedKeywords: boom }) as never,
      },
      run,
      direct,
      new MemoryProgress(),
    );
    expect(one.status).toBe("termine");
    expect(one.state.missing).toEqual(["mots_cles"]);

    const all = db({ analysis_status: "en_cours" });
    const progress = new MemoryProgress();
    const none = await executeLinksState(
      {
        service: () => all.client,
        dfs: () =>
          ({
            backlinksSummary: boom,
            backlinksReferringDomains: boom,
            labsRankedKeywords: boom,
          }) as never,
      },
      run,
      direct,
      progress,
    );
    expect(none.status).toBe("echoue");
    expect(progress.steps.get("etat_des_lieux")?.status).toBe("echoue");
    expect(all.tables.audits![0]!.analysis_status).toBe("en_cours");
  });

  it("plafond d'audit atteint : aucun appel payant, les trois parties manquent", async () => {
    const { client } = db({}, { cost_ledger: [{ audit_id: "audit-1", actual_cost_usd: 2 }] });
    const called = vi.fn();
    const spy = async () => {
      called();
      throw new Error("ne doit pas être appelé");
    };
    const out = await executeLinksState(
      {
        service: () => client,
        dfs: () =>
          ({
            backlinksSummary: spy,
            backlinksReferringDomains: spy,
            labsRankedKeywords: spy,
          }) as never,
      },
      run,
      direct,
      new MemoryProgress(),
    );
    expect(out.state.missing).toHaveLength(3);
    expect(called).not.toHaveBeenCalled();
  });
});
