import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { describe, it } from "vitest";
import { ANGLE_EVAL_CASES, ANGLE_EVAL_CONTEXTS, angleCandidate, anglePage } from "./angle-eval-set";
import { QUALIFY_LIMITS } from "./limits";
import { judgementRequest, toJudgements, batchSchema } from "./llm";
import { snapshotOf } from "./page";
import { judgementExclusion } from "./score";
import { metrics } from "./eval";

const dir = process.env.H5_DIR ?? "";
describe.skipIf(!dir)("h5", () => {
  const batches: { site: "coloriages" | "donnees"; cases: typeof ANGLE_EVAL_CASES }[] = [];
  for (const site of ["coloriages", "donnees"] as const) {
    const cases = ANGLE_EVAL_CASES.filter((c) => c.site === site);
    for (let i = 0; i < cases.length; i += QUALIFY_LIMITS.batchSize)
      batches.push({ site, cases: cases.slice(i, i + QUALIFY_LIMITS.batchSize) });
  }
  const itemsOf = (cases: typeof ANGLE_EVAL_CASES) =>
    cases.map((c, k) => ({
      id: `c${k + 1}`,
      candidate: angleCandidate(c),
      page: snapshotOf(anglePage(c), angleCandidate(c)),
    }));
  it("dump", () => {
    if (process.env.H5_MODE !== "dump") return;
    mkdirSync(dir, { recursive: true });
    batches.forEach((b, i) => {
      const r = judgementRequest(itemsOf(b.cases), ANGLE_EVAL_CONTEXTS[b.site]);
      writeFileSync(`${dir}/system.txt`, r.system);
      writeFileSync(`${dir}/lot-${i + 1}.txt`, r.prompt);
    });
  });
  it("score", () => {
    if (process.env.H5_MODE !== "score") return;
    let tp = 0,
      fp = 0,
      fn = 0,
      exact = 0,
      n = 0;
    batches.forEach((b, i) => {
      const f = `${dir}/rep-${i + 1}.json`;
      if (!existsSync(f)) return;
      const data = batchSchema.parse(JSON.parse(readFileSync(f, "utf8")));
      const items = itemsOf(b.cases);
      const js = toJudgements(items, data, ANGLE_EVAL_CONTEXTS[b.site]);
      b.cases.forEach((c, k) => {
        const j = js.get(`c${k + 1}`);
        const ex = j ? judgementExclusion(j, QUALIFY_LIMITS.minFit, angleCandidate(c)) : null;
        const kept = !!j && ex === null;
        if (kept && c.keep) tp++;
        else if (kept) fp++;
        else if (c.keep) fn++;
        if (j?.situation && (c.situations as string[]).includes(j.situation)) exact++;
        n++;
        console.log(
          `${kept === c.keep ? "OK" : "KO"} ${c.id} attendu=${c.keep ? "cible" : "refus"} obtenu=${kept ? "cible" : ex?.reason} situation=${j?.situation}`,
        );
      });
    });
    const m = metrics(tp, fp, fn);
    console.log(
      `haiku : précision ${m.precision.toFixed(2)} rappel ${m.recall.toFixed(2)} situation juste ${exact}/${n}`,
    );
  });
});
