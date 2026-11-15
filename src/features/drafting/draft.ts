import type { PageFetcher } from "@/features/sites/verify";
import type { LlmClient } from "@/lib/llm/client";
import { DRAFT_LIMITS } from "./limits";
import { lintMessage, maxSimilarity } from "./lint";
import type { DraftContext, DraftItem, DraftResult, LintIssue } from "./types";
import { writeMessage } from "./write";

export interface DraftDeps {
  llm: LlmClient;
  fetch: PageFetcher;
  scope: { workspaceId: string; auditId: string };
  /** Corps des messages déjà écrits dans ce lot (détection des doublons). */
  previousBodies: readonly string[];
}

/** L'URL proposée répond-elle 200 MAINTENANT ? (redirections suivies par le fetcher sûr). */
export async function checkProposedUrl(url: string, fetch: PageFetcher): Promise<number | null> {
  try {
    const r = await fetch(url);
    return r ? r.status : null;
  } catch {
    return null;
  }
}

/**
 * Rédige UN message : URL vérifiée 200 avant d'écrire (sinon rien n'est écrit), linter,
 * contrôle des doublons du lot, une régénération au plus. Ne lève jamais pour une panne LLM :
 * le message est alors absent (le résultat est `null` avec un motif côté appelant).
 */
export async function draftItem(
  item: DraftItem,
  ctx: DraftContext,
  deps: DraftDeps,
): Promise<{ result: DraftResult } | { skipped: string }> {
  const proposedUrl = item.targetPageUrl;
  const urlStatus = await checkProposedUrl(proposedUrl, deps.fetch);
  if (urlStatus !== 200) {
    return {
      skipped:
        urlStatus === null
          ? "La page à promouvoir ne répond pas : aucun message écrit."
          : `La page à promouvoir répond ${urlStatus} : aucun message écrit.`,
    };
  }

  let cost = 0;
  let best: { subject: string | null; body: string; reason: string; issues: LintIssue[] } | null =
    null;
  const avoid: string[] = [];
  for (let attempt = 0; attempt <= DRAFT_LIMITS.maxRetries; attempt++) {
    let w;
    try {
      w = await writeMessage(deps.llm, item, ctx, proposedUrl, avoid, deps.scope);
    } catch (e) {
      return {
        skipped: `Rédaction impossible : ${e instanceof Error ? e.message.slice(0, 120) : "erreur"}.`,
      };
    }
    cost += w.costUsd;
    const subject = item.channel === "email" ? w.subject : null;
    const body = w.body.trim();
    const issues = lintMessage({
      channel: item.channel,
      subject,
      body,
      proposedUrl,
      hook: item.hook,
      signatureFirstName: ctx.signatureFirstName,
    });
    const sim = maxSimilarity(body, deps.previousBodies);
    if (sim > DRAFT_LIMITS.maxSimilarity) {
      issues.push({
        code: "doublon",
        message: `Formulation trop proche d'un autre message du lot (${Math.round(sim * 100)} %).`,
      });
    }
    best = { subject, body, reason: w.targeting_reason, issues };
    if (issues.length === 0) break;
    avoid.push(
      ...deps.previousBodies.slice(-3).map((b) => b.split("\n")[0] ?? b),
      body.split("\n")[0] ?? body,
    );
  }
  if (!best) return { skipped: "Aucun message produit." };
  return {
    result: {
      itemId: item.id,
      channel: item.channel,
      subject: best.subject,
      body: best.body,
      hook: item.hook,
      targetingReason: best.reason,
      proposedUrl,
      urlStatus,
      issues: best.issues,
      ready: best.issues.length === 0,
      costUsd: cost,
    },
  };
}
