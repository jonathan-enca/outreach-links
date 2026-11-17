import { z } from "zod";
import { inngest } from "@/inngest/client";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import {
  listSiteUrls,
  pickCatalogueUrls,
  readCataloguePages,
  type CataloguePage,
} from "@/features/drafting/catalogue";
import { draftItem } from "@/features/drafting/draft";
import { DRAFT_LIMITS, DRAFT_MODELS } from "@/features/drafting/limits";
import {
  beginDrafts,
  clearCatalogue,
  DRAFTS_EVENT,
  failDrafts,
  finalizeDrafts,
  loadCatalogue,
  loadDraftInput,
  loadWrittenBodies,
  saveCataloguePages,
  saveDecline,
  saveDraft,
  summarize,
} from "@/features/drafting/run";
import type { DraftResult } from "@/features/drafting/types";
import { createSafeFetcher } from "@/features/sites/verify";
import { createPageReader } from "@/features/triage/page-reader";
import { env } from "@/env";
import { createLlmClientFromEnv, pickProvider, type LlmClient } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const draftsEventSchema = z.object({
  planId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

/**
 * Les deux modèles de la rédaction, plafonnés au budget restant ; null sans clé ou budget épuisé (la
 * cible est alors laissée pour une prochaine rédaction). Hors Anthropic (développement), le modèle par
 * défaut du fournisseur sert aux deux étapes.
 */
function makeLlms(spentUsd: number): { triage: LlmClient; writer: LlmClient } | null {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
  const left = DRAFT_LIMITS.llmBudgetUsd - spentUsd;
  if (left <= 0) return null;
  const anthropic = pickProvider() === "anthropic";
  return {
    triage: createLlmClientFromEnv({
      ...(anthropic ? { model: DRAFT_MODELS.triage } : {}),
      budgetUsd: left,
      maxCostPerCallUsd: DRAFT_LIMITS.triageMaxCostPerCallUsd,
    }),
    writer: createLlmClientFromEnv({
      ...(anthropic ? { model: DRAFT_MODELS.writer } : {}),
      budgetUsd: left,
      maxCostPerCallUsd: DRAFT_LIMITS.writerMaxCostPerCallUsd,
    }),
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const pageFetcher = () =>
  createSafeFetcher({
    userAgent: BOT_USER_AGENT,
    maxBytes: 600 * 1024,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5",
  });
const readerDeps = () => ({ fetch: pageFetcher(), sleep, now: () => Date.now() });

/** Ce que fait le site, tiré de son accueil (titre et description). */
function siteSummary(catalogue: readonly CataloguePage[], domain: string): string | null {
  const home =
    catalogue.find((p) => {
      try {
        return new URL(p.url).pathname.split("/").filter(Boolean).length <= 1;
      } catch {
        return false;
      }
    }) ?? null;
  if (!home) return null;
  const text = [home.title, home.description].filter(Boolean).join(" — ");
  return text ? `${domain} : ${text}`.slice(0, 400) : null;
}

/**
 * Job `plan.drafts` (M3.3, refondu le 17/11/2026) : pour chaque cible contactable, relit sa page, cherche
 * une raison honnête de demander un lien, puis rédige (ou écarte la cible avec son motif). Le catalogue
 * des pages du site à promouvoir est lu une fois, puis gardé quelques jours. Un step par cible.
 * Aucun envoi : la validation par lot est M3.4.
 */
export const planDrafts = inngest.createFunction(
  {
    id: "plan-drafts",
    triggers: [{ event: DRAFTS_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = draftsEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failDrafts(createServiceClient(), parsed.data.planId, error.message);
    },
  },
  async ({ event, step }) => {
    const { planId } = draftsEventSchema.parse(event.data);
    const log = logger.child({ fn: "plan-drafts", planId });

    const run = await step.run("begin", async () => beginDrafts(createServiceClient(), planId));
    if (!run) {
      log.warn("rédaction non exécutable (plan introuvable ou étape non lancée)");
      return { skipped: true };
    }
    const input = await step.run("load", async () => loadDraftInput(createServiceClient(), run));
    if (!input.ctx) {
      await step.run("fail", async () =>
        failDrafts(createServiceClient(), planId, "Prénom de signature manquant."),
      );
      return { skipped: true };
    }
    const ctx = input.ctx;
    const { siteId } = input;

    // Catalogue des pages du site : relu s'il est absent ou trop vieux, par paquets (un step chacun).
    if (input.items.length > 0) {
      const toRead = await step.run("catalogue-urls", async () => {
        const service = createServiceClient();
        if (await loadCatalogue(service, siteId)) return [];
        const known = await listSiteUrls(ctx.siteDomain, readerDeps());
        const home = `https://${ctx.siteDomain}/`;
        // Les pages déjà prévues par le plan restent proposables même si le sitemap les ignore.
        const planned = [...new Set(input.items.map((i) => i.targetPageUrl))];
        const urls = [
          ...new Set([
            home,
            ...planned,
            ...pickCatalogueUrls(ctx.siteDomain, known, ctx.language, DRAFT_LIMITS.cataloguePages),
          ]),
        ].slice(0, DRAFT_LIMITS.cataloguePages + planned.length + 1);
        await clearCatalogue(service, siteId);
        return urls;
      });
      for (let i = 0; i < toRead.length; i += DRAFT_LIMITS.catalogueChunk) {
        const chunk = toRead.slice(i, i + DRAFT_LIMITS.catalogueChunk);
        await step.run(`catalogue-${i / DRAFT_LIMITS.catalogueChunk + 1}`, async () => {
          const pages = await readCataloguePages(chunk, readerDeps());
          await saveCataloguePages(createServiceClient(), siteId, run.workspaceId, pages);
          return pages.length;
        });
      }
    }

    const results: DraftResult[] = [];
    let notDrafted = 0;
    let declined = 0;
    let spent = 0;
    for (const [i, item] of input.items.entries()) {
      const spentBefore = spent;
      const out = await step.run(`target-${i + 1}`, async () => {
        const llms = makeLlms(spentBefore);
        if (!llms) return { skipped: "Rédaction indisponible (clé ou budget LLM).", costUsd: 0 };
        const service = createServiceClient();
        const catalogue = (await loadCatalogue(service, siteId)) ?? [];
        const reader = createPageReader({ ...readerDeps(), maxRequests: 4, hostDelayMs: 300 });
        const res = await draftItem(
          item,
          { ...ctx, siteSummary: siteSummary(catalogue, ctx.siteDomain) },
          {
            ...llms,
            fetch: pageFetcher(),
            readPage: (url) => reader.fetchText(url),
            catalogue,
            scope: { workspaceId: run.workspaceId, auditId: run.auditId },
            previousBodies: await loadWrittenBodies(service, planId, item.id),
          },
        );
        if ("result" in res) await saveDraft(service, run, res.result);
        else if ("declined" in res)
          await saveDecline(service, run, { itemId: item.id, ...res.declined }, item.pageUrl);
        return res;
      });
      if ("result" in out) {
        results.push(out.result);
        spent += out.result.costUsd;
      } else if ("declined" in out) {
        declined++;
        spent += out.declined.costUsd;
      } else {
        notDrafted++;
        spent += out.costUsd;
      }
    }

    const stats = summarize(results, notDrafted, input.skipped, declined);
    await step.run("finalize", async () =>
      finalizeDrafts(createServiceClient(), run, stats, spent),
    );
    log.info("rédaction terminée", { ...stats });
    return stats;
  },
);
