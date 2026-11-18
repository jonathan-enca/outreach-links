import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { DraftContext, DraftItem } from "@/features/drafting/types";
import { triageTarget } from "@/features/drafting/write";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import {
  ANGLE_EVAL_CASES,
  ANGLE_EVAL_CONTEXTS,
  angleCandidate,
  anglePage,
  angleReadableText,
  type AngleEvalCase,
} from "./angle-eval-set";
import { metrics } from "./eval";
import { QUALIFY_LIMITS } from "./limits";
import { judgeBatch } from "./llm";
import { snapshotOf } from "./page";
import { judgementExclusion } from "./score";

/**
 * Évaluation RÉELLE du jugement des trois cas (MC.6b) sur le jeu annoté : le jugement de la qualification
 * (extrait de page et liens cités, par lots de 5) puis le tri du rédacteur (page en entier). Mesure la
 * précision et le rappel de « cible » et la justesse de la situation. Plafond 0,10 USD. À lancer avant et
 * après tout changement de consigne :
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:angle-eval
 */
const live = process.env.ANGLE_LIVE_EVAL === "1";

describe.skipIf(!live)("trois cas : jeu d'évaluation réel", () => {
  const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
  const client = (budgetUsd: number) =>
    createLlmClient({
      costClient: fakeSupabase({ cost_ledger: [] }).client,
      provider,
      model: process.env.LLM_MODEL ?? DEFAULT_MODELS[provider],
      auth:
        provider === "anthropic"
          ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
          : process.env.OPENAI_API_KEY
            ? { apiKey: process.env.OPENAI_API_KEY }
            : "proxy",
      budgetUsd,
    });
  const score = (rows: { c: AngleEvalCase; kept: boolean; situation: string | undefined }[]) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let exact = 0;
    for (const { c, kept, situation } of rows) {
      if (kept && c.keep) tp++;
      else if (kept && !c.keep) fp++;
      else if (!kept && c.keep) fn++;
      if (situation && (c.situations as string[]).includes(situation)) exact++;
    }
    return { m: metrics(tp, fp, fn), exact };
  };

  it("qualification : précision >= 0,85 et rappel >= 0,8 sur « cible »", async () => {
    const llm = client(0.05);
    const rows: { c: AngleEvalCase; kept: boolean; situation: string | undefined }[] = [];
    const lines: string[] = [];
    for (const site of ["coloriages", "donnees"] as const) {
      const cases = ANGLE_EVAL_CASES.filter((c) => c.site === site);
      for (let i = 0; i < cases.length; i += QUALIFY_LIMITS.batchSize) {
        const batch = cases.slice(i, i + QUALIFY_LIMITS.batchSize);
        const items = batch.map((c, k) => ({
          id: `c${k + 1}`,
          candidate: angleCandidate(c),
          page: snapshotOf(anglePage(c), angleCandidate(c)),
        }));
        const { judgements } = await judgeBatch(llm, items, ANGLE_EVAL_CONTEXTS[site], {
          workspaceId: null,
          auditId: null,
        });
        batch.forEach((c, k) => {
          const j = judgements.get(`c${k + 1}`);
          const ex = j ? judgementExclusion(j, QUALIFY_LIMITS.minFit, angleCandidate(c)) : null;
          const kept = !!j && ex === null;
          rows.push({ c, kept, situation: j?.situation });
          lines.push(
            `${kept === c.keep ? "✔" : "✘"} ${c.id} attendu=${c.keep ? "cible" : "refus"} (${c.situations[0]}) obtenu=${kept ? "cible" : (ex?.reason ?? "aucun")} situation=${j?.situation} fit=${j?.fit}`,
          );
        });
      }
    }
    const { m, exact } = score(rows);
    console.log(lines.join("\n"));
    console.log(
      `qualification : précision ${m.precision.toFixed(2)}, rappel ${m.recall.toFixed(2)} ; situation juste ${exact}/${rows.length} ; coût ${llm.spentUsd.toFixed(5)} USD`,
    );
    expect(m.precision).toBeGreaterThanOrEqual(0.85);
    expect(m.recall).toBeGreaterThanOrEqual(0.8);
  }, 300_000);

  // Le tri est un premier passage, indulgent par construction (le modèle fort rejuge) : c'est le rappel
  // qui compte, une cible manquée ici n'est jamais rattrapée.
  it("tri du rédacteur : rappel >= 0,9 et précision >= 0,7 sur « angle »", async () => {
    const llm = client(0.05);
    const rows: { c: AngleEvalCase; kept: boolean; situation: string | undefined }[] = [];
    const lines: string[] = [];
    for (const c of ANGLE_EVAL_CASES) {
      const q = ANGLE_EVAL_CONTEXTS[c.site];
      const ctx: DraftContext = {
        siteDomain: q.ownDomain,
        niche: q.theme,
        siteSummary: q.activity,
        language: "fr",
        offeredAsset: null,
        signatureFirstName: "Camille",
      };
      const dead = c.candidate.sources.find((s) => s.source === "lien_mort");
      const item: DraftItem = {
        id: c.id,
        domain: c.candidate.domain,
        type: dead ? "lien_mort" : "page_ressources",
        expectedLinkType: "editorial",
        offer: null,
        rationale: "",
        targetPageUrl: q.resources[0]!.url,
        anchorText: "",
        brokenUrl: dead?.query ?? null,
        channel: "email",
        pageUrl: c.candidate.url!,
        pageTitle: c.page.title,
        hook: "",
        brief: dead
          ? {
              kind: "lien_mort",
              opening: "",
              resourceTitle: q.resources[0]!.title,
              resourceUrl: q.resources[0]!.url,
              anchor: null,
              presentation: "fondateur",
              quote: null,
              linkUrl: dead.query,
              httpStatus: 404,
              proposedSentence: null,
            }
          : null,
      };
      const out = await triageTarget(
        llm,
        item,
        ctx,
        {
          url: c.candidate.url!,
          title: c.page.title,
          description: "",
          text: angleReadableText(c),
          moved: false,
        },
        q.resources.map((r) => ({ url: r.url, title: r.title, description: "" })),
        { workspaceId: null, auditId: null },
      );
      const kept = out.verdict === "angle";
      rows.push({ c, kept, situation: out.situation });
      lines.push(
        `${kept === c.keep ? "✔" : "✘"} ${c.id} attendu=${c.keep ? "angle" : "refus"} (${c.situations[0]}) obtenu=${out.verdict} situation=${out.situation} : ${out.motif.slice(0, 110)}`,
      );
    }
    const { m, exact } = score(rows);
    console.log(lines.join("\n"));
    console.log(
      `tri du rédacteur : précision ${m.precision.toFixed(2)}, rappel ${m.recall.toFixed(2)} ; situation juste ${exact}/${rows.filter((r) => r.c.keep).length} cibles ; coût ${llm.spentUsd.toFixed(5)} USD`,
    );
    expect(m.recall).toBeGreaterThanOrEqual(0.9);
    expect(m.precision).toBeGreaterThanOrEqual(0.7);
  }, 600_000);
});
