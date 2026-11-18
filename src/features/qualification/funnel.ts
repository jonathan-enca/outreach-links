import { logger } from "@/lib/logger";
import type { ContactItem, ContactResult } from "@/features/contacts/types";
import type { PageRead } from "@/features/triage/page-reader";
import { mapByHost } from "@/lib/concurrency";
import { BudgetExceededError } from "@/lib/dataforseo";
import type { BatchOutcome, BatchRequest, LlmBatchClient } from "@/lib/llm/batch";
import { LlmBudgetExceededError, type LlmClient } from "@/lib/llm/client";
import { BATCH_DISCOUNT } from "@/lib/llm/pricing";
import {
  authorityImpact,
  nameCarriesTheme,
  runFreeStages,
  type AuthorityImpact,
  type FreeVerdict,
} from "./free";
import { batchWorstUsd, QUALIFY_LIMITS } from "./limits";
import { batchSchema, judgeBatch, judgementRequest, toJudgements, type BatchItem } from "./llm";
import { isHomeUrl, pageVerdict, rescueFromHome, type PageVerdict } from "./page";
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
export type RobotsCheck = "ok" | "interdit" | "inconnu" | "muet";

export interface QualDeps {
  /** `robotsOk` : le robots.txt a déjà été vérifié pour cette page ET l'accueil (il n'est pas relu). */
  readPage: (c: QualCandidate, opts?: { robotsOk?: boolean }) => Promise<PageRead>;
  /** Vérification légère du robots.txt (une requête par site), absente = vérifiée à la lecture. */
  checkRobots?: (c: QualCandidate) => Promise<RobotsCheck>;
  /** Client LLM plafonné à `remainingUsd` ; null sans clé (les cibles restent « non qualifiées »). */
  llm: (remainingUsd: number) => LlmClient | null;
  /**
   * Client de l'API par lots (jugement à demi-tarif, réponse en différé) ; absent ou null = appels
   * directs. Utilisé seulement si l'appelant fournit aussi `hooks.wait` (lecture automatique de la réserve).
   */
  batch?: () => LlmBatchClient | null;
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

/** Ce qu'une ressource comparable a donné (MC.6b) : du candidat à la cible, et la décision prise. */
export interface ResourceYield {
  /** Pages qui citent la ressource, trouvées par la collecte. */
  candidates: number;
  /** Écartées avant lecture parce que leur adresse est celle d'une page légale. */
  legalByUrl: number;
  /** Pages réellement lues (la page a répondu). */
  read: number;
  /** Pages lues qui ont reçu un verdict (écartées à la lecture ou jugées). */
  verdicts: number;
  /** Cibles : pages qui montrent une des trois situations. */
  relevant: number;
  /** Pages juridiques, fermes à liens et vendeurs de liens parmi les pages lues. */
  bad: number;
  shortlist: number;
  status: "poursuivie" | "abandonnee";
  /** Pourquoi la ressource est abandonnée, en clair. */
  reason?: string;
  /** Pages non lues parce que la ressource est abandonnée. */
  skipped: number;
}

/** Préfixe de la file de lecture d'une ressource comparable : « citation:<domaine> ». */
export const RESOURCE_LANE = "citation:";

/**
 * Faut-il abandonner une ressource comparable ? (pur, MC.6b). Trois cas, dans l'ordre :
 * - citée surtout dans des pages légales ou des fermes à liens, et aucune cible dès 6 pages lues ;
 * - aucune cible après les 8 pages du sondage ;
 * - rendement sous 5 % après 24 pages lues.
 * Tant que le sondage n'est pas fini, on ne décide rien. Les seuils sont les mêmes pour tous les sites.
 */
export function resourceVerdict(
  y: Pick<ResourceYield, "verdicts" | "relevant" | "bad">,
  R: typeof QUALIFY_LIMITS.resource = QUALIFY_LIMITS.resource,
): string | null {
  if (y.relevant === 0 && y.verdicts >= R.earlyPages && y.bad >= y.verdicts * R.badShare) {
    return `citée surtout dans des pages légales ou des fermes à liens (${y.bad} sur ${y.verdicts} pages lues)`;
  }
  if (y.relevant === 0 && y.verdicts >= R.probePages) {
    return `aucune cible sur ${y.verdicts} pages lues`;
  }
  if (y.verdicts >= R.reviewPages && y.relevant < y.verdicts * R.minYield) {
    return `${y.relevant} cible${y.relevant > 1 ? "s" : ""} seulement sur ${y.verdicts} pages lues`;
  }
  return null;
}

/** Abandon AVANT toute lecture : la ressource est citée en majorité par des pages légales (vu à l'adresse). */
export function resourceLegalByUrl(
  y: Pick<ResourceYield, "candidates" | "legalByUrl">,
  R: typeof QUALIFY_LIMITS.resource = QUALIFY_LIMITS.resource,
): string | null {
  if (y.candidates >= R.probePages && y.legalByUrl >= y.candidates * R.badShare) {
    return `citée surtout dans des pages légales (${y.legalByUrl} sur ${y.candidates} pages trouvées)`;
  }
  return null;
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
    batchPollMs?: number;
    batchMaxWaitMs?: number;
  };
  /** Rendement déjà mesuré par source (lecture d'un lot supplémentaire du stock). */
  priorYield?: Record<string, { read: number; relevant: number }>;
  /** Rendement et décisions déjà pris par ressource comparable (lot supplémentaire du stock). */
  priorResources?: Record<string, ResourceYield>;
  /** Mesure seulement : `false` lit toutes les ressources sans jamais en abandonner (défaut : piloté). */
  pilotResources?: boolean;
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
  /** Attente SANS requête bloquante (`step.sleep` d'Inngest), nécessaire au jugement par lots. */
  wait?: (id: string, ms: number) => Promise<void>;
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
  /** MC.6b : rendement et décision par ressource comparable (pages qui la citent). */
  byResource?: Record<string, ResourceYield>;
  /** Jugement direct ou par l'API par lots, et ce que le lot a mesuré (délai réel, repli en appels directs). */
  judgeMode?: "direct" | "lots";
  batch?: { requests: number; waitMs: number; fallbacks: number; canceled: boolean };
  /**
   * Chantier D (pertes gratuites) : accueils lus avant d'écarter un « éditeur introuvable » et
   * sauvés, sites au robots.txt muet et au nom de domaine du thème passés en fin de file.
   */
  lostFree?: { homeTried: number; homeRescued: number; robotsSilent: number; nameTail: number };
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
  /** Le robots.txt n'a pas répondu à temps : lu en dernier (jamais écarté pour cela). */
  robotsSilent: boolean;
  /** Le nom de domaine porte un mot du thème : concurrent probable, lu en dernier (jamais écarté pour cela). */
  nameTail: boolean;
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
  // MC.6b : une file par ressource comparable, pour mesurer et piloter chacune.
  if (distinct[0] === "citation") {
    const resource = c.sources.find((s) => s.persona)?.persona;
    return resource ? `${RESOURCE_LANE}${resource}` : "citation";
  }
  return distinct[0] ?? "inconnue";
}

/** Ressources comparables citées par la page d'un candidat (source « citation »). */
export function resourcesOf(c: Pick<QualCandidate, "sources">): string[] {
  return [
    ...new Set(c.sources.flatMap((s) => (s.source === "citation" && s.persona ? [s.persona] : []))),
  ];
}

/**
 * Répartition d'un lot de lecture entre les files (pur, déterministe). Chaque file qui a encore des
 * candidats reçoit un minimum (exploration) ; le reste va aux files dans la proportion de leur
 * rendement MESURÉ (pages pertinentes par page lue, lissé pour ne pas condamner une file sur un
 * mauvais départ). C'est ce qui déplace la lecture vers ce qui rapporte, quel que soit le site.
 * `floor` peut dépendre de la file (MC.6b : une ressource en cours de sondage reçoit davantage).
 */
export function allocateLot(
  size: number,
  remaining: ReadonlyMap<string, number>,
  yields: ReadonlyMap<string, { read: number; relevant: number }>,
  floor: number | ((lane: string) => number) = QUALIFY_LIMITS.sourceFloor,
): Map<string, number> {
  const floorOf = typeof floor === "function" ? floor : () => floor;
  // Les files au plus grand minimum d'abord : un sondage en cours n'est jamais privé de sa part.
  const lanes = [...remaining.entries()]
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => floorOf(b) - floorOf(a) || a.localeCompare(b));
  const out = new Map<string, number>(lanes.map(([k]) => [k, 0]));
  let left = size;
  for (const [k, n] of lanes) {
    const take = Math.min(n, floorOf(k), left);
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
  // Fin de file (chantier D.3 et D.4) : robots.txt muet, nom de domaine portant un mot du thème.
  // Ces sites restent lus tant que la file n'est pas vide, mais après tous les autres.
  const isTail = (t: Track) => t.robotsSilent || t.nameTail;
  const head = tracks.filter((t) => !isTail(t));
  const tail = tracks.filter(isTail);
  if (tail.length > 0 && head.length > 0) {
    return [...orderLane(lane, head), ...orderLane(lane, tail)];
  }
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
 * pages jugées atteint, durée maximale, budget de jugement (MC.6f : plus d'arrêt par rendement décroissant). Les candidats non
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
    robotsSilent: false,
    nameTail: nameCarriesTheme(free.candidate.domain, input.ctx.theme),
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

  // MC.6b. Pilotage par ressource comparable : ce que chaque ressource a donné, et la décision prise.
  const R = L.resource;
  const pilot = input.pilotResources !== false;
  const resources = new Map<string, ResourceYield>();
  for (const [k, v] of Object.entries(input.priorResources ?? {})) {
    resources.set(k, { ...v, shortlist: 0 });
    // Le rendement déjà mesuré de la ressource vaut aussi pour sa file de lecture.
    yields.set(`${RESOURCE_LANE}${k}`, { read: v.read, relevant: v.relevant });
  }
  const known = new Set(resources.keys());
  for (const t of tracks) {
    for (const r of resourcesOf(t.free.candidate)) {
      let y = resources.get(r);
      if (!y) {
        y = {
          candidates: 0,
          legalByUrl: 0,
          read: 0,
          verdicts: 0,
          relevant: 0,
          bad: 0,
          shortlist: 0,
          status: "poursuivie",
          skipped: 0,
        };
        resources.set(r, y);
      }
      // Un lot supplémentaire ne relit que le stock : les compteurs de la collecte sont déjà faits.
      if (known.has(r)) continue;
      y.candidates++;
      if (t.reason === "page_legale") y.legalByUrl++;
    }
  }
  const BAD_PAGES: ReadonlySet<ExclusionReason> = new Set([
    "page_legale",
    "ferme_a_liens",
    "vend_des_liens",
  ]);
  /** Une page de la ressource a un verdict : lue et écartée, ou jugée. */
  const noteVerdict = (t: Track, kept: boolean) => {
    for (const r of resourcesOf(t.free.candidate)) {
      const y = resources.get(r)!;
      y.verdicts++;
      if (kept) y.relevant++;
      else if (t.reason && BAD_PAGES.has(t.reason)) y.bad++;
    }
  };
  /** Abandonne une ressource : ses pages pas encore lues ne le seront pas (motif lisible sur chacune). */
  const abandon = (resource: string, why: string) => {
    const y = resources.get(resource)!;
    y.status = "abandonnee";
    y.reason = why;
    const lane = `${RESOURCE_LANE}${resource}`;
    for (const t of tracks) {
      if (t.lane !== lane || t.reason !== null || t.read) continue;
      Object.assign(t, {
        stage: 3,
        reason: "ressource_abandonnee",
        detail: `pages qui citent ${resource} : ${why}`.slice(0, 280),
      });
      y.skipped++;
    }
  };
  /** Décision par ressource, sur ce qui est mesuré à cet instant (jamais avant la fin du sondage). */
  const reviewResources = (): boolean => {
    if (!pilot) return false;
    let changed = false;
    for (const [resource, y] of resources) {
      if (y.status === "abandonnee") continue;
      const why = resourceVerdict(y, R);
      if (!why) continue;
      abandon(resource, why);
      changed = true;
    }
    return changed;
  };
  if (pilot) {
    for (const [resource, y] of resources) {
      // Décision déjà prise lors d'une lecture précédente, ou ressource citée surtout par des pages légales.
      const why = y.status === "abandonnee" ? (y.reason ?? "abandonnée") : resourceLegalByUrl(y, R);
      if (why) abandon(resource, why);
    }
    reviewResources();
  }
  /** Part minimale d'une file dans un lot : une ressource en cours de sondage est lue plus vite. */
  const floorOf = (lane: string): number => {
    if (!lane.startsWith(RESOURCE_LANE)) return L.sourceFloor;
    const y = resources.get(lane.slice(RESOURCE_LANE.length));
    if (!y || y.read >= R.probePages) return L.sourceFloor;
    return Math.max(L.sourceFloor, Math.min(R.probeFloor, R.probePages - y.read));
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
        else if (c === "muet") t.robotsSilent = true;
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
  let lots = 0;
  let homeTried = 0;
  let homeRescued = 0;
  type GroupOutcome = {
    failed: boolean;
    blocked: boolean;
    costUsd: number;
    judgements: [string, LlmJudgement][];
    error?: string;
  };
  /** Range le résultat d'un groupe de cibles jugées (même règles pour l'appel direct et les lots). Renvoie le nombre de cibles pertinentes. */
  const applyOutcome = (batch: Track[], r: GroupOutcome): number => {
    let relevantHere = 0;
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
      return 0;
    }
    llmCalls++;
    if (r.failed) {
      llmFailures++;
      llmLastError ??= r.error ?? "client LLM absent";
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
      const ex = judgementExclusion(j, L.minFit, t.free.candidate);
      if (ex) Object.assign(t, { reason: ex.reason, detail: ex.detail });
      else {
        judgeKept++;
        relevantHere++;
        yieldOf(t.lane).relevant++;
      }
      noteVerdict(t, !ex);
    });
    return relevantHere;
  };
  const batchClient: LlmBatchClient | null = hooks.wait ? (deps().batch?.() ?? null) : null;
  const pending: Track[] = [];
  let batchStats: FunnelStats["batch"];

  const plannedTotal = () =>
    Math.min(L.maxPagesRead, pagesRead + [...queues.values()].reduce((n, q) => n + q.length, 0));

  /** Pendant son sondage, une ressource ne reçoit pas plus de pages qu'il n'en faut pour décider. */
  const probeLeft = (lane: string): number => {
    if (!pilot || !lane.startsWith(RESOURCE_LANE)) return Infinity;
    const y = resources.get(lane.slice(RESOURCE_LANE.length));
    return y && y.read < R.probePages ? R.probePages - y.read : Infinity;
  };

  for (;;) {
    const remaining = new Map(
      [...queues.entries()].map(([k, q]) => [k, Math.min(q.length, probeLeft(k))]),
    );
    const left = [...remaining.values()].reduce((a, b) => a + b, 0);
    if (left === 0) {
      readStop = "epuise";
      break;
    }
    if ((batchClient ? aliveAfterRead : judgedCount) >= Math.min(L.targetJudged, L.maxLlmTargets)) {
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
    lots++;
    const size = Math.min(L.pagesPerStep, L.maxPagesRead - pagesRead);
    const plan = allocateLot(size, remaining, yields, floorOf);
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
        async (t) => {
          const c = t.free.candidate;
          const first = pageVerdict(await d.readPage(c, { robotsOk: t.robotsOk }), c, input.ctx);
          // D.2 : « éditeur introuvable » sur une page intérieure : on lit l'accueil avant d'écarter.
          if (
            first.reason !== "editeur_introuvable" ||
            !first.page ||
            isHomeUrl(first.page.url) ||
            !L.homeRescue
          ) {
            return { ...first, homeTried: false, homeRescued: false };
          }
          const home = await d.readPage({ ...c, url: null }, { robotsOk: t.robotsOk });
          const r = rescueFromHome(first, home, c, input.ctx);
          return { ...r.verdict, homeTried: true, homeRescued: r.rescued };
        },
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
      for (const r of resourcesOf(t.free.candidate)) resources.get(r)!.read++;
      // Écartée à la lecture (morte, parquée, vend des liens...) : c'est déjà un verdict pour sa ressource.
      if (v.reason !== null) noteVerdict(t, false);
    });
    homeTried += read.out.filter((v) => v.homeTried).length;
    homeRescued += read.out.filter((v) => v.homeRescued).length;
    pagesRead += lot.length;
    const toJudge = lot.filter((t) => t.reason === null);
    aliveAfterRead += toJudge.length;

    if (batchClient) {
      // Mode lots : les pages lues attendent la fin de la lecture, puis un seul envoi à l'API par lots.
      pending.push(...toJudge);
      continue;
    }
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
            return (
              Boolean(j) && judgementExclusion(j!, L.minFit, batch[i]!.free.candidate) === null
            );
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
          applyOutcome(batch, res.batches[b]!);
        });
      }
    }
    // MC.6b : après le jugement du lot, les ressources qui ne donnent rien sont abandonnées.
    if (reviewResources()) queues = buildQueues();
  }
  // 4 bis. Jugement par l'API par lots (arrière-plan seulement) : un seul envoi pour toutes les pages
  // lues, attente SANS requête bloquante (`hooks.wait`), même prompt, mêmes règles de tri.
  if (batchClient && pending.length > 0) {
    const room = Math.max(0, L.maxLlmTargets - judgedCount);
    for (const t of pending.slice(room)) {
      Object.assign(t, {
        stage: 4,
        reason: "hors_budget_llm",
        detail: "au-delà des cibles jugées",
      });
    }
    const groups = chunks(pending.slice(0, room), L.batchSize);
    const worstOf = (n: number) => batchWorstUsd(n, input.model) * BATCH_DISCOUNT;
    let planned = 0;
    let plannedUsd = 0;
    for (const g of groups) {
      if (costUsd + plannedUsd + worstOf(g.length) > input.budgetUsd + 1e-9) break;
      plannedUsd += worstOf(g.length);
      planned++;
    }
    for (const g of groups.slice(planned)) {
      stop = "budget";
      for (const t of g) {
        Object.assign(t, {
          stage: 4,
          reason: "hors_budget_llm",
          detail: "budget de qualification atteint",
        });
      }
    }
    const doing = groups.slice(0, planned);
    const itemsOf = (batch: Track[]): BatchItem[] =>
      batch.map((t, i) => ({ id: `c${i + 1}`, candidate: t.free.candidate, page: t.page! }));
    const requests: BatchRequest[] = doing.map((g, k) => ({
      customId: `g${k}`,
      ...judgementRequest(itemsOf(g), input.ctx),
    }));
    if (doing.length > 0) {
      const sent = await runStep("judge-submit", async () => {
        const d = deps();
        try {
          await d.guard(plannedUsd);
        } catch (e) {
          if (e instanceof BudgetExceededError) return { blocked: true, id: "", at: clock(d) };
          throw e;
        }
        const { id } = await batchClient.submit(requests);
        return { blocked: false, id, at: clock(d) };
      });
      lastAt = sent.at;
      let groupOutcomes: GroupOutcome[] | null = null;
      if (sent.blocked) {
        stop = "plafond";
        groupOutcomes = doing.map(() => ({
          failed: false,
          blocked: true,
          costUsd: 0,
          judgements: [],
        }));
      } else {
        // Attente par pas : `step.sleep`, puis une lecture d'état. Au-delà du délai maximal, le lot est
        // annulé et ce qui n'a pas de réponse est rejugé en appels directs (jamais de cible perdue).
        let canceled = false;
        let ended = false;
        let doneAt = sent.at;
        for (let k = 1; !ended; k++) {
          await hooks.wait!(`judge-wait-${k}`, L.batchPollMs);
          const st = await runStep(`judge-poll-${k}`, async () => {
            const d = deps();
            const status = await batchClient.status(sent.id);
            const at = clock(d);
            const late = at - sent.at >= L.batchMaxWaitMs;
            if (status.state !== "termine" && late && !canceled) {
              await batchClient.cancel(sent.id).catch(() => undefined);
            }
            return { ended: status.state === "termine", late, at };
          });
          doneAt = st.at;
          if (st.late && !canceled) canceled = true;
          // Après l'annulation, quelques lectures encore pour récupérer ce qui est déjà fait ; au-delà, repli direct.
          ended = st.ended || (canceled && st.at - sent.at >= L.batchMaxWaitMs + 3 * L.batchPollMs);
        }
        const collected = await runStep("judge-collect", async () => {
          const d = deps();
          let outcomes = new Map<string, BatchOutcome>();
          try {
            outcomes = await batchClient.results(sent.id, requests, {
              workspaceId: input.workspaceId,
              auditId: input.auditId,
              task: "qualification",
            });
          } catch (e) {
            logger.warn("qualification : résultats du lot illisibles", {
              error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
            });
          }
          const out: GroupOutcome[] = [];
          let fallbacks = 0;
          let spent = 0;
          // MC.6g : cette étape tourne dans une requête de 300 s au plus (Vercel) ; au-delà, les appels
          // directs de repli ne sont plus lancés : la cible reste « non qualifiée » donc en stock, relue
          // et rejugée par la lecture de fond (jamais un 504 qui arrête toute la chaîne).
          const collectStart = Date.now();
          for (const [k, g] of doing.entries()) {
            const items = itemsOf(g);
            const o = outcomes.get(`g${k}`);
            if (o?.ok) {
              const data = batchSchema.safeParse(o.data);
              if (data.success) {
                spent += o.costUsd;
                out.push({
                  failed: false,
                  blocked: false,
                  costUsd: o.costUsd,
                  judgements: [...toJudgements(items, data.data, input.ctx)],
                });
                continue;
              }
            }
            // Pas de réponse exploitable : un appel direct (prix plein) dans ce qui reste du budget.
            if (Date.now() - collectStart > 150_000) {
              out.push({ failed: true, blocked: false, costUsd: 0, judgements: [] });
              continue;
            }
            fallbacks++;
            const left = input.budgetUsd - costUsd - spent;
            const llm = left > 0 ? d.llm(left) : null;
            if (!llm) {
              out.push({ failed: true, blocked: false, costUsd: 0, judgements: [] });
              continue;
            }
            try {
              const r = await judgeBatch(llm, items, input.ctx, {
                workspaceId: input.workspaceId,
                auditId: input.auditId,
              });
              spent += r.costUsd;
              out.push({
                failed: false,
                blocked: false,
                costUsd: r.costUsd,
                judgements: [...r.judgements],
              });
            } catch (e) {
              if (e instanceof LlmBudgetExceededError) {
                out.push({ failed: false, blocked: true, costUsd: llm.spentUsd, judgements: [] });
                continue;
              }
              const error = e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
              logger.warn("qualification : lot non jugé (repli direct)", { error });
              out.push({
                failed: true,
                blocked: false,
                costUsd: llm.spentUsd,
                judgements: [],
                error,
              });
            }
          }
          return { out, fallbacks, at: clock(d) };
        });
        lastAt = collected.at;
        groupOutcomes = collected.out;
        batchStats = {
          requests: doing.length,
          waitMs: Math.max(0, doneAt - sent.at),
          fallbacks: collected.fallbacks,
          canceled,
        };
      }
      doing.forEach((g, k) => {
        applyOutcome(g, groupOutcomes![k]!);
      });
      // Jugement en différé : la décision par ressource se prend une fois les verdicts connus.
      if (reviewResources()) queues = buildQueues();
      await emit({
        phase: "jugement",
        done: judgedCount,
        total: Math.max(L.targetJudged, judgedCount),
        found: judgeKept,
        example: null,
      });
    }
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
    if (t.judgement && judgementExclusion(t.judgement, L.minFit, t.free.candidate) === null)
      row.relevant++;
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
    if (listed.has(t.free.candidate.domain)) {
      for (const r of resourcesOf(t.free.candidate)) resources.get(r)!.shortlist++;
    }
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
      ...(batchClient ? { judgeMode: "lots" as const } : {}),
      ...(batchStats ? { batch: batchStats } : {}),
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
      ...(resources.size > 0 ? { byResource: Object.fromEntries(resources) } : {}),
      lostFree: {
        homeTried,
        homeRescued,
        robotsSilent: tracks.filter((t) => t.robotsSilent).length,
        nameTail: tracks.filter((t) => t.nameTail && !t.preRead).length,
      },
    },
  };
}
