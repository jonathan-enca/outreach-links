import { describe, expect, it } from "vitest";
import {
  ANGLE_EVAL_CASES,
  ANGLE_EVAL_CONTEXTS,
  angleCandidate,
  anglePage,
  angleReadableText,
} from "./angle-eval-set";
import { runFreeStages } from "./free";
import { buildBatchPrompt } from "./llm";
import { pageVerdict, snapshotOf } from "./page";
import { TARGET_SITUATIONS } from "./types";

/** Cohérence du jeu annoté des trois cas (MC.6b) : sans réseau ni modèle. */
describe("jeu d'évaluation des trois cas", () => {
  it("couvre deux thèmes, les trois situations et chaque motif de refus", () => {
    expect(new Set(ANGLE_EVAL_CASES.map((c) => c.id)).size).toBe(ANGLE_EVAL_CASES.length);
    for (const site of ["coloriages", "donnees"] as const) {
      const cases = ANGLE_EVAL_CASES.filter((c) => c.site === site);
      expect(cases.filter((c) => c.keep).length, site).toBeGreaterThanOrEqual(4);
      expect(cases.filter((c) => !c.keep).length, site).toBeGreaterThanOrEqual(4);
    }
    const first = new Set(ANGLE_EVAL_CASES.map((c) => c.situations[0]));
    for (const s of [
      "lien_mort",
      "petit_editeur_ressources",
      "cite_des_comparables",
      "juridique",
      "commercial",
      "ferme_a_liens",
      "pas_une_page_de_contenu",
      "aucune",
    ]) {
      expect(first.has(s as never), s).toBe(true);
    }
  });

  it("une cible porte une des trois situations ; un refus porte ses motifs acceptés", () => {
    for (const c of ANGLE_EVAL_CASES) {
      if (c.keep) {
        expect(
          c.situations.every((s) => TARGET_SITUATIONS.has(s)),
          c.id,
        ).toBe(true);
      } else {
        expect(TARGET_SITUATIONS.has(c.situations[0]!), c.id).toBe(false);
        expect(c.reasons?.length ?? 0, c.id).toBeGreaterThan(0);
      }
      expect(c.note.length, c.id).toBeGreaterThan(10);
    }
  });

  it("au moins deux cibles sont des billets anciens : l'âge n'est pas un motif de refus", () => {
    const old = ANGLE_EVAL_CASES.filter((c) => c.keep && /20(1\d)/.test(c.page.text));
    expect(old.length).toBeGreaterThanOrEqual(2);
  });

  it("les règles gratuites ne tranchent aucun de ces cas : c'est au modèle de juger", () => {
    for (const c of ANGLE_EVAL_CASES) {
      const ctx = ANGLE_EVAL_CONTEXTS[c.site];
      const cand = angleCandidate(c);
      const free = runFreeStages([cand], ctx)[0]!;
      expect(free.reason, `${c.id} étages 1-2`).toBeNull();
      expect(pageVerdict(anglePage(c), cand, ctx).reason, `${c.id} étage 3`).toBeNull();
    }
  });

  it("chaque cas montre au modèle ce que la page cite (qualification et rédacteur)", () => {
    for (const c of ANGLE_EVAL_CASES) {
      const cand = angleCandidate(c);
      const page = snapshotOf(anglePage(c), cand);
      expect(page.cites?.sites, c.id).toBe(
        new Set(c.page.cites.map(([, u]) => new URL(u).host)).size,
      );
      const prompt = buildBatchPrompt(
        [{ id: "c1", candidate: cand, page }],
        ANGLE_EVAL_CONTEXTS[c.site],
      );
      expect(prompt, c.id).toContain("liens_du_contenu");
      const cited = cand.sources.find((s) => s.source === "citation");
      if (cited) expect(page.cites?.resource?.found, c.id).toBe(true);
      else expect(prompt, c.id).toContain("lien_mort_annonce");
      for (const [anchor, url] of c.page.cites) {
        expect(angleReadableText(c), c.id).toContain(`[${anchor}](${url})`);
      }
    }
  });
});
