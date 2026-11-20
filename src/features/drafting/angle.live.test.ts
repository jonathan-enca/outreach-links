import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createPageReader } from "@/features/triage/page-reader";
import { createLlmClient } from "@/lib/llm/client";
import { listSiteUrls, pickCatalogueUrls, readCataloguePages } from "./catalogue";
import { draftItem } from "./draft";
import { DRAFT_LIMITS } from "./limits";
import type { DraftContext, DraftItem } from "./types";

/**
 * Essai RÉEL de la rédaction avec recherche d'angle : lit le vrai catalogue d'un site et de vraies
 * pages de cibles, appelle les deux modèles, n'écrit rien en base et n'envoie rien. Sert à contrôler
 * l'enchaînement (lecture, tri, rédaction, linter), pas la qualité : hors production, les modèles sont
 * ceux du fournisseur de développement. Ignoré sauf DRAFT_LIVE_DEMO=1 :
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true DRAFT_LIVE_DEMO=1 pnpm exec vitest run \
 *     src/features/drafting/angle.live.test.ts
 * Variables : DRAFT_LIVE_SITE (domaine), DRAFT_LIVE_TARGETS (adresses séparées par des virgules),
 * DRAFT_LIVE_TRIAGE_MODEL et DRAFT_LIVE_WRITER_MODEL.
 */
const live = process.env.DRAFT_LIVE_DEMO === "1";
const SITE = process.env.DRAFT_LIVE_SITE ?? "remove-me.io";
const TARGETS = (
  process.env.DRAFT_LIVE_TARGETS ??
  [
    "https://www.apden.org/Comment-appliquer-la",
    "https://www.bge-picardie.org/notre-politique-en-matiere-de-protection-des-donnees-personnelles/",
    "https://rmb.grandlyon.com/cyber-reffexes",
  ].join(",")
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

describe.skipIf(!live)("essai réel : recherche d'angle et rédaction", () => {
  it("lit le catalogue, trie et rédige sans rien enregistrer", async () => {
    const ledger = fakeSupabase({ cost_ledger: [] });
    const fetch = createSafeFetcher({
      userAgent: BOT_USER_AGENT,
      maxBytes: 600 * 1024,
      accept: "text/html,application/xhtml+xml,*/*;q=0.5",
    });
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const readerDeps = { fetch, sleep, now: () => Date.now() };
    const llm = (model: string | undefined, maxCostPerCallUsd: number) =>
      createLlmClient({
        costClient: ledger.client,
        provider: "openai",
        auth:
          process.env.LLM_PROXY_AUTH === "true"
            ? "proxy"
            : { apiKey: process.env.OPENAI_API_KEY ?? "" },
        ...(model ? { model } : {}),
        budgetUsd: 1,
        maxCostPerCallUsd,
      });

    const known = await listSiteUrls(SITE, readerDeps);
    const urls = pickCatalogueUrls(SITE, known, "fr", Number(process.env.DRAFT_LIVE_PAGES ?? 40));
    const catalogue = await readCataloguePages([`https://${SITE}/`, ...urls], readerDeps);
    console.log(`catalogue : ${known.length} adresses connues, ${catalogue.length} pages lues`);
    expect(catalogue.length).toBeGreaterThan(3);

    const ctx: DraftContext = {
      siteDomain: SITE,
      niche: null,
      siteSummary: `${SITE} : ${catalogue[0]?.title ?? ""} — ${catalogue[0]?.description ?? ""}`,
      language: "fr",
      offeredAsset: null,
      signatureFirstName: "Jonathan",
    };
    const bodies: string[] = [];
    for (const [i, pageUrl] of TARGETS.entries()) {
      const item: DraftItem = {
        id: `live-${i}`,
        domain: new URL(pageUrl).hostname.replace(/^www\./, ""),
        type: "site_non_sollicite",
        expectedLinkType: "editorial",
        offer: null,
        rationale: "",
        targetPageUrl: `https://${SITE}/`,
        anchorText: "",
        brokenUrl: null,
        channel: "email",
        pageUrl,
        pageTitle: null,
        hook: "",
        brief: null,
      };
      const reader = createPageReader({ ...readerDeps, maxRequests: 4, hostDelayMs: 300 });
      const out = await draftItem(item, ctx, {
        triage: llm(process.env.DRAFT_LIVE_TRIAGE_MODEL, DRAFT_LIMITS.triageMaxCostPerCallUsd),
        writer: llm(process.env.DRAFT_LIVE_WRITER_MODEL, DRAFT_LIMITS.writerMaxCostPerCallUsd),
        fetch,
        readPage: (u) => reader.fetchText(u),
        catalogue,
        scope: {
          workspaceId: "22222222-2222-4222-8222-222222222222",
          auditId: "11111111-1111-4111-8111-111111111111",
        },
        previousBodies: bodies,
      });
      console.log(`\n=== ${pageUrl}`);
      if ("result" in out) {
        bodies.push(out.result.body);
        console.log(
          `MESSAGE (prêt : ${out.result.ready}, ${out.result.costUsd.toFixed(4)} USD)\nAngle : ${out.result.targetingReason}\nPage : ${out.result.proposedUrl}\nObjet : ${out.result.subject}\n\n${out.result.body}\n${out.result.issues.map((x) => `! ${x.message}`).join("\n")}`,
        );
      } else console.log(`NON TRAITÉE : ${out.skipped}`);
      expect(out).toBeTruthy();
    }
    const rows = ledger.tables.cost_ledger as { operation: string; actual_cost_usd: number }[];
    console.log(
      `\ncoût total : ${rows.reduce((s, r) => s + Number(r.actual_cost_usd), 0).toFixed(4)} USD en ${rows.length} appels`,
    );
  }, 600_000);
});
