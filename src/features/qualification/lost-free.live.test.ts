import { readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { BOT_TOKEN, BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createPageReader } from "@/features/triage/page-reader";
import { EVAL_CONTEXT } from "./eval-set";
import { isHomeUrl, pageVerdict, readCandidate, rescueFromHome } from "./page";
import type { QualCandidate } from "./types";

/**
 * Mesure RÉELLE (gratuite : lectures HTTP polies) du chantier D.2 : parmi des sites écartés pour
 * « éditeur introuvable », combien l'accueil sauve-t-il ?
 *   NODE_USE_ENV_PROXY=1 LOST_FREE_IN=... LOST_FREE_OUT=... pnpm demo:lost-free
 * Le contexte (langue, thème) est celui du site de test ; ne sert qu'à la mesure.
 */
const input = process.env.LOST_FREE_IN;
void BOT_TOKEN;

describe.skipIf(!input)("éditeur introuvable : l'accueil sauve-t-il le site ?", () => {
  it("rejoue la lecture et écrit le tableau", { timeout: 900_000 }, async () => {
    const items = JSON.parse(readFileSync(input!, "utf8")) as { domain: string; url: string }[];
    const fetchPage = createSafeFetcher({
      userAgent: BOT_USER_AGENT,
      maxBytes: 256 * 1024,
      accept: "text/html,*/*;q=0.5",
    });
    const ctx = { ...EVAL_CONTEXT, competitorDomains: [] };
    const rows: unknown[] = [];
    for (const it of items) {
      const c: QualCandidate = {
        domain: it.domain,
        url: it.url,
        title: null,
        tactics: [],
        sources: [],
        competitorsCount: 0,
        domainRank: null,
        spamScore: null,
        pageType: null,
        signalCount: 1,
      };
      const reader = createPageReader({
        fetch: fetchPage,
        sleep: (ms) => new Promise((x) => setTimeout(x, ms)),
        now: () => Date.now(),
        hostDelayMs: 1000,
        maxRequests: 8,
      });
      const first = pageVerdict(await readCandidate(reader, c), c, ctx);
      let outcome = first.reason ?? "ok";
      let signals: string[] = [];
      if (first.reason === "editeur_introuvable" && first.page && !isHomeUrl(first.page.url)) {
        const home = await readCandidate(reader, { ...c, url: null });
        const r = rescueFromHome(first, home, c, ctx);
        outcome = r.rescued ? "sauve" : (r.verdict.reason ?? "ok");
        signals = r.verdict.page?.publisherSignals ?? [];
      } else if (first.reason === "editeur_introuvable") outcome = "editeur_introuvable_accueil";
      rows.push({
        domain: it.domain,
        url: first.page?.url ?? it.url,
        before: first.reason,
        outcome,
        signals,
      });
    }
    writeFileSync(process.env.LOST_FREE_OUT ?? "/dev/null", JSON.stringify(rows, null, 1));
  });
});
