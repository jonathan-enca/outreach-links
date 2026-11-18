import type { PageFetcher } from "@/features/sites/verify";
import type { LlmClient } from "@/lib/llm/client";
import { findCataloguePage, type CataloguePage } from "./catalogue";
import { DRAFT_LIMITS } from "./limits";
import { lintMessage, maxSimilarity } from "./lint";
import { movedAway, readableHtml } from "./readable";
import { shortlistCatalogue, type CatalogueEntry } from "./shortlist";
import type {
  DeclinedBy,
  DraftContext,
  DraftItem,
  DraftResult,
  LintIssue,
  TargetPage,
} from "./types";
import { triageTarget, writeMessage } from "./write";

export interface DraftDeps {
  /** Petit modèle : premier tri des cibles. */
  triage: LlmClient;
  /** Modèle fort : rejuge et rédige. */
  writer: LlmClient;
  fetch: PageFetcher;
  /** Lit le HTML d'une page de cible (robots.txt respecté) ; null si illisible. */
  readPage: (url: string) => Promise<{ status: number; text: string } | null>;
  /** Catalogue COMPLET du site à promouvoir (adresse, titre, titre principal, description). */
  catalogue: readonly CatalogueEntry[];
  /**
   * Texte des pages candidates (lues en entier par le rédacteur) : celles déjà lues, les autres lues au
   * besoin. Absent : le texte est pris dans le catalogue quand il y figure.
   */
  loadPages?: (urls: readonly string[]) => Promise<CataloguePage[]>;
  scope: { workspaceId: string; auditId: string };
  /** Corps des messages déjà écrits dans ce lot (détection des doublons). */
  previousBodies: readonly string[];
}

export type DraftOutcome =
  | { result: DraftResult }
  /** Aucune raison honnête de demander un lien : décision gardée, la cible n'est pas rejouée. */
  | { declined: { reason: string; by: DeclinedBy; costUsd: number } }
  /** Empêchement passager (page illisible, panne) : la cible sera reprise à la prochaine rédaction. */
  | { skipped: string; costUsd: number };

/** L'URL proposée répond-elle 200 MAINTENANT ? (redirections suivies par le fetcher sûr). */
export async function checkProposedUrl(url: string, fetch: PageFetcher): Promise<number | null> {
  try {
    const r = await fetch(url);
    return r ? r.status : null;
  } catch {
    return null;
  }
}

/** Relit la page de la cible en entier ; null si elle ne répond plus ou n'a pas de texte. */
export async function readTargetPage(
  url: string,
  readPage: DraftDeps["readPage"],
): Promise<TargetPage | { unreadable: string }> {
  let res: { status: number; text: string } | null = null;
  try {
    res = await readPage(url);
  } catch {
    res = null;
  }
  if (!res) return { unreadable: "La page de la cible n'a pas pu être relue." };
  if (res.status !== 200) return { unreadable: `La page de la cible répond ${res.status}.` };
  const page = readableHtml(res.text, url, DRAFT_LIMITS.targetPageChars);
  if (page.text.length < 200)
    return { unreadable: "La page de la cible n'a pas de texte lisible." };
  return {
    url,
    title: page.title,
    description: page.description,
    text: page.text,
    moved: movedAway(url, page.canonicalUrl),
  };
}

const errorText = (e: unknown) => (e instanceof Error ? e.message.slice(0, 120) : "erreur");

/**
 * Rédige UN message, ou décide de ne pas l'écrire :
 * 1. relit toute la page de la cible ;
 * 2. tri par le petit modèle (angle ou non, pages candidates du catalogue) ;
 * 3. le modèle fort rejuge, choisit la page précise et écrit ;
 * 4. page proposée vérifiée en 200, linter, contrôle des doublons, une régénération au plus.
 * Ne lève jamais pour une panne LLM : la cible est alors laissée pour la prochaine rédaction.
 */
export async function draftItem(
  item: DraftItem,
  ctx: DraftContext,
  deps: DraftDeps,
): Promise<DraftOutcome> {
  let cost = 0;
  const page = await readTargetPage(item.pageUrl, deps.readPage);
  if ("unreadable" in page) return { skipped: page.unreadable, costUsd: 0 };
  if (deps.catalogue.length === 0) {
    return { skipped: "Les pages du site à promouvoir n'ont pas pu être lues.", costUsd: 0 };
  }

  // Le modèle ne voit que les pages les plus proches de la cible, choisies gratuitement par mots communs.
  const shortlist = shortlistCatalogue(
    { url: page.url, title: page.title, description: page.description, text: page.text },
    deps.catalogue,
    DRAFT_LIMITS.shortlistPages,
  );
  let triagePassage: string | null = null;
  let chosenUrls: string[];
  if (item.force) {
    // « Rédiger quand même » : pas de tri, les pages les plus proches vont droit au rédacteur.
    chosenUrls = shortlist.slice(0, DRAFT_LIMITS.candidatePages).map((p) => p.url);
  } else {
    let triage;
    try {
      triage = await triageTarget(deps.triage, item, ctx, page, shortlist, deps.scope);
    } catch (e) {
      return { skipped: `Tri impossible : ${errorText(e)}.`, costUsd: cost };
    }
    cost += triage.costUsd;
    if (triage.verdict === "pas_d_angle") {
      return { declined: { reason: triage.motif, by: "tri", costUsd: cost } };
    }
    triagePassage = triage.passage;
    chosenUrls = triage.pages
      .map((u) => findCataloguePage(shortlist, u) ?? findCataloguePage(deps.catalogue, u))
      .filter((p): p is CatalogueEntry => p !== null)
      .map((p) => p.url);
    // « Le catalogue n'a pas la page » n'est jamais un motif de refus : à défaut, la plus proche.
    if (chosenUrls.length === 0) chosenUrls = shortlist.map((p) => p.url);
  }
  chosenUrls = [...new Set(chosenUrls)].slice(0, DRAFT_LIMITS.candidatePages);
  let candidates: CataloguePage[];
  try {
    candidates = deps.loadPages
      ? await deps.loadPages(chosenUrls)
      : chosenUrls.flatMap((u) => {
          const p = findCataloguePage(deps.catalogue as readonly CataloguePage[], u);
          return p && typeof p.text === "string" ? [p] : [];
        });
  } catch (e) {
    return { skipped: `Pages du site illisibles : ${errorText(e)}.`, costUsd: cost };
  }
  if (candidates.length === 0) {
    return { skipped: "Les pages candidates du site n'ont pas pu être lues.", costUsd: cost };
  }

  const allowedUrls = [page.url, ...(item.brief?.linkUrl ? [item.brief.linkUrl] : [])];
  let best: {
    subject: string | null;
    body: string;
    reason: string;
    note: string | null;
    hook: string;
    proposedUrl: string;
    issues: LintIssue[];
  } | null = null;
  let feedback: { issues: string[]; avoid: string[] } = { issues: [], avoid: [] };
  for (let attempt = 0; attempt <= DRAFT_LIMITS.maxRetries; attempt++) {
    let w;
    try {
      w = await writeMessage(deps.writer, item, ctx, page, candidates, feedback, deps.scope);
    } catch (e) {
      if (best) break;
      return { skipped: `Rédaction impossible : ${errorText(e)}.`, costUsd: cost };
    }
    cost += w.costUsd;
    if (w.verdict === "pas_d_angle") {
      return { declined: { reason: w.angle, by: "redacteur", costUsd: cost } };
    }
    const chosen = w.page_proposee ? findCataloguePage(candidates, w.page_proposee) : null;
    const body = (w.message ?? "").trim();
    if (!chosen || !body) {
      feedback = {
        issues: [
          "La page proposée doit être une des pages candidates, et le message est obligatoire.",
        ],
        avoid: feedback.avoid,
      };
      continue;
    }
    const subject = item.channel === "email" ? (w.objet?.trim() ?? null) : null;
    const issues = lintMessage({
      channel: item.channel,
      subject,
      body,
      proposedUrl: chosen.url,
      targetPageUrl: page.url,
      allowedUrls,
      signatureFirstName: ctx.signatureFirstName,
    });
    const sim = maxSimilarity(body, deps.previousBodies);
    if (sim > DRAFT_LIMITS.maxSimilarity) {
      issues.push({
        code: "doublon",
        message: `Formulation trop proche d'un autre message du lot (${Math.round(sim * 100)} %).`,
      });
    }
    best = {
      subject,
      body,
      reason: w.angle,
      note: w.a_relire?.trim() || null,
      hook: w.passage?.trim() || triagePassage?.trim() || page.title,
      proposedUrl: chosen.url,
      issues,
    };
    if (issues.length === 0) break;
    feedback = {
      issues: issues.map((i) => i.message),
      avoid: deps.previousBodies
        .slice(-3)
        .map((b) => b.split("\n").find((l) => l.length > 20) ?? b),
    };
  }
  if (!best) return { skipped: "Aucun message exploitable produit.", costUsd: cost };

  // La page proposée doit répondre 200 maintenant : jamais un lien mort dans une demande de lien.
  const urlStatus = await checkProposedUrl(best.proposedUrl, deps.fetch);
  if (urlStatus !== 200) {
    return {
      skipped:
        urlStatus === null
          ? "La page à promouvoir ne répond pas : aucun message écrit."
          : `La page à promouvoir répond ${urlStatus} : aucun message écrit.`,
      costUsd: cost,
    };
  }
  return {
    result: {
      itemId: item.id,
      channel: item.channel,
      subject: best.subject,
      body: best.body,
      hook: best.hook.slice(0, 600),
      targetingReason: best.reason,
      proposedUrl: best.proposedUrl,
      targetPageUrl: page.url,
      urlStatus,
      issues: best.issues,
      ready: best.issues.length === 0,
      reviewNote: best.note,
      costUsd: cost,
    },
  };
}
