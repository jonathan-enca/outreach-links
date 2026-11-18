import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "vitest";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createPageReader } from "@/features/triage/page-reader";
import { catalogueCap, listSiteUrls, pickCatalogueUrls, readCataloguePages } from "./catalogue";
import { readTargetPage } from "./draft";
import { DRAFT_LIMITS } from "./limits";
import { shortlistCatalogue, type CatalogueEntry } from "./shortlist";
import type { DraftContext, DraftItem } from "./types";
import { buildTriagePrompt, TRIAGE_SYSTEM, WRITER_SYSTEM } from "./write";

/**
 * Mesure de MC.6e (ignorée sauf MC6E_LIVE=1) : mêmes cibles, deux conditions. « ancienne » : consigne et
 * catalogue de 80 pages de MC.6d (arbre `MC6E_OLD`, worktree de `main`) ; « nouvelle » : consigne
 * assouplie, catalogue complet du palier `MC6E_PLAN` (défaut starter, la bêta) présélectionné par mots
 * communs. Écrit un dossier de cas par condition, à rejuger par le modèle fort. Aucun écrit en base.
 *
 *   MC6E_LIVE=1 MC6E_IN=site.json MC6E_OUT=dossier/ MC6E_OLD=/chemin/main-wt NODE_USE_ENV_PROXY=1 \
 *   pnpm vitest run src/features/drafting/catalogue-measure.live.test.ts
 */
const live = process.env.MC6E_LIVE === "1";

describe.skipIf(!live)("mesure MC.6e", () => {
  it("construit les cas des deux conditions", async () => {
    const input = JSON.parse(readFileSync(process.env.MC6E_IN!, "utf8")) as {
      site: { domain: string; niche: string; language: string };
      targets: { domain: string; url: string; title: string | null }[];
    };
    const dir = process.env.MC6E_OUT!;
    for (const sub of ["ancienne", "nouvelle"]) mkdirSync(join(dir, sub), { recursive: true });
    const fetch = createSafeFetcher({
      userAgent: BOT_USER_AGENT,
      maxBytes: 600 * 1024,
      accept: "text/html,application/xhtml+xml,*/*;q=0.5",
    });
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const deps = { fetch, sleep, now: () => Date.now() };
    const domain = input.site.domain;
    const plan = (process.env.MC6E_PLAN ??
      "starter") as keyof typeof DRAFT_LIMITS.catalogueCapByPlan;
    const cap = catalogueCap(plan);

    // Catalogue : adresses du sitemap (plafond du palier) ; 80 pages visitées (comme en production).
    const cacheFile = join(dir, "catalogue-cache.json");
    let known: string[];
    let visited: Awaited<ReturnType<typeof readCataloguePages>>;
    if (existsSync(cacheFile)) {
      ({ known, visited } = JSON.parse(readFileSync(cacheFile, "utf8")));
    } else {
      known = await listSiteUrls(domain, deps);
      const reading = pickCatalogueUrls(
        domain,
        known,
        input.site.language,
        DRAFT_LIMITS.cataloguePages,
      );
      visited = await readCataloguePages([`https://${domain}/`, ...reading], deps);
      writeFileSync(cacheFile, JSON.stringify({ known, visited }));
    }
    const all = [
      ...new Set([
        `https://${domain}/`,
        ...pickCatalogueUrls(domain, known, input.site.language, cap),
      ]),
    ];
    const byUrl = new Map(visited.map((p) => [p.url, p]));
    const full: CatalogueEntry[] = all.map((url) => {
      const v = byUrl.get(url);
      return { url, title: v?.title ?? "", heading: v?.heading, description: v?.description ?? "" };
    });
    for (const v of visited) if (!full.some((e) => e.url === v.url)) full.push(v);
    const home = visited.find((p) => p.url === `https://${domain}/`) ?? visited[0];
    const siteSummary = home
      ? `${domain} : ${[home.title, home.description].filter(Boolean).join(" — ")}`.slice(0, 400)
      : null;
    console.log(
      JSON.stringify({
        domain,
        sitemapUrls: known.length,
        catalogue: full.length,
        lues: visited.length,
        cap,
      }),
    );

    const old = await import(
      /* @vite-ignore */ join(process.env.MC6E_OLD!, "src/features/drafting/write.ts")
    );
    writeFileSync(join(dir, "ancienne", "consigne-redacteur.txt"), old.WRITER_SYSTEM);
    writeFileSync(join(dir, "nouvelle", "consigne-redacteur.txt"), WRITER_SYSTEM);
    writeFileSync(join(dir, "nouvelle", "consigne-tri.txt"), TRIAGE_SYSTEM);

    const dctx: DraftContext = {
      siteDomain: domain,
      niche: input.site.niche,
      siteSummary,
      language: input.site.language,
      offeredAsset: null,
      signatureFirstName: "Jonathan",
    };
    const index: { id: string; domain: string; url: string; shown: number }[] = [];
    let n = 0;
    for (const t of input.targets) {
      const id = String(++n).padStart(2, "0");
      const reader = createPageReader({ ...deps, maxRequests: 4, hostDelayMs: 300 });
      const page = await readTargetPage(t.url, (u) => reader.fetchText(u));
      if ("unreadable" in page) {
        index.push({ id, domain: t.domain, url: t.url, shown: -1 });
        continue;
      }
      const item: DraftItem = {
        id,
        domain: t.domain,
        type: "page_ressources",
        expectedLinkType: "editorial",
        offer: null,
        rationale: "",
        targetPageUrl: `https://${domain}/`,
        anchorText: "",
        brokenUrl: null,
        channel: "email",
        pageUrl: t.url,
        pageTitle: t.title,
        hook: "",
        brief: null,
      };
      const oldCatalogue = visited;
      writeFileSync(
        join(dir, "ancienne", `cas-${id}.txt`),
        old.buildTriagePrompt(item, dctx, page, oldCatalogue),
      );
      const shortlist = shortlistCatalogue(
        { url: page.url, title: page.title, description: page.description, text: page.text },
        full,
        DRAFT_LIMITS.shortlistPages,
      );
      writeFileSync(
        join(dir, "nouvelle", `cas-${id}.txt`),
        buildTriagePrompt(item, dctx, page, shortlist),
      );
      index.push({ id, domain: t.domain, url: t.url, shown: shortlist.length });
    }
    writeFileSync(join(dir, "index.json"), JSON.stringify(index, null, 1));
  }, 1_800_000);
});
