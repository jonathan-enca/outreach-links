import { isDead, type HuntLimits } from "@/features/deadlinks/hunt";
import type { PageRead } from "@/features/triage/page-reader";
import { BudgetExceededError } from "@/lib/dataforseo";
import { LlmBudgetExceededError, type LlmClient } from "@/lib/llm/client";
import { callWorstUsd, FINDINGS_LIMITS } from "./limits";
import { judgePage, type VerifiedJudgement } from "./llm";
import { buildFinding } from "./request";
import {
  findMentions,
  linkCandidates,
  linksToCheck,
  ownLinkState,
  pickReplacement,
  toDeadHit,
} from "./rules";
import type { Finding, FindingContext, FindingTarget, PageScan } from "./types";

/** Un appel externe = un step Inngest (reprise sans refaire ce qui est fait). */
export type StepRunner = <T>(id: string, fn: () => Promise<T>) => Promise<T>;

export interface FindDeps {
  readPage: (url: string) => Promise<PageRead>;
  /** Statut HTTP de chaque URL (null : interdit par robots.txt, injoignable ou plafond), poli et borné. */
  checkStatuses: (
    urls: string[],
    limits: Pick<HuntLimits, "maxRequests">,
  ) => Promise<{ statuses: Map<string, number | null>; requests: number }>;
  /** Client LLM plafonné à `remainingUsd` ; null sans clé. */
  llm: (remainingUsd: number) => LlmClient | null;
  /** Plafonds durs (audit, sécurité, jour) contrôlés AVANT chaque appel payant ; lève si dépassé. */
  guard: (estimateUsd: number) => Promise<void>;
}

export interface FindInput {
  workspaceId: string | null;
  auditId: string | null;
  ctx: FindingContext;
  targets: FindingTarget[];
  budgetUsd: number;
  model: string;
}

export type FindStop = "termine" | "budget" | "plafond";

export interface FindStats {
  targets: number;
  read: number;
  unreadable: number;
  requests: number;
  deadFound: number;
  mentionsSeen: number;
  mentionsAlreadyLinked: number;
  linkCandidates: number;
  llmCalls: number;
  llmFailures: number;
  unjudged: number;
  mentionFindings: number;
  unsuitedFindings: number;
  deadFindings: number;
  costUsd: number;
  stop: FindStop;
}

const chunks = <T>(xs: readonly T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

/**
 * Lecture d'une page cible et contrôles GRATUITS : liens morts (404/410 constatés), passages avec le
 * nom du site, lien déjà présent ou non, liens candidats à « inadapté ». Aucune écriture, aucun LLM.
 */
export async function scanTarget(
  deps: FindDeps,
  ctx: FindingContext,
  t: FindingTarget,
): Promise<PageScan> {
  const base: PageScan = {
    targetId: t.targetId,
    domain: t.domain,
    pageUrl: t.url,
    pageTitle: "",
    read: false,
    unreadableReason: null,
    mentions: [],
    alreadyLinked: false,
    linkCandidates: [],
    dead: [],
    requests: 0,
  };
  const read = await deps.readPage(t.url);
  if (read.blockedByRobots)
    return { ...base, unreadableReason: "le robots.txt interdit la lecture" };
  if (read.status !== 200)
    return { ...base, unreadableReason: read.status ? `HTTP ${read.status}` : "pas de réponse" };

  const toCheck = linksToCheck(read);
  const { statuses, requests } = await deps.checkStatuses(
    toCheck.map((l) => l.url),
    { maxRequests: FINDINGS_LIMITS.requestsPerTarget },
  );
  const dead = toCheck.flatMap((l) => {
    const s = statuses.get(l.url);
    return s !== null && s !== undefined && isDead(s) ? [toDeadHit(l, s, ctx.ownDomain)] : [];
  });
  const deadUrls = new Set(dead.map((d) => d.url));
  const own = ownLinkState(read, ctx.ownDomain);
  const candidates = linkCandidates(
    { outbound: read.outbound.filter((l) => !deadUrls.has(l.url)) },
    ctx,
  );
  return {
    ...base,
    pageTitle: read.title,
    read: true,
    mentions: own.linked ? [] : findMentions(read, ctx),
    alreadyLinked: own.linked,
    linkCandidates: candidates,
    dead,
    requests,
  };
}

/** Constats issus d'un balayage et d'un jugement (éventuel) : au plus un par sorte. */
export function findingsOf(
  scan: PageScan,
  t: FindingTarget,
  judgement: VerifiedJudgement | null,
  ctx: FindingContext,
): Finding[] {
  const out: Finding[] = [];
  const res = (i: number) => ctx.resources[i] ?? ctx.resources[0]!;
  // Lien mort : preuve constatée ; un lien vers une ancienne page du site d'abord.
  const dead = [...scan.dead].sort((a, b) => Number(b.toOwnSite) - Number(a.toOwnSite))[0];
  if (dead && ctx.resources.length > 0) {
    const pick = pickReplacement(dead, ctx.resources, t.resource);
    out.push(
      buildFinding(
        {
          kind: "lien_mort",
          targetId: t.targetId,
          domain: t.domain,
          pageUrl: scan.pageUrl,
          pageTitle: scan.pageTitle,
          quote: dead.context || dead.anchor || dead.url,
          linkUrl: dead.url,
          httpStatus: dead.status,
          anchor: dead.anchor || null,
          resource: res(pick.index),
          replacementHow: pick.how,
          reason: `Le lien répond HTTP ${dead.status}.`,
          toOwnSite: dead.toOwnSite,
        },
        ctx,
      ),
    );
  }
  if (judgement?.unsuited && ctx.resources.length > 0) {
    const u = judgement.unsuited;
    out.push(
      buildFinding(
        {
          kind: "lien_inadapte",
          targetId: t.targetId,
          domain: t.domain,
          pageUrl: scan.pageUrl,
          pageTitle: scan.pageTitle,
          quote: u.link.context || u.link.anchor,
          linkUrl: u.link.url,
          httpStatus: null,
          anchor: u.link.anchor,
          resource: res(u.resource),
          replacementHow: "jugement",
          reason: u.reason,
        },
        ctx,
      ),
    );
  }
  if (judgement?.mention && !scan.alreadyLinked && ctx.resources.length > 0) {
    const m = judgement.mention;
    out.push(
      buildFinding(
        {
          kind: "mention_sans_lien",
          targetId: t.targetId,
          domain: t.domain,
          pageUrl: scan.pageUrl,
          pageTitle: scan.pageTitle,
          quote: m.hit.sentence,
          linkUrl: null,
          httpStatus: null,
          anchor: m.anchor,
          matched: m.anchor,
          resource: res(0),
          replacementHow: "accueil",
          reason: "La page nomme le site sans le lier (vérifié sur tous les liens de la page).",
        },
        ctx,
      ),
    );
  }
  return out;
}

/**
 * Constats par page (MT.5), du moins cher au plus cher : lecture et contrôles gratuits de chaque
 * cible, puis UN appel LLM par cible qui a quelque chose à juger, dans l'ordre du rang, sous le budget
 * et les plafonds durs (contrôlés avant chaque appel). Un lien mort n'a besoin d'aucun LLM.
 */
export async function executeFindings(
  deps: () => FindDeps,
  input: FindInput,
  runStep: StepRunner,
): Promise<{ findings: Finding[]; stats: FindStats }> {
  const L = FINDINGS_LIMITS;
  const targets = [...input.targets].sort((a, b) => a.rank - b.rank).slice(0, L.maxTargets);
  const byId = new Map(targets.map((t) => [t.targetId, t]));

  const scans: PageScan[] = [];
  for (const [k, chunk] of chunks(targets, L.targetsPerStep).entries()) {
    const out = await runStep(`scan-${k + 1}`, async () => {
      const d = deps();
      const res: PageScan[] = [];
      for (const t of chunk) res.push(await scanTarget(d, input.ctx, t));
      return res;
    });
    scans.push(...out);
  }

  let costUsd = 0;
  let stop: FindStop = "termine";
  let llmCalls = 0;
  let llmFailures = 0;
  let unjudged = 0;
  const judgements = new Map<string, VerifiedJudgement | null>();
  const toJudge = scans.filter(
    (s) => s.read && ((s.mentions.length > 0 && !s.alreadyLinked) || s.linkCandidates.length > 0),
  );
  const worst = callWorstUsd(input.model);
  for (const [k, s] of toJudge.entries()) {
    if (stop !== "termine" || costUsd + worst > input.budgetUsd + 1e-9) {
      if (stop === "termine") stop = "budget";
      unjudged++;
      continue;
    }
    const res = await runStep(`judge-${k + 1}`, async () => {
      const d = deps();
      try {
        await d.guard(worst);
      } catch (e) {
        if (e instanceof BudgetExceededError)
          return { blocked: true, failed: false, costUsd: 0, j: null };
        throw e;
      }
      const llm = d.llm(input.budgetUsd - costUsd);
      if (!llm) return { blocked: false, failed: true, costUsd: 0, j: null };
      try {
        const out = await judgePage(
          llm,
          {
            mentions: s.alreadyLinked ? [] : s.mentions,
            links: s.linkCandidates,
            pageTitle: s.pageTitle,
            pageUrl: s.pageUrl,
          },
          input.ctx,
          { workspaceId: input.workspaceId, auditId: input.auditId },
        );
        return { blocked: false, failed: false, costUsd: out.costUsd, j: out.judgement };
      } catch (e) {
        if (e instanceof LlmBudgetExceededError)
          return { blocked: true, failed: false, costUsd: llm.spentUsd, j: null };
        return { blocked: false, failed: true, costUsd: llm.spentUsd, j: null };
      }
    });
    costUsd += res.costUsd;
    if (res.blocked) {
      stop = "plafond";
      unjudged++;
      continue;
    }
    llmCalls++;
    if (res.failed) llmFailures++;
    judgements.set(s.targetId, res.j);
  }

  const findings = scans.flatMap((s) =>
    findingsOf(s, byId.get(s.targetId)!, judgements.get(s.targetId) ?? null, input.ctx),
  );
  const count = (k: Finding["kind"]) => findings.filter((f) => f.kind === k).length;
  return {
    findings,
    stats: {
      targets: targets.length,
      read: scans.filter((s) => s.read).length,
      unreadable: scans.filter((s) => !s.read).length,
      requests: scans.reduce((n, s) => n + s.requests, 0),
      deadFound: scans.reduce((n, s) => n + s.dead.length, 0),
      mentionsSeen: scans.filter((s) => s.mentions.length > 0 || s.alreadyLinked).length,
      mentionsAlreadyLinked: scans.filter((s) => s.alreadyLinked).length,
      linkCandidates: scans.reduce((n, s) => n + s.linkCandidates.length, 0),
      llmCalls,
      llmFailures,
      unjudged,
      mentionFindings: count("mention_sans_lien"),
      unsuitedFindings: count("lien_inadapte"),
      deadFindings: count("lien_mort"),
      costUsd: Math.round(costUsd * 1e6) / 1e6,
      stop,
    },
  };
}
