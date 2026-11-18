import { describe, expect, it } from "vitest";
import type { ContactResult } from "@/features/contacts/types";
import type { BatchOutcome, BatchRequest, LlmBatchClient } from "@/lib/llm/batch";
import type { LlmClient } from "@/lib/llm/client";
import { EVAL_CONTEXT, evalCandidate, evalPage } from "./eval-set";
import { executeQualification, type QualDeps } from "./funnel";
import { QUALIFY_LIMITS } from "./limits";
import type { QualCandidate } from "./types";

const ctx = EVAL_CONTEXT;
const cands = (n: number): QualCandidate[] =>
  Array.from({ length: n }, (_, i) =>
    evalCandidate({
      id: "t",
      candidate: {
        domain: `blog-${i}.fr`,
        sources: [{ source: "content", query: null, persona: null, rank: null, pageType: null }],
      },
      page: null,
      byRules: false,
      keep: true,
    }),
  );

/** Réponse du faux modèle : un jugement par cible du prompt, adéquation 0,8 sauf domaines pairs ≥ 10. */
const answer = (prompt: string) => {
  const data = JSON.parse(
    prompt.split("<donnees_non_fiables>\n")[1]!.split("\n</donnees_non_fiables>")[0]!,
  ) as { cibles: { id: string; domaine: string; titre: string }[] };
  return {
    results: data.cibles.map((c) => ({
      id: c.id,
      site_type: "blog",
      situation: "lien_mort",
      fit: 0.8,
      fit_reason: "Même public.",
      sells_links: false,
      same_offer: false,
      unrealistic: false,
      hook: c.titre,
      resource: 0,
    })),
  };
};

interface Opts {
  /** Nombre de lectures d'état avant la fin du lot (Infinity = ne finit jamais). */
  endsAfterPolls?: number;
  /** Groupes (g0, g1...) sans réponse exploitable. */
  missing?: string[];
  directCost?: number;
  batchCost?: number;
}

function harness(o: Opts = {}) {
  const log = { submits: 0, polls: 0, cancels: 0, results: 0, direct: 0, waits: [] as number[] };
  let clock = 0;
  let sent: BatchRequest[] = [];
  const batch: LlmBatchClient = {
    model: "m",
    estimateUsd: () => 0.001,
    submit: async (requests) => {
      log.submits++;
      sent = [...requests];
      return { id: "batch-1" };
    },
    status: async () => {
      log.polls++;
      const done = log.polls >= (o.endsAfterPolls ?? 2) && log.cancels === 0;
      return {
        state: done || log.cancels > 0 ? "termine" : "en_cours",
        processing: 0,
        succeeded: 0,
        failed: 0,
      };
    },
    results: async (_id, requests) => {
      log.results++;
      const out = new Map<string, BatchOutcome>();
      for (const r of requests) {
        if (o.missing?.includes(r.customId) || log.cancels > 0) continue;
        out.set(r.customId, {
          ok: true,
          data: answer(r.prompt),
          inputTokens: 1,
          outputTokens: 1,
          costUsd: o.batchCost ?? 0.001,
        });
      }
      return out;
    },
    cancel: async () => {
      log.cancels++;
    },
  };
  const deps = (): QualDeps => ({
    sleep: async () => {},
    now: () => clock,
    checkRobots: async () => "ok",
    readPage: async (c) =>
      evalPage(`https://${c.domain}/`, {
        title: `Page ${c.domain}`,
        text: "Activités pour les familles.",
        links: [{ href: `https://${c.domain}/contact`, text: "Contact" }],
      }),
    guard: async () => {},
    batch: () => batch,
    llm: () =>
      ({
        spentUsd: 0,
        generate: async ({ prompt }: { prompt: string }) => {
          log.direct++;
          return {
            data: answer(prompt),
            costUsd: o.directCost ?? 0.002,
            provider: "anthropic",
            model: "m",
            inputTokens: 1,
            outputTokens: 1,
          };
        },
      }) as unknown as LlmClient,
    investigate: async (item) =>
      ({
        itemId: item.id,
        status: "email_verifie",
        email: `contact@${item.domain}`,
        emailSource: "page",
        verification: "valide",
        verifier: "mx",
        contactUrl: null,
        formUrl: null,
        reason: "",
        sendable: true,
        paidCalls: 0,
      }) as ContactResult,
  });
  const hooks = {
    wait: async (_id: string, ms: number) => {
      log.waits.push(ms);
      clock += ms;
    },
  };
  return { deps, hooks, log, sent: () => sent };
}

const step = async <T>(_id: string, fn: () => Promise<T>) => fn();
const input = (candidates: QualCandidate[], extra: object = {}) => ({
  workspaceId: null,
  auditId: null,
  ctx,
  candidates,
  budgetUsd: 0.4,
  model: "claude-haiku-4-5",
  tuning: { targetJudged: 40, pagesPerStep: 40 },
  ...extra,
});

describe("jugement par l'API par lots (arrière-plan)", () => {
  it("un seul envoi pour tout le lot, attente par pas, aucun appel direct", async () => {
    const h = harness();
    const { stats } = await executeQualification(h.deps, input(cands(40)), step, h.hooks);
    expect(h.log).toMatchObject({ submits: 1, results: 1, direct: 0, cancels: 0 });
    expect(h.sent()).toHaveLength(8); // 40 cibles / 5 par groupe
    expect(h.log.waits).toEqual([QUALIFY_LIMITS.batchPollMs, QUALIFY_LIMITS.batchPollMs]);
    expect(stats).toMatchObject({ judgeMode: "lots", judged: 40, shortlist: 40, llmFailures: 0 });
    expect(stats.batch).toMatchObject({ requests: 8, fallbacks: 0, canceled: false });
    expect(stats.costUsd).toBeCloseTo(8 * 0.001, 6);
  });

  it("même prompt et mêmes règles de tri qu'en appels directs : mêmes résultats, coût plus bas", async () => {
    const direct = harness({ directCost: 0.002 });
    const viaDirect = await executeQualification(direct.deps, input(cands(40)), step);
    const lots = harness({ batchCost: 0.001 });
    const viaLots = await executeQualification(lots.deps, input(cands(40)), step, lots.hooks);
    expect(direct.log.direct).toBe(8);
    expect(viaLots.results.map((r) => [r.domain, r.status, r.exclusionReason, r.score])).toEqual(
      viaDirect.results.map((r) => [r.domain, r.status, r.exclusionReason, r.score]),
    );
    expect(viaLots.stats.costUsd).toBeLessThan(viaDirect.stats.costUsd);
    const directPrompts = direct.log.direct;
    expect(directPrompts).toBe(lots.sent().length);
  });

  it("sans attente fournie (première liste, clic manuel) : appels directs, l'API par lots n'est pas touchée", async () => {
    const h = harness();
    const { stats } = await executeQualification(h.deps, input(cands(40)), step);
    expect(h.log.submits).toBe(0);
    expect(h.log.direct).toBe(8);
    expect(stats.judgeMode).toBeUndefined();
  });

  it("lot trop lent : annulé, puis chaque groupe sans réponse est rejugé en appel direct", async () => {
    const h = harness({ endsAfterPolls: Infinity });
    const { stats } = await executeQualification(h.deps, input(cands(40)), step, h.hooks);
    expect(h.log.cancels).toBe(1);
    expect(h.log.direct).toBe(8);
    expect(stats.batch).toMatchObject({ canceled: true, fallbacks: 8 });
    expect(stats).toMatchObject({ judged: 40, shortlist: 40, llmFailures: 0 });
    // L'attente est bornée : délai maximal + quelques lectures après l'annulation.
    const waited = h.log.waits.reduce((a, b) => a + b, 0);
    expect(waited).toBeLessThanOrEqual(
      QUALIFY_LIMITS.batchMaxWaitMs + 5 * QUALIFY_LIMITS.batchPollMs,
    );
  });

  it("un groupe sans réponse exploitable : seul ce groupe est rejugé en direct", async () => {
    const h = harness({ missing: ["g3"] });
    const { stats } = await executeQualification(h.deps, input(cands(40)), step, h.hooks);
    expect(h.log.direct).toBe(1);
    expect(stats.batch).toMatchObject({ fallbacks: 1, canceled: false });
    expect(stats.judged).toBe(40);
  });

  it("budget : les groupes qui ne tiennent pas restent en réserve, jamais jugés ni perdus", async () => {
    const h = harness();
    // Pire cas d'un groupe de 5 au tarif des lots ≈ 0,0045 USD : un budget de 0,02 en couvre 4.
    const { results, stats } = await executeQualification(
      h.deps,
      input(cands(40), { budgetUsd: 0.02, model: "claude-haiku-4-5" }),
      step,
      h.hooks,
    );
    expect(h.sent().length).toBeGreaterThan(0);
    expect(h.sent().length).toBeLessThan(8);
    expect(stats.stop).toBe("budget");
    const reserve = results.filter((r) => r.exclusionReason === "hors_budget_llm");
    expect(reserve.length).toBe(40 - stats.judged);
    expect(reserve.every((r) => r.status === "reserve")).toBe(true);
  });

  it("rejeu d'un lot déjà envoyé : aucune nouvelle requête (envoi, états et résultats mémorisés)", async () => {
    const memo = new Map<string, unknown>();
    const memoStep = async <T>(id: string, fn: () => Promise<T>) => {
      if (memo.has(id)) return memo.get(id) as T;
      const out = await fn();
      memo.set(id, JSON.parse(JSON.stringify(out)));
      return out;
    };
    const first = harness();
    const a = await executeQualification(first.deps, input(cands(40)), memoStep, first.hooks);
    const replay = harness();
    const b = await executeQualification(replay.deps, input(cands(40)), memoStep, replay.hooks);
    expect(replay.log).toMatchObject({ submits: 0, polls: 0, results: 0, direct: 0, cancels: 0 });
    expect(b.stats).toEqual(a.stats);
    expect(b.results.map((r) => r.domain)).toEqual(a.results.map((r) => r.domain));
  });
});
