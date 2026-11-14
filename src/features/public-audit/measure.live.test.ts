import { describe, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createDataForSeoClient, MemoryCache } from "@/lib/dataforseo";
import {
  beginPublicAudit,
  collectCompetitorLinks,
  collectOwnKeywords,
  collectOwnLinks,
  collectSerp,
  finalizePublicAudit,
  pickCompetitors,
} from "./run";

/**
 * Mesure RÉELLE du coût d'un audit gratuit (payant, ~0,20 USD par domaine) : ignorée par défaut,
 * donc jamais en CI. Base simulée en mémoire (le cost_ledger l'est aussi), appels DataForSEO réels.
 * Lancer : NODE_USE_ENV_PROXY=1 PUBLIC_AUDIT_LIVE_DEMO=1 PUBLIC_AUDIT_LIVE_DOMAINS=a.fr,b.fr \
 *   DATAFORSEO_PROXY_AUTH=true pnpm demo:public-audit
 * (ou DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD). Plafond de sécurité : 1,50 USD pour toute la session.
 */
describe.skipIf(process.env.PUBLIC_AUDIT_LIVE_DEMO !== "1")(
  "mesure réelle de l'audit gratuit",
  () => {
    it("exécute le pipeline et affiche le coût réel", { timeout: 300_000 }, async () => {
      const domains = (process.env.PUBLIC_AUDIT_LIVE_DOMAINS ?? "mega-coloring.com").split(",");
      const ID_BASE = "aaaaaaaa-aaaa-4aaa-8aaa-";
      let total = 0;
      for (const [i, domain] of domains.entries()) {
        const id = `${ID_BASE}${String(i).padStart(12, "0")}`;
        const db = fakeSupabase({
          public_audits: [
            { id, domain, status: "en_attente", attempts: 0, queries: [], queries_source: "auto" },
          ],
        });
        const dfs = createDataForSeoClient({
          costClient: db.client,
          cache: new MemoryCache(),
          auth:
            process.env.DATAFORSEO_PROXY_AUTH === "true"
              ? "proxy"
              : {
                  login: process.env.DATAFORSEO_LOGIN ?? "",
                  password: process.env.DATAFORSEO_PASSWORD ?? "",
                },
          budgetUsd: Math.max(0.01, 1.5 - total),
          maxCostPerCallUsd: 0.1,
        });
        const run = (await beginPublicAudit(db.client, id))!;
        const own = await collectOwnKeywords(db.client, dfs, run);
        if (!own.ok) {
          console.log(JSON.stringify({ domain, failed: own.code }));
          continue;
        }
        const perQuery = [];
        for (const q of own.queries) perQuery.push(await collectSerp(db.client, dfs, run, q));
        const competitors = pickCompetitors(perQuery, domain);
        const links = [];
        for (const c of competitors)
          links.push(await collectCompetitorLinks(db.client, dfs, run, c));
        const ownLinks = await collectOwnLinks(db.client, dfs, run);
        const out = await finalizePublicAudit(db.client, run, {
          own,
          ownLinks,
          competitors,
          links,
        });
        const ledger = (db.tables.cost_ledger ?? []) as {
          operation: string;
          actual_cost_usd: number;
        }[];
        total += out.costUsd;
        console.log(
          JSON.stringify({
            domain,
            queries: own.queries,
            competitors: competitors.map((c) => c.domain),
            targetsTotal: out.targetsTotal,
            score: out.score,
            costUsd: out.costUsd,
            calls: ledger.length,
            byOperation: Object.fromEntries(ledger.map((l) => [l.operation, l.actual_cost_usd])),
          }),
        );
      }
      console.log(JSON.stringify({ totalUsd: total, audits: domains.length }));
    });
  },
);
