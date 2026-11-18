import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { fileCache } from "@/features/collection/demo-input";
import { mergeCandidates } from "@/features/collection/normalize";
import { buildCollectionPlan, estimateCollection } from "@/features/collection/plan";
import { describeCandidates } from "@/features/collection/resource-judge";
import { executeCollection, type CollectionRun } from "@/features/collection/run";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import {
  listSiteUrls,
  pickCatalogueUrls,
  readCataloguePages,
  type CataloguePage,
} from "@/features/drafting/catalogue";
import { readTargetPage } from "@/features/drafting/draft";
import { DRAFT_LIMITS } from "@/features/drafting/limits";
import type { DraftContext, DraftItem } from "@/features/drafting/types";
import { buildTriagePrompt, TRIAGE_SYSTEM, WRITER_SYSTEM } from "@/features/drafting/write";
import { createSafeFetcher } from "@/features/sites/verify";
import { createPageReader, type PageRead } from "@/features/triage/page-reader";
import { createDataForSeoClient } from "@/lib/dataforseo";
import { createLlmClient, DEFAULT_MODELS, type LlmClient } from "@/lib/llm/client";
import { costUsd } from "@/lib/llm/pricing";
import { realQualDeps } from "./deps";
import { executeQualification, resourcesOf } from "./funnel";
import { qualificationBudgetUsd } from "./limits";
import type { QualCandidate, QualContext } from "./types";

/**
 * Mesure RÉELLE de MC.6b sur un site (ignorée sauf MC6B_LIVE=1) : la vraie collecte réduite de MC.6a
 * (14 recherches Google puis les pages qui citent des ressources comparables, ~0,25 USD de DataForSEO, en
 * cache sur fichier), puis la VRAIE qualification sur ces pages : lecture pilotée par ressource, jugement
 * des trois cas, recherche de contact. Aucune écriture en base, aucun envoi.
 *
 * Hors production, le petit modèle est celui du fournisseur de développement ; son coût est recalculé au
 * prix du modèle de production (`MC6B_PRICE_MODEL`, défaut `claude-haiku-4-5`) sur les jetons réels, pour
 * que le budget de qualification joue comme en production.
 *
 * Sorties : un rapport (`MC6B_OUT`) et, si `MC6B_CASES` est donné, un dossier de cas pour rejuger la liste
 * courte avec les consignes exactes du rédacteur (tri puis modèle fort) et un échantillon des pages écartées.
 *
 *   MC6B_LIVE=1 MC6B_INPUT=entree.json MC6B_OUT=rapport.json MC6B_CACHE=dfs.json MC6B_PAGES=pages.json \
 *   MC6B_CASES=cas/ NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true \
 *   pnpm vitest run src/features/qualification/citations-funnel.live.test.ts
 * `MC6B_PILOT=0` : même mesure sans pilotage (toutes les ressources lues), pour comparer.
 */
const live = process.env.MC6B_LIVE === "1";
const AUDIT = "11111111-1111-4111-8111-111111111111";
const WORKSPACE = "22222222-2222-4222-8222-222222222222";

interface Input {
  site: { domain: string; niche: string; language: string; country: string };
  competitors: { domain: string; ref: number | null; sample: string | null }[];
  /** Concurrents non retenus par l'audit (proposés au choix des ressources comparables). */
  others?: string[];
  profile: { name: string; activity: string; offer: string; audience: string[]; pages: string[] };
  resources: { url: string; title: string }[];
  queries: { q: string; tactic: "inconnus" | "ressources"; persona: string; rank: number }[];
}

/** Cache sur fichier (lectures de pages, réponses du modèle) : une mesure rejouée ne relit rien. */
function jsonStore<T>(file: string | undefined) {
  const map: Record<string, T> =
    file && existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, T>) : {};
  let dirty = 0;
  return {
    get: (k: string): T | undefined => map[k],
    set: (k: string, v: T) => {
      map[k] = v;
      if (file && ++dirty % 20 === 0) writeFileSync(file, JSON.stringify(map));
    },
    flush: () => {
      if (file) writeFileSync(file, JSON.stringify(map));
    },
  };
}

describe.skipIf(!live)(
  "mesure réelle MC.6b : pilotage par ressource et jugement des trois cas",
  () => {
    it("collecte, lit, juge et écrit le rapport", async () => {
      const input = JSON.parse(readFileSync(process.env.MC6B_INPUT ?? "", "utf8")) as Input;
      const pilot = process.env.MC6B_PILOT !== "0";
      const priceModel = process.env.MC6B_PRICE_MODEL ?? DEFAULT_MODELS.anthropic;
      const ledger = fakeSupabase({ cost_ledger: [] });

      // 1. Collecte réduite (identique à la mesure MC.6a) : recherches Google puis citations.
      const dfs = createDataForSeoClient({
        costClient: ledger.client,
        cache: fileCache(process.env.MC6B_CACHE),
        auth: "proxy",
        budgetUsd: 1,
        maxCostPerCallUsd: 0.1,
      });
      const competitorDomains = input.competitors.map((c) => c.domain);
      const plan = buildCollectionPlan({
        queries: input.queries.map((x, i) => ({
          ...x,
          target: "home" as const,
          keyword: null,
          score: 1 - i / 100,
          estUsd: 0.006,
          origin: "regle" as const,
        })),
        competitorDomains,
        competitors: input.competitors.map((c) => ({
          domain: c.domain,
          referringDomains: c.ref,
          sampleUrl: c.sample,
        })),
        otherCompetitors: (input.others ?? []).map((domain) => ({
          domain,
          referringDomains: null,
          sampleUrl: null,
        })),
        language: input.site.language,
        theme: input.site.niche,
        nameVariants: [],
        domain: input.site.domain,
        goal: "autorite_generale",
        targetKeywords: [],
      });
      const reduced = {
        ...plan,
        intersectionTargets: [],
        deadPages: [],
        mentionSerp: [],
        mentionKeywords: [],
        content: [],
        serp: plan.serp.slice(0, 14),
      };
      const estimate = estimateCollection(reduced);
      const smallLlm = (budgetUsd: number, model?: string) =>
        createLlmClient({
          costClient: ledger.client as never,
          provider: "openai",
          auth: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : "proxy",
          ...((model ?? process.env.LLM_MODEL) ? { model: model ?? process.env.LLM_MODEL } : {}),
          budgetUsd,
          maxCostPerCallUsd: 0.05,
        });
      const run: CollectionRun = {
        id: "mesure",
        auditId: AUDIT,
        workspaceId: WORKSPACE,
        siteId: "33333333-3333-4333-8333-333333333333",
        ctx: {
          ownDomain: input.site.domain,
          competitorDomains,
          language: input.site.language,
          country: input.site.country,
          theme: input.site.niche,
          nameVariants: [],
          targetKeywords: [],
          site: {
            domain: input.site.domain,
            theme: input.site.niche,
            activity: input.profile.activity,
            offer: input.profile.offer,
            audience: input.profile.audience,
            pages: input.profile.pages,
          },
        },
        plan: reduced,
        limits: { auditId: AUDIT, auditCapUsd: 1, safetyCapUsd: 5, dailyCapUsd: 25 },
        targetUsd: estimate.targetUsd,
      };
      const progress = await executeCollection(
        () => ({
          dfs: dfs as never,
          service: ledger.client,
          llm: smallLlm(0.1),
          describe: describeCandidates,
        }),
        run,
        (_id, fn) => fn(),
      );
      const candidates: QualCandidate[] = mergeCandidates(progress.raws)
        .filter((c) => c.sources.some((s) => s.source === "citation"))
        .map((c) => ({ ...c }));

      // 2. Qualification réelle sur les pages qui citent (lecture pilotée, trois cas, contact).
      const ctx: QualContext = {
        ownDomain: input.site.domain,
        competitorDomains,
        language: input.site.language,
        theme: input.site.niche,
        brandName: input.profile.name,
        activity: input.profile.activity,
        audience: input.profile.audience,
        resources: input.resources,
        contactedElsewhere: [],
        suppressedDomains: [],
        suppressedEmails: [],
      };
      const pages = jsonStore<PageRead>(process.env.MC6B_PAGES);
      const answers = jsonStore<{ data: unknown; inputTokens: number; outputTokens: number }>(
        process.env.MC6B_PAGES ? `${process.env.MC6B_PAGES}.llm.json` : undefined,
      );
      const tokens = { input: 0, output: 0, calls: 0 };
      const budgetUsd = qualificationBudgetUsd();
      /** Petit modèle de développement, facturé au prix du modèle de production sur les jetons réels. */
      const priced = (remainingUsd: number): LlmClient | null => {
        if (remainingUsd <= 0) return null;
        const inner = smallLlm(5, process.env.MC6C_JUDGE_MODEL);
        let spent = 0;
        const client = {
          get spentUsd() {
            return spent;
          },
          generate: async (o: Parameters<LlmClient["generate"]>[0]) => {
            const key = createHash("sha1").update(`${o.system}\n${o.prompt}`).digest("hex");
            const hit = answers.get(key);
            const out = hit ?? (await inner.generate(o));
            if (!hit) {
              answers.set(key, {
                data: out.data,
                inputTokens: out.inputTokens,
                outputTokens: out.outputTokens,
              });
            }
            const cost = costUsd(priceModel, out.inputTokens, out.outputTokens);
            spent += cost;
            tokens.input += out.inputTokens;
            tokens.output += out.outputTokens;
            tokens.calls++;
            return { ...out, data: out.data, costUsd: cost, model: priceModel, provider: "openai" };
          },
        };
        return client as unknown as LlmClient;
      };
      const base = realQualDeps(ctx, { llm: priced, guard: async () => {} });
      const deps = () => ({
        ...base,
        readPage: async (c: QualCandidate, o?: { robotsOk?: boolean }) => {
          const key = c.url ?? `https://${c.domain}/`;
          const hit = pages.get(key);
          if (hit) return hit;
          const read = await base.readPage(c, o);
          pages.set(key, read);
          return read;
        },
      });
      const started = Date.now();
      const { results, stats } = await executeQualification(
        deps,
        {
          workspaceId: null,
          auditId: AUDIT,
          ctx,
          candidates,
          budgetUsd,
          model: priceModel,
          pilotResources: pilot,
        },
        (_id, fn) => fn(),
      );
      pages.flush();
      answers.flush();

      const view = (r: (typeof results)[number]) => ({
        domain: r.domain,
        url: r.url,
        title: r.page?.title,
        status: r.status,
        reason: r.exclusionReason,
        situation: r.judgement?.situation,
        siteType: r.judgement?.siteType,
        fit: r.judgement?.fit,
        why: r.judgement?.fitReason,
        cites: r.page?.cites
          ? { sites: r.page.cites.sites, resource: r.page.cites.resource }
          : null,
        contact: r.contact?.status,
        score: r.score,
        resources: resourcesOf(candidates.find((c) => c.domain === r.domain) ?? { sources: [] }),
      });
      const shortlist = results.filter((r) => r.status === "liste_courte");
      const relevant = results.filter((r) => r.judgement && r.stageReached >= 5);
      const judgedOut = results.filter(
        (r) => r.judgement && r.stageReached === 4 && r.status === "exclu",
      );
      const report = {
        site: input.site.domain,
        pilot,
        priceModel,
        collection: {
          announcedUsd: estimate.expectedUsd,
          costUsd: progress.costUsd,
          resources: progress.stats.citations.resources,
          resourcesBy: progress.stats.citations.resourcesBy,
          citingPages: candidates.length,
        },
        qualification: {
          ...stats,
          minutes: Math.round((Date.now() - started) / 600) / 100,
          tokens,
          // Part de cibles (petit modèle) parmi les pages lues, la référence de MC.0b.
          targetsPerRead: stats.pagesRead ? relevant.length / stats.pagesRead : 0,
        },
        shortlist: shortlist.map(view),
        // Cibles retenues par le jugement mais sans contact trouvé.
        noContact: relevant.filter((r) => r.exclusionReason === "sans_contact").map(view),
        judgedOut: judgedOut.map(view),
      };
      console.log(
        JSON.stringify(
          {
            site: report.site,
            pilot,
            collecteUsd: progress.costUsd,
            pagesLues: stats.pagesRead,
            jugees: stats.judged,
            cibles: relevant.length,
            listeCourte: shortlist.length,
            coutJugementUsd: stats.costUsd,
            arret: stats.readStop,
            parRessource: stats.byResource,
            motifs: stats.byReason,
          },
          null,
          2,
        ),
      );
      if (process.env.MC6B_OUT)
        writeFileSync(process.env.MC6B_OUT, JSON.stringify(report, null, 2));

      // 3. Dossier de cas : la liste courte et un échantillon des pages écartées, avec les consignes exactes
      // du tri et du rédacteur, pour un rejugement par les modèles de production (hors de ce test).
      const dir = process.env.MC6B_CASES;
      if (dir) {
        mkdirSync(dir, { recursive: true });
        const fetch = createSafeFetcher({
          userAgent: BOT_USER_AGENT,
          maxBytes: 600 * 1024,
          accept: "text/html,application/xhtml+xml,*/*;q=0.5",
        });
        const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
        const readerDeps = { fetch, sleep, now: () => Date.now() };
        const catalogueFile = join(dir, "catalogue.json");
        let catalogue: CataloguePage[];
        if (existsSync(catalogueFile)) {
          catalogue = JSON.parse(readFileSync(catalogueFile, "utf8")) as CataloguePage[];
        } else {
          const known = await listSiteUrls(input.site.domain, readerDeps);
          const urls = pickCatalogueUrls(
            input.site.domain,
            known,
            input.site.language,
            DRAFT_LIMITS.cataloguePages,
          );
          catalogue = await readCataloguePages(
            [`https://${input.site.domain}/`, ...urls],
            readerDeps,
          );
          writeFileSync(catalogueFile, JSON.stringify(catalogue, null, 1));
        }
        writeFileSync(join(dir, "consigne-tri.txt"), TRIAGE_SYSTEM);
        writeFileSync(join(dir, "consigne-redacteur.txt"), WRITER_SYSTEM);
        const dctx: DraftContext = {
          siteDomain: input.site.domain,
          niche: input.site.niche,
          siteSummary: input.profile.activity,
          language: input.site.language,
          offeredAsset: null,
          signatureFirstName: "Jonathan",
        };
        const sampleOut = Number(process.env.MC6B_SAMPLE_OUT ?? 12);
        const picked = [
          ...shortlist.map((r) => ({ r, group: "liste_courte" })),
          ...report.noContact
            .map((v) => results.find((r) => r.domain === v.domain)!)
            .map((r) => ({ r, group: "sans_contact" })),
          // Échantillon régulier des pages jugées « pas une cible » : mesure de ce que le petit modèle perd.
          ...judgedOut
            .filter(
              (_, i) =>
                i % Math.max(1, Math.floor(judgedOut.length / Math.max(1, sampleOut))) === 0,
            )
            .slice(0, sampleOut)
            .map((r) => ({ r, group: "ecartee" })),
        ];
        const index: { id: string; group: string; domain: string; url: string | null }[] = [];
        let n = 0;
        for (const { r, group } of picked) {
          if (!r.url) continue;
          const id = String(++n).padStart(3, "0");
          const reader = createPageReader({ ...readerDeps, maxRequests: 4, hostDelayMs: 300 });
          const page = await readTargetPage(r.url, (u) => reader.fetchText(u));
          if ("unreadable" in page) {
            index.push({ id, group: `${group}:illisible`, domain: r.domain, url: r.url });
            continue;
          }
          const item: DraftItem = {
            id,
            domain: r.domain,
            type: "page_ressources",
            expectedLinkType: "editorial",
            offer: null,
            rationale: "",
            targetPageUrl: `https://${input.site.domain}/`,
            anchorText: "",
            brokenUrl: null,
            channel: r.contact?.status === "formulaire" ? "formulaire" : "email",
            pageUrl: r.url,
            pageTitle: r.page?.title ?? null,
            hook: "",
            brief: null,
          };
          writeFileSync(join(dir, `cas-${id}.txt`), buildTriagePrompt(item, dctx, page, catalogue));
          index.push({ id, group, domain: r.domain, url: r.url });
        }
        writeFileSync(join(dir, "index.json"), JSON.stringify(index, null, 1));
      }
      expect(stats.costUsd).toBeLessThanOrEqual(budgetUsd + 1e-9);
    }, 3_600_000);
  },
);
