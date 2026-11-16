import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { evalDeps, metrics } from "./eval";
import { FINDING_EVAL_CASES, FINDING_EVAL_CONTEXT } from "./eval-set";
import { judgePage } from "./llm";
import { scanTarget } from "./funnel";

/**
 * Évaluation RÉELLE du jugement LLM des constats (mentions : parle-t-on bien du site ? liens :
 * lequel est inadapté ET remplaçable par une page du site ?) sur les pages annotées du jeu
 * (un appel par page, plafond 0,03 USD). À lancer avant et après tout changement de prompt :
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:findings-eval
 */
const live = process.env.FINDINGS_LIVE_EVAL === "1";

describe.skipIf(!live)("constats par page : jugement LLM réel", () => {
  it("précision >= 0,9 et rappel >= 0,8 sur mentions et liens inadaptés", async () => {
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const llm = createLlmClient({
      costClient: fakeSupabase({ cost_ledger: [] }).client,
      provider,
      model: process.env.LLM_MODEL ?? DEFAULT_MODELS[provider],
      auth:
        provider === "anthropic"
          ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
          : process.env.OPENAI_API_KEY
            ? { apiKey: process.env.OPENAI_API_KEY }
            : "proxy",
      budgetUsd: 0.03,
    });
    const m = { tp: 0, fp: 0, fn: 0 };
    const u = { tp: 0, fp: 0, fn: 0 };
    const lines: string[] = [];
    for (const c of FINDING_EVAL_CASES.filter((x) => x.llm)) {
      const scan = await scanTarget(evalDeps(c), FINDING_EVAL_CONTEXT, {
        targetId: c.id,
        domain: "exemple-cible.fr",
        url: `https://exemple-cible.fr/${c.id}`,
        rank: 1,
        resource: 0,
      });
      const { judgement } = await judgePage(
        llm,
        {
          mentions: scan.mentions,
          links: scan.linkCandidates,
          pageTitle: scan.pageTitle,
          pageUrl: scan.pageUrl,
        },
        FINDING_EVAL_CONTEXT,
        { workspaceId: null, auditId: null },
      );
      const want = c.llm!;
      if (want.mentionAboutSite !== null) {
        const got = judgement.mention !== null;
        if (got && want.mentionAboutSite) m.tp++;
        else if (got && !want.mentionAboutSite) m.fp++;
        else if (!got && want.mentionAboutSite) m.fn++;
      }
      const gotUrl = judgement.unsuited?.link.url ?? null;
      if (gotUrl && gotUrl === want.unsuitedUrl) u.tp++;
      else {
        if (gotUrl) u.fp++;
        if (want.unsuitedUrl) u.fn++;
      }
      lines.push(
        `${c.id} mention=${judgement.mention ? `oui(${judgement.mention.anchor})` : "non"} (attendu ${want.mentionAboutSite}) lien=${gotUrl ?? "aucun"} (attendu ${want.unsuitedUrl ?? "aucun"}) ${judgement.unsuited ? `pageIdx=${judgement.unsuited.resource} raison=${judgement.unsuited.reason}` : ""}`,
      );
    }
    const mm = metrics(m.tp, m.fp, m.fn);
    const uu = metrics(u.tp, u.fp, u.fn);
    console.log(lines.join("\n"));
    console.log(
      `mentions : précision ${mm.precision.toFixed(2)}, rappel ${mm.recall.toFixed(2)} ; liens inadaptés : précision ${uu.precision.toFixed(2)}, rappel ${uu.recall.toFixed(2)} ; coût ${llm.spentUsd.toFixed(5)} USD`,
    );
    expect(mm.precision).toBeGreaterThanOrEqual(0.9);
    expect(mm.recall).toBeGreaterThanOrEqual(0.8);
    expect(uu.precision).toBeGreaterThanOrEqual(0.9);
    expect(uu.recall).toBeGreaterThanOrEqual(0.8);
  }, 300_000);
});
