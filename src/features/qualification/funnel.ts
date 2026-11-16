import { logger } from "@/lib/logger";
import type { ContactItem, ContactResult } from "@/features/contacts/types";
import type { PageRead } from "@/features/triage/page-reader";
import { mapByHost } from "@/lib/concurrency";
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

/** Résultat de la vérification légère du robots.txt, avant toute lecture. */
export type RobotsCheck = "ok" | "interdit" | "inconnu";

export interface QualDeps {
  /** `robotsOk` : le robots.txt a déjà été vérifié pour cette page ET l'accueil (il n'est pas relu). */
  readPage: (c: QualCandidate, opts?: { robotsOk?: boolean }) => Promise<PageRead>;
  /** Vérification légère du robots.txt (une requête par site), absente = vérifiée à la lecture. */
  checkRobots?: (c: QualCandidate) => Promise<RobotsCheck>;
  /** Client LLM plafonné à `remainingUsd` ; null sans clé (les cibles restent « non qualifiées »). */
  llm: (remainingUsd: number) => LlmClient | null;
  /** Plafonds durs (audit, sécurité, jour) contrôlés AVANT chaque appel payant ; lève si dépassé. */
  guard: (estimateUsd: number) => Promise<void>;
  investigate: (item: ContactItem) => Promise<ContactResult>;
  /** Attente entre deux sites d'un même hôte (défaut : minuterie réelle). */
  sleep?: (ms: number) => Promise<void>;
  /** Horloge (défaut : `Date.now`), lue DANS les steps pour que le rejeu reste déterministe. */
  now?: () => number;
}

/** Rendement d'une source ou d'un type d'éditeur : du candidat à la cible. */
export interface YieldRow {
  candidates: number;
  read: number;
  alive: number;
  judged: number;
  relevant: number;
  shortlist: number;
}

export interface QualInput {
  workspaceId: string | null;
  auditId: string | null;
  ctx: QualContext;
  candidates: QualCandidate[];
  budgetUsd: number;
  model: string;
  /** Réglages de volume ou de seuil pour une expérience mesurée (défaut : `QUALIFY_LIMITS`). */
  tuning?: {
    maxPagesRead?: number;
    maxLlmTargets?: number;
    maxContactTargets?: number;
    minFit?: number;
    targetJudged?: number;
    maxReadMs?: number;
    pagesPerStep?: number;
    shortlistSize?: number;
    preflightMax?: number;
  };
  /** Rendement déjà mesuré par source (lecture d'un lot supplémentaire du stock). */
  priorYield?: Record<string, { read: number; relevant: number }>;
}

export type QualStop = "termine" | "budget" | "plafond";

/** Pourquoi la lecture s'est arrêtée. */
export type ReadStop = "epuise" | "objectif" | "duree" | "budget" | "rendement" | "plafond_pages";

/** Avancement d'une phase de l'entonnoir, émis DANS le step qui vient de travailler (MU.1). */
export interface QualProgressEvent {
  phase: "lecture" | "jugement" | "contact";
  done: number;
  total: number;
  /** Lecture : pages retenues ; jugement : cibles pertinentes ; contact : cibles avec un contact. */
  found: number;
  /** Dernier site retenu dans ce step, s'il y en a un. */
  example: string | null;
}

export interface QualHooks {
  /** Ne doit pas lever ; appelé une fois par step réellement exécuté (jamais au rejeu d'un step mémorisé). */
  onProgress?: (e: QualProgressEvent) => Promise<void>;
}

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
  /** Premier message d'erreur d'un lot non jugé (diagnostic). */
  llmLastError?: string;
  costUsd: number;
  stop: QualStop;
  byReason: Partial<Record<ExclusionReason, number>>;
  authority: AuthorityImpact;
  /** Chantier G. Écartés AVANT lecture, par motif (langue visible, robots.txt, concurrents, doublons...). */
  preRead?: Partial<Record<ExclusionReason, number>>;
  /** Candidats encore à lire après le filtre avant lecture. */
  afterPreRead?: number;
  /** Lots de lecture exécutés, raison de l'arrêt, durée de la lecture et du jugement (ms). */
  lots?: number;
  readStop?: ReadStop;
  readMs?: number;
  /** Candidats jamais lus, gardés en stock pour une lecture ultérieure. */
  stock?: number;
  /** Rendement par source de la recherche et par type d'éditeur cherché (candidats → cibles). */
  bySource?: Record<string, YieldRow>;
  byPersona?: Record<string, YieldRow>;
}

interface Track {
  free: FreeVerdict;
  stage: Stage;
  reason: ExclusionReason | null;
  detail: string | null;
  page: PageVerdict["page"];
  judgement: LlmJudgement | null;
  contact: ContactOutcome | null;
  /** File de lecture du candidat (source de la recherche). */
  lane: string;
  preRead: boolean;
  robotsOk: boolean;
  read: boolean;
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
 * File de lecture d'un candidat : sa source ; « plusieurs » quand au moins deux sources différentes
 * l'ont trouvé (signal fort, lu en priorité tant que le rendement le confirme).
 */
export function laneOf(c: Pick<QualCandidate, "sources">): string {
  const distinct = [...new Set(c.sources.map((s) => s.source))];
  if (distinct.length >= 2) return "plusieurs";
  return distinct[0] ?? "inconnue";
}

/**
 * Répartition d'un lot de lecture entre les files (pur, déterministe). Chaque file qui a encore des
 * candidats reçoit un minimum (exploration) ; le reste va aux files dans la proportion de leur
 * rendement MESURÉ (pages pertinentes par page lue, lissé pour ne pas condamner une file sur un
 * mauvais départ). C'est ce qui déplace la lecture vers ce qui rapporte, quel que soit le site.
 */
export function allocateLot(
  size: number,
  remaining: ReadonlyMap<string, number>,
  yields: ReadonlyMap<string, { read: number; relevant: number }>,
  floor: number = QUALIFY_LIMITS.sourceFloor,
): Map<string, number> {
  const lanes = [...remaining.entries()]
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const out = new Map<string, number>(lanes.map(([k]) => [k, 0]));
  let left = size;
  for (const [k, n] of lanes) {
    const take = Math.min(n, floor, left);
    out.set(k, take);
    left -= take;
  }
  const weight = (k: string) => {
    const y = yields.get(k) ?? { read: 0, relevant: 0 };
    return (y.relevant + 1) / (y.read + 3);
  };
  // Parts proportionnelles au rendement, bornées par ce qui reste dans chaque file.
  for (let guard = 0; left > 0 && guard < 8; guard++) {
    const open = lanes.filter(([k, n]) => out.get(k)! < n);
    if (open.length === 0) break;
    const total = open.reduce((s, [k]) => s + weight(k), 0);
    const before = left;
    for (const [k, n] of open) {
      const share = Math.min(n - out.get(k)!, Math.floor((before * weight(k)) / total), left);
      out.set(k, out.get(k)! + share);
      left -= share;
    }
    if (left === before) {
      // Restes d'arrondi : aux files les plus rentables d'abord.
      for (const [k, n] of [...open].sort(
        ([a], [b]) => weight(b) - weight(a) || a.localeCompare(b),
      )) {
        if (left === 0) break;
        if (out.get(k)! < n) {
          out.set(k, out.get(k)! + 1);
          left--;
        }
      }
    }
  }
  return out;
}

/** Ordre d'une file : meilleur score provisoire d'abord ; pour la recherche Google, un type d'éditeur après l'autre. */
function orderLane(lane: string, tracks: Track[]): Track[] {
  const byScore = (a: Track, b: Track) =>
    b.free.provisionalScore - a.free.provisionalScore ||
    a.free.candidate.domain.localeCompare(b.free.candidate.domain);
  const sorted = [...tracks].sort(byScore);
  if (lane !== "serp") return sorted;
  // Tour de rôle entre les types d'éditeurs cherchés : chacun voit ses meilleurs résultats lus.
  const groups = new Map<string, Track[]>();
  for (const t of sorted) {
    const persona = t.free.candidate.sources.find((s) => s.source === "serp")?.persona ?? "";
    const g = groups.get(persona);
    if (g) g.push(t);
    else groups.set(persona, [t]);
  }
  const lists = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, g]) => g);
  const out: Track[] = [];
  for (let i = 0; out.length < sorted.length; i++) {
    for (const g of lists) if (g[i]) out.push(g[i]!);
  }
  return out;
}

const emptyYield = (): YieldRow => ({
  candidates: 0,
  read: 0,
  alive: 0,
  judged: 0,
  relevant: 0,
  shortlist: 0,
});

/**
 * Entonnoir complet (MT.4, lecture adaptative du chantier G), du moins cher au plus cher. Gratuit :
 * étages 1-2 (calcul, filtre avant lecture, robots.txt), 3 (lecture), 5 (contact, sans finder payant).
 * Payant : étage 4 seulement. La lecture se fait PAR LOTS : chaque lot est lu puis jugé, et le
 * rendement mesuré décide de la composition du lot suivant. Arrêts : candidats épuisés, objectif de
 * pages jugées atteint, durée maximale, budget de jugement, rendement décroissant. Les candidats non
 * lus restent en stock (« en réserve ») avec leur score.
 */
export async function executeQualification(
  deps: () => QualDeps,
  input: QualInput,
  runStep: StepRunner,
  hooks: QualHooks = {},
): Promise<{ results: QualResult[]; stats: FunnelStats }> {
  const L = { ...QUALIFY_LIMITS, ...input.tuning };
  const emit = async (e: QualProgressEvent) => {
    if (hooks.onProgress) await hooks.onProgress(e);
  };
  const lastOk = <T>(xs: readonly T[], ok: (x: T) => boolean, name: (i: number) => string) => {
    for (let i = xs.length - 1; i >= 0; i--) if (ok(xs[i]!)) return name(i);
    return null;
  };
  const clock = (d: QualDeps) => (d.now ?? Date.now)();
  const tracks: Track[] = runFreeStages(input.candidates, input.ctx).map((free) => ({
    free,
    stage: free.stage,
    reason: free.reason,
    detail: free.detail,
    page: null,
    judgement: null,
    contact: null,
    lane: laneOf(free.candidate),
    preRead: free.reason !== null,
    robotsOk: false,
    read: false,
  }));
  const alive = () => tracks.filter((t) => t.reason === null);
  const afterStage1 = tracks.filter((t) => t.stage === 2).length;
  const afterStage2 = alive().length;

  // Files de lecture, une par source.
  const buildQueues = () => {
    const by = new Map<string, Track[]>();
    for (const t of tracks) {
      if (t.reason !== null || t.read) continue;
      const q = by.get(t.lane);
      if (q) q.push(t);
      else by.set(t.lane, [t]);
    }
    return new Map([...by.entries()].map(([k, v]) => [k, orderLane(k, v)]));
  };
  const yields = new Map<string, { read: number; relevant: number }>(
    Object.entries(input.priorYield ?? {}).map(([k, v]) => [k, { ...v }]),
  );
  const yieldOf = (lane: string) => {
    let y = yields.get(lane);
    if (!y) yields.set(lane, (y = { read: 0, relevant: 0 }));
    return y;
  };

  // 2 bis. Robots.txt AVANT lecture (gratuit, léger, en parallèle) sur la tête de chaque file.
  let queues = buildQueues();
  const startedAt = (await runStep("start", async () => ({ at: clock(deps()) }))).at;
  let lastAt = startedAt;
  if (L.preflightMax > 0) {
    const perLane = Math.ceil(L.preflightMax / Math.max(1, queues.size));
    const heads = [...queues.values()].flatMap((q) => q.slice(0, perLane)).slice(0, L.preflightMax);
    for (const [k, chunk] of chunks(heads, L.preflightPerStep).entries()) {
      const res = await runStep(`preflight-${k + 1}`, async () => {
        const d = deps();
        if (!d.checkRobots)
          return { checks: chunk.map((): RobotsCheck => "inconnu"), at: clock(d) };
        const checks = await mapByHost(
          chunk,
          (t) => t.free.candidate.domain,
          (t) => d.checkRobots!(t.free.candidate).catch((): RobotsCheck => "inconnu"),
          { concurrency: L.preflightConcurrency, sleep: d.sleep },
        );
        return { checks, at: clock(d) };
      });
      lastAt = res.at;
      chunk.forEach((t, i) => {
        const c = res.checks[i];
        if (c === "ok") t.robotsOk = true;
        else if (c === "interdit") {
          Object.assign(t, {
            stage: 2,
            reason: "robots",
            detail: "le robots.txt interdit la lecture",
            preRead: true,
          });
        }
      });
    }
    queues = buildQueues();
  }
  const afterPreRead = alive().length;

  // 3 et 4. Lecture puis jugement, lot après lot.
  let costUsd = 0;
  let stop: QualStop = "termine";
  let readStop: ReadStop = "epuise";
  let llmCalls = 0;
  let llmFailures = 0;
  let llmLastError: string | undefined;
  let pagesRead = 0;
  let aliveAfterRead = 0;
  let judgedCount = 0;
  let judgeKept = 0;
  let dry = 0;
  let lots = 0;
  const plannedTotal = () =>
    Math.min(L.maxPagesRead, pagesRead + [...queues.values()].reduce((n, q) => n + q.length, 0));

  for (;;) {
    const remaining = new Map([...queues.entries()].map(([k, q]) => [k, q.length]));
    const left = [...remaining.values()].reduce((a, b) => a + b, 0);
    if (left === 0) {
      readStop = "epuise";
      break;
    }
    if (judgedCount >= Math.min(L.targetJudged, L.maxLlmTargets)) {
      readStop = "objectif";
      break;
    }
    if (pagesRead >= L.maxPagesRead) {
      readStop = "plafond_pages";
      break;
    }
    if (stop !== "termine") {
      readStop = "budget";
      break;
    }
    if (lastAt - startedAt >= L.maxReadMs) {
      readStop = "duree";
      break;
    }
    if (lots >= L.minLots && dry >= L.dryLots) {
      readStop = "rendement";
      break;
    }
    lots++;
    const size = Math.min(L.pagesPerStep, L.maxPagesRead - pagesRead);
    const plan = allocateLot(size, remaining, yields, L.sourceFloor);
    const lot: Track[] = [];
    for (const [lane, n] of plan) lot.push(...queues.get(lane)!.splice(0, n));

    const doneBefore = pagesRead;
    const keptBefore = aliveAfterRead;
    const total = plannedTotal();
    const read = await runStep(`read-${lots}`, async () => {
      const d = deps();
      // MU.1 : sites différents lus de front ; un même hôte reste en série, avec son délai.
      const out = await mapByHost(
        lot,
        (t) => t.free.candidate.domain,
        async (t) =>
          pageVerdict(
            await d.readPage(t.free.candidate, { robotsOk: t.robotsOk }),
            t.free.candidate,
            input.ctx,
          ),
        { concurrency: L.readConcurrency, sameHostDelayMs: L.hostDelayMs, sleep: d.sleep },
      );
      await emit({
        phase: "lecture",
        done: doneBefore + lot.length,
        total: Math.max(total, doneBefore + lot.length),
        found: keptBefore + out.filter((v) => v.reason === null).length,
        example: lastOk(
          out,
          (v) => v.reason === null,
          (i) => lot[i]!.free.candidate.domain,
        ),
      });
      return { out, at: clock(d) };
    });
    lastAt = read.at;
    lot.forEach((t, i) => {
      const v = read.out[i]!;
      Object.assign(t, { stage: 3, page: v.page, reason: v.reason, detail: v.detail, read: true });
      yieldOf(t.lane).read++;
    });
    pagesRead += lot.length;
    const toJudge = lot.filter((t) => t.reason === null);
    aliveAfterRead += toJudge.length;

    // Jugement du lot : appels de 5 cibles, lancés de front, sous le budget de qualification.
    const room = Math.max(0, L.maxLlmTargets - judgedCount);
    for (const t of toJudge.slice(room)) {
      Object.assign(t, {
        stage: 4,
        reason: "hors_budget_llm",
        detail: "au-delà des cibles jugées",
      });
    }
    const batches = chunks(toJudge.slice(0, room), L.batchSize);
    let planned = 0;
    let plannedUsd = 0;
    for (const b of batches) {
      const worst = batchWorstUsd(b.length, input.model);
      if (costUsd + plannedUsd + worst > input.budgetUsd + 1e-9) break;
      plannedUsd += worst;
      planned++;
    }
    for (const b of batches.slice(planned)) {
      stop = "budget";
      for (const t of b) {
        Object.assign(t, {
          stage: 4,
          reason: "hors_budget_llm",
          detail: "budget de qualification atteint",
        });
      }
    }
    const doing = batches.slice(0, planned);
    let lotRelevant = 0;
    if (doing.length > 0) {
      const judgedBefore = judgedCount;
      const keptBeforeJudge = judgeKept;
      const spentBefore = costUsd;
      const res = await runStep(`judge-${lots}`, async () => {
        const d = deps();
        try {
          await d.guard(plannedUsd);
        } catch (e) {
          if (e instanceof BudgetExceededError) return { blocked: true, batches: [], at: clock(d) };
          throw e;
        }
        const one = async (batch: Track[]) => {
          const items: BatchItem[] = batch.map((t, i) => ({
            id: `c${i + 1}`,
            candidate: t.free.candidate,
            page: t.page!,
          }));
          const llm = d.llm(input.budgetUsd - spentBefore);
          if (!llm) return { failed: true, blocked: false, costUsd: 0, judgements: [] };
          try {
            const out = await judgeBatch(llm, items, input.ctx, {
              workspaceId: input.workspaceId,
              auditId: input.auditId,
            });
            return {
              failed: false,
              blocked: false,
              costUsd: out.costUsd,
              judgements: [...out.judgements],
            };
          } catch (e) {
            if (e instanceof LlmBudgetExceededError) {
              return { failed: false, blocked: true, costUsd: llm.spentUsd, judgements: [] };
            }
            // Réponse illisible ou panne : le lot reste non qualifié (coût éventuel compté), on continue.
            // Jamais muet (essai du 17/11 : 11 lots sur 11 en échec sans aucune trace).
            const error = e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
            logger.warn("qualification : lot non jugé", { error });
            return { failed: true, blocked: false, costUsd: llm.spentUsd, judgements: [], error };
          }
        };
        const out: Awaited<ReturnType<typeof one>>[] = [];
        for (const group of chunks(doing, L.judgeConcurrency)) {
          out.push(...(await Promise.all(group.map(one))));
        }
        const flat = doing.flat();
        const keptFlags = doing.flatMap((batch, b) =>
          batch.map((_, i) => {
            const j = new Map(out[b]!.judgements).get(`c${i + 1}`);
            return Boolean(j) && judgementExclusion(j!, L.minFit) === null;
          }),
        );
        await emit({
          phase: "jugement",
          done: judgedBefore + flat.length,
          total: Math.max(L.targetJudged, judgedBefore + flat.length),
          found: keptBeforeJudge + keptFlags.filter(Boolean).length,
          example: lastOk(
            keptFlags,
            (x) => x,
            (i) => flat[i]!.free.candidate.domain,
          ),
        });
        return { blocked: false, batches: out, at: clock(d) };
      });
      lastAt = res.at;
      if (res.blocked) {
        stop = "plafond";
        for (const t of doing.flat()) {
          Object.assign(t, {
            stage: 4,
            reason: "hors_budget_llm",
            detail: "plafond de sécurité atteint",
          });
        }
      } else {
        doing.forEach((batch, b) => {
          const r = res.batches[b]!;
          costUsd += r.costUsd;
          if (r.blocked) {
            stop = "plafond";
            for (const t of batch) {
              Object.assign(t, {
                stage: 4,
                reason: "hors_budget_llm",
                detail: "plafond de sécurité atteint",
              });
            }
            return;
          }
          llmCalls++;
          if (r.failed) {
            llmFailures++;
            llmLastError ??= (r as { error?: string }).error ?? "client LLM absent";
          }
          const got = new Map(r.judgements);
          batch.forEach((t, i) => {
            const j = got.get(`c${i + 1}`) ?? null;
            t.stage = 4;
            t.judgement = j;
            if (!j) {
              t.reason = "non_qualifie";
              t.detail = "pas de jugement du modèle";
              return;
            }
            judgedCount++;
            const ex = judgementExclusion(j, L.minFit);
            if (ex) Object.assign(t, { reason: ex.reason, detail: ex.detail });
            else {
              judgeKept++;
              lotRelevant++;
              yieldOf(t.lane).relevant++;
            }
          });
        });
      }
    }
    dry = lotRelevant <= L.dryLotMaxRelevant ? dry + 1 : 0;
  }
  // Le stock : ce qui n'a pas été lu reste en réserve, avec son score, pour une lecture ultérieure.
  let stock = 0;
  for (const q of queues.values()) {
    for (const t of q) {
      stock++;
      Object.assign(t, {
        stage: 3,
        reason: "hors_budget_lecture",
        detail: "en stock : pas encore lu",
      });
    }
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
  const hasContact = (c: ContactOutcome) =>
    ["email_verifie", "email_a_verifier", "formulaire"].includes(c.status);
  let contactDone = 0;
  let contactKept = 0;
  for (const [k, chunk] of chunks(searching, L.contactsPerStep).entries()) {
    const doneBefore = contactDone;
    const keptBefore = contactKept;
    const found = await runStep(`contact-${k + 1}`, async () => {
      const d = deps();
      const out = await mapByHost(
        chunk,
        (t) => t.free.candidate.domain,
        async (t) =>
          toContact(
            await d.investigate({
              id: t.free.candidate.domain,
              domain: t.free.candidate.domain,
              resolvedUrl: t.page!.url,
            }),
          ),
        { concurrency: L.contactConcurrency, sameHostDelayMs: L.hostDelayMs, sleep: d.sleep },
      );
      await emit({
        phase: "contact",
        done: doneBefore + chunk.length,
        total: searching.length,
        found: keptBefore + out.filter(hasContact).length,
        example: lastOk(out, hasContact, (i) => chunk[i]!.free.candidate.domain),
      });
      return out;
    });
    chunk.forEach((t, i) => {
      const c = found[i]!;
      t.stage = 5;
      t.contact = c;
      if (!hasContact(c)) {
        t.reason = "sans_contact";
        t.detail = c.reason || "aucun email ni formulaire trouvé";
      }
    });
    contactDone += chunk.length;
    contactKept += found.filter(hasContact).length;
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
  // Écartés avant lecture (étages 1 et 2 : calcul, langue visible, robots.txt), par motif.
  const preRead: NonNullable<FunnelStats["preRead"]> = {};
  for (const t of tracks) {
    if (t.reason && (t.stage === 1 || t.preRead) && !t.read) {
      preRead[t.reason] = (preRead[t.reason] ?? 0) + 1;
    }
  }
  // Rendement par source et par type d'éditeur cherché : du candidat à la cible livrée.
  const bySource: Record<string, YieldRow> = {};
  const byPersona: Record<string, YieldRow> = {};
  const listed = new Set(results.filter((r) => r.status === "liste_courte").map((r) => r.domain));
  const count = (row: YieldRow, t: Track) => {
    row.candidates++;
    if (t.read) row.read++;
    if (t.page && t.stage >= 4) row.alive++;
    if (t.judgement) row.judged++;
    if (t.judgement && judgementExclusion(t.judgement, L.minFit) === null) row.relevant++;
    if (listed.has(t.free.candidate.domain)) row.shortlist++;
  };
  for (const t of tracks) {
    for (const src of new Set(t.free.candidate.sources.map((x) => x.source))) {
      count((bySource[src] ??= emptyYield()), t);
    }
    const personas = new Set(
      t.free.candidate.sources.flatMap((x) =>
        x.source === "serp" && x.persona ? [x.persona] : [],
      ),
    );
    for (const p of personas) count((byPersona[p] ??= emptyYield()), t);
  }
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
      pagesRead,
      alive: aliveAfterRead,
      judged: judgedCount,
      relevant: relevant.length,
      contactsSearched: searching.length,
      withContact: scored.length,
      shortlist: results.filter((r) => r.status === "liste_courte").length,
      reserve: results.filter((r) => r.status === "reserve").length,
      llmCalls,
      llmFailures,
      ...(llmLastError ? { llmLastError } : {}),
      costUsd: Math.round(costUsd * 1e6) / 1e6,
      stop,
      byReason,
      authority: authorityImpact(input.candidates),
      preRead,
      afterPreRead,
      lots,
      readStop,
      readMs: Math.max(0, lastAt - startedAt),
      stock,
      bySource,
      byPersona,
    },
  };
}
