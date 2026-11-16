import type { ContactItem, ContactResult } from "@/features/contacts/types";
import type { PageRead } from "@/features/triage/page-reader";
import { BudgetExceededError } from "@/lib/dataforseo";
import { LlmBudgetExceededError, type LlmClient } from "@/lib/llm/client";
import { authorityImpact, runFreeStages, type AuthorityImpact, type FreeVerdict } from "./free";
import { batchWorstUsd, QUALIFY_LIMITS } from "./limits";
import { judgeBatch, type BatchItem } from "./llm";
import { pageVerdict, type PageVerdict } from "./page";
import { finalScore, judgementExclusion, preContactScore, requestAndWhy } from "./score";
import type {
  ContactOutcome,
  ExclusionReason,
  LlmJudgement,
  QualCandidate,
  QualContext,
  QualResult,
  QualStatus,
  Stage,
} from "./types";

/** Un appel externe = un step Inngest (reprise sans refaire ce qui est fait). */
export type StepRunner = <T>(id: string, fn: () => Promise<T>) => Promise<T>;

export interface QualDeps {
  readPage: (c: QualCandidate) => Promise<PageRead>;
  /** Client LLM plafonné à `remainingUsd` ; null sans clé (les cibles restent « non qualifiées »). */
  llm: (remainingUsd: number) => LlmClient | null;
  /** Plafonds durs (audit, sécurité, jour) contrôlés AVANT chaque appel payant ; lève si dépassé. */
  guard: (estimateUsd: number) => Promise<void>;
  investigate: (item: ContactItem) => Promise<ContactResult>;
}

export interface QualInput {
  workspaceId: string | null;
  auditId: string | null;
  ctx: QualContext;
  candidates: QualCandidate[];
  budgetUsd: number;
  model: string;
}

export type QualStop = "termine" | "budget" | "plafond";

export interface FunnelStats {
  candidates: number;
  afterStage1: number;
  afterStage2: number;
  pagesRead: number;
  alive: number;
  judged: number;
  relevant: number;
  contactsSearched: number;
  withContact: number;
  shortlist: number;
  reserve: number;
  llmCalls: number;
  llmFailures: number;
  costUsd: number;
  stop: QualStop;
  byReason: Partial<Record<ExclusionReason, number>>;
  authority: AuthorityImpact;
}

interface Track {
  free: FreeVerdict;
  stage: Stage;
  reason: ExclusionReason | null;
  detail: string | null;
  page: PageVerdict["page"];
  judgement: LlmJudgement | null;
  contact: ContactOutcome | null;
}

/** Motifs qui ne disent rien de la qualité de la cible : elle reste « en réserve », pas exclue. */
const RESERVE_REASONS: ReadonlySet<ExclusionReason> = new Set([
  "hors_budget_lecture",
  "hors_budget_llm",
  "hors_budget_contact",
  "non_qualifie",
]);

const chunks = <T>(xs: readonly T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

const toContact = (r: ContactResult): ContactOutcome => ({
  status: r.status,
  email: r.email,
  contactUrl: r.contactUrl,
  formUrl: r.formUrl,
  sendable: r.sendable,
  reason: r.reason,
});

/**
 * Entonnoir complet (MT.4), du moins cher au plus cher. Gratuit : étages 1-2 (calcul), 3 (lecture),
 * 5 (contact, sans finder payant). Payant : étage 4 seulement, par lots, dans l'ordre du score
 * provisoire, avec contrôle du budget de qualification ET des plafonds durs avant chaque appel.
 */
export async function executeQualification(
  deps: () => QualDeps,
  input: QualInput,
  runStep: StepRunner,
): Promise<{ results: QualResult[]; stats: FunnelStats }> {
  const L = QUALIFY_LIMITS;
  const tracks: Track[] = runFreeStages(input.candidates, input.ctx).map((free) => ({
    free,
    stage: free.stage,
    reason: free.reason,
    detail: free.detail,
    page: null,
    judgement: null,
    contact: null,
  }));
  const alive = () => tracks.filter((t) => t.reason === null);
  const byScore = (a: Track, b: Track) => b.free.provisionalScore - a.free.provisionalScore;
  const afterStage1 = tracks.filter((t) => t.stage === 2).length;
  const afterStage2 = alive().length;

  // 3. Lecture des pages (gratuit, bornée) : les meilleurs candidats provisoires d'abord.
  const toRead = alive().sort(byScore);
  for (const t of toRead.slice(L.maxPagesRead)) {
    Object.assign(t, { stage: 3, reason: "hors_budget_lecture", detail: "au-delà des pages lues" });
  }
  const reading = toRead.slice(0, L.maxPagesRead);
  for (const [k, chunk] of chunks(reading, L.pagesPerStep).entries()) {
    const verdicts = await runStep(`read-${k + 1}`, async () => {
      const d = deps();
      const out: PageVerdict[] = [];
      for (const t of chunk)
        out.push(pageVerdict(await d.readPage(t.free.candidate), t.free.candidate, input.ctx));
      return out;
    });
    chunk.forEach((t, i) => {
      const v = verdicts[i]!;
      Object.assign(t, { stage: 3, page: v.page, reason: v.reason, detail: v.detail });
    });
  }
  const aliveAfterRead = alive().length;

  // 4. LLM sur les seuls survivants (payant), par lots, sous le budget de qualification.
  let costUsd = 0;
  let stop: QualStop = "termine";
  let llmCalls = 0;
  let llmFailures = 0;
  const toJudge = alive().sort(byScore);
  for (const t of toJudge.slice(L.maxLlmTargets)) {
    Object.assign(t, { stage: 4, reason: "hors_budget_llm", detail: "au-delà des cibles jugées" });
  }
  const judging = toJudge.slice(0, L.maxLlmTargets);
  for (const [k, batch] of chunks(judging, L.batchSize).entries()) {
    const worst = batchWorstUsd(batch.length, input.model);
    if (stop !== "termine" || costUsd + worst > input.budgetUsd + 1e-9) {
      if (stop === "termine") stop = "budget";
      for (const t of batch) {
        Object.assign(t, {
          stage: 4,
          reason: "hors_budget_llm",
          detail: "budget de qualification atteint",
        });
      }
      continue;
    }
    const items: BatchItem[] = batch.map((t, i) => ({
      id: `c${i + 1}`,
      candidate: t.free.candidate,
      page: t.page!,
    }));
    const res = await runStep(`judge-${k + 1}`, async () => {
      const d = deps();
      try {
        await d.guard(worst);
      } catch (e) {
        if (e instanceof BudgetExceededError)
          return { blocked: true, failed: false, costUsd: 0, judgements: [] };
        throw e;
      }
      const llm = d.llm(input.budgetUsd - costUsd);
      if (!llm) return { blocked: false, failed: true, costUsd: 0, judgements: [] };
      try {
        const out = await judgeBatch(llm, items, input.ctx, {
          workspaceId: input.workspaceId,
          auditId: input.auditId,
        });
        return {
          blocked: false,
          failed: false,
          costUsd: out.costUsd,
          judgements: [...out.judgements],
        };
      } catch (e) {
        if (e instanceof LlmBudgetExceededError) {
          return { blocked: true, failed: false, costUsd: llm.spentUsd, judgements: [] };
        }
        // Réponse illisible ou panne : le lot reste non qualifié (coût éventuel compté), on continue.
        return { blocked: false, failed: true, costUsd: llm.spentUsd, judgements: [] };
      }
    });
    costUsd += res.costUsd;
    if (res.blocked) {
      stop = "plafond";
      for (const t of batch)
        Object.assign(t, {
          stage: 4,
          reason: "hors_budget_llm",
          detail: "plafond de sécurité atteint",
        });
      continue;
    }
    llmCalls++;
    if (res.failed) llmFailures++;
    const got = new Map(res.judgements);
    batch.forEach((t, i) => {
      const j = got.get(`c${i + 1}`) ?? null;
      t.stage = 4;
      t.judgement = j;
      if (!j) {
        t.reason = "non_qualifie";
        t.detail = "pas de jugement du modèle";
        return;
      }
      const ex = judgementExclusion(j);
      if (ex) Object.assign(t, { reason: ex.reason, detail: ex.detail });
    });
  }
  const relevant = alive();

  // 5. Contact (module M3.2, gratuit en MT.4) : sans contact, la cible quitte la liste courte.
  const contactQueue = relevant.sort(
    (a, b) =>
      preContactScore(b.free.candidate, b.judgement!, b.page) -
      preContactScore(a.free.candidate, a.judgement!, a.page),
  );
  for (const t of contactQueue.slice(L.maxContactTargets)) {
    Object.assign(t, {
      stage: 5,
      reason: "hors_budget_contact",
      detail: "au-delà des contacts recherchés",
    });
  }
  const searching = contactQueue.slice(0, L.maxContactTargets);
  for (const [k, chunk] of chunks(searching, L.contactsPerStep).entries()) {
    const found = await runStep(`contact-${k + 1}`, async () => {
      const d = deps();
      const out: ContactOutcome[] = [];
      for (const t of chunk) {
        const r = await d.investigate({
          id: t.free.candidate.domain,
          domain: t.free.candidate.domain,
          resolvedUrl: t.page!.url,
        });
        out.push(toContact(r));
      }
      return out;
    });
    chunk.forEach((t, i) => {
      const c = found[i]!;
      t.stage = 5;
      t.contact = c;
      if (!["email_verifie", "email_a_verifier", "formulaire"].includes(c.status)) {
        t.reason = "sans_contact";
        t.detail = c.reason || "aucun email ni formulaire trouvé";
      }
    });
  }

  // 6. Score final et liste courte classée.
  const scored = alive()
    .map((t) => {
      t.stage = 6;
      const s = finalScore(t.free.candidate, t.judgement!, t.page, t.contact!);
      return { t, s };
    })
    .filter((x) => x.s !== null)
    .sort(
      (a, b) =>
        b.s!.score - a.s!.score ||
        a.t.free.candidate.domain.localeCompare(b.t.free.candidate.domain),
    );
  const ranks = new Map<
    Track,
    { rank: number | null; score: number; parts: QualResult["scoreParts"] }
  >();
  scored.forEach(({ t, s }, i) =>
    ranks.set(t, { rank: i < L.shortlistSize ? i + 1 : null, score: s!.score, parts: s!.parts }),
  );

  const results: QualResult[] = tracks.map((t) => {
    const c = t.free.candidate;
    const r = ranks.get(t);
    const status: QualStatus =
      t.reason === null
        ? r?.rank
          ? "liste_courte"
          : "reserve"
        : RESERVE_REASONS.has(t.reason)
          ? "reserve"
          : "exclu";
    const rw = r && t.judgement && t.page ? requestAndWhy(c, t.judgement, t.page, input.ctx) : null;
    return {
      domain: c.domain,
      url: t.page?.url ?? c.url,
      tactics: c.tactics,
      status,
      stageReached: t.stage,
      exclusionReason: t.reason,
      exclusionDetail: t.detail,
      provisionalScore: t.free.provisionalScore,
      page: t.page,
      judgement: t.judgement,
      contact: t.contact,
      score: r?.score ?? null,
      scoreParts: r?.parts ?? null,
      rank: r?.rank ?? null,
      requestLines: rw?.lines ?? null,
      why: rw?.why ?? null,
      platformHosted: t.free.platformHosted,
      domainRank: c.domainRank,
      competitorsCount: c.competitorsCount,
    };
  });

  const byReason: FunnelStats["byReason"] = {};
  for (const r of results)
    if (r.exclusionReason) byReason[r.exclusionReason] = (byReason[r.exclusionReason] ?? 0) + 1;
  return {
    results: results.sort(
      (a, b) =>
        (a.rank ?? 1e9) - (b.rank ?? 1e9) ||
        (b.score ?? -1) - (a.score ?? -1) ||
        b.provisionalScore - a.provisionalScore,
    ),
    stats: {
      candidates: input.candidates.length,
      afterStage1,
      afterStage2,
      pagesRead: reading.length,
      alive: aliveAfterRead,
      judged: judging.filter((t) => t.judgement).length,
      relevant: relevant.length,
      contactsSearched: searching.length,
      withContact: scored.length,
      shortlist: results.filter((r) => r.status === "liste_courte").length,
      reserve: results.filter((r) => r.status === "reserve").length,
      llmCalls,
      llmFailures,
      costUsd: Math.round(costUsd * 1e6) / 1e6,
      stop,
      byReason,
      authority: authorityImpact(input.candidates),
    },
  };
}
