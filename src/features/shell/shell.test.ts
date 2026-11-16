import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { t } from "@/lib/messages";
import { JourneySteps } from "./journey-steps";
import { homeDestination, nextStep, siteHref, type SiteSnapshot } from "./next-step";

vi.mock("next/navigation", () => ({ usePathname: () => "/app" }));

const site = (audit: SiteSnapshot["audit"], id = "s1"): SiteSnapshot => ({
  id,
  domain: `${id}.example`,
  audit,
});
const audit = (status: string, analysisStatus: string) => ({ id: "a1", status, analysisStatus });

describe("nextStep", () => {
  it("site sans analyse : la relecture (onboarding en cours)", () => {
    expect(nextStep(site(null))).toEqual({
      kind: "onboarding",
      href: "/app/demarrer/s1",
      step: "verification",
    });
  });
  it("analyse confirmée, en cours ou audit pas encore confirmé : l'écran d'analyse", () => {
    for (const a of [
      audit("confirme", "confirme"),
      audit("termine", "en_cours"),
      audit("estime", "aucun"),
      audit("en_cours", "aucun"),
    ]) {
      expect(nextStep(site(a))).toMatchObject({ kind: "analyse", href: siteHref.analyse("s1") });
    }
  });
  it("analyse en échec : l'écran d'analyse avec reprise", () => {
    expect(nextStep(site(audit("termine", "echoue")))).toMatchObject({
      kind: "reprise",
      href: "/app/site/s1/analyse",
    });
    expect(nextStep(site(audit("echoue", "aucun"))).kind).toBe("reprise");
  });
  it("analyse finie, ou ancien audit terminé : Vos cibles", () => {
    expect(nextStep(site(audit("termine", "termine")))).toMatchObject({
      kind: "cibles",
      href: "/app/site/s1/cibles",
      step: "cibles",
    });
    expect(nextStep(site(audit("termine", "aucun"))).kind).toBe("cibles");
  });
});

describe("homeDestination (/app)", () => {
  it("sans site : étape 1", () => {
    expect(homeDestination([])).toBe("/app/demarrer");
  });
  it("un seul site : sa prochaine étape", () => {
    expect(homeDestination([site(audit("termine", "termine"))])).toBe("/app/site/s1/cibles");
  });
  it("plusieurs sites : la liste (pas de redirection)", () => {
    expect(homeDestination([site(null, "s1"), site(null, "s2")])).toBeNull();
  });
});

describe("fil d'étapes", () => {
  it("affiche les cinq étapes et marque l'étape en cours", () => {
    const html = renderToStaticMarkup(createElement(JourneySteps, { current: "analyse" }));
    for (const label of Object.values(t.journey.steps)) expect(html).toContain(label);
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("Étape 4 sur 5");
  });
});

/**
 * Vocabulaire du parcours (docs/jalon-mu.md 3.2) : aucun montant en dollars, aucun mot interne.
 * `targets.steps` (panneaux d'étapes payantes) n'est affiché que derrière `LEGACY_CHAIN`.
 */
const FORBIDDEN =
  /\bcollect(e|er|ée|ées|és|ion)\b|qualification|entonnoir|constat|recoupement|univers de requ|chaîne|candidat|pire cas|plafond d.audit|USD|\$|dollar/i;

function strings(o: unknown, path: string, out: [string, string][]) {
  if (typeof o === "string") out.push([path, o]);
  else if (typeof o === "function") {
    try {
      const s = (o as (...a: number[]) => unknown)(2, 3, 4);
      if (typeof s === "string") out.push([path, s]);
    } catch {
      /* fonction à arguments non numériques : ignorée */
    }
  } else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) strings(v, `${path}.${k}`, out);
  }
}

describe("vocabulaire du parcours", () => {
  const scoped: Record<string, unknown> = {
    journey: t.journey,
    shell: t.shell,
    overview: t.overview,
    "targets (hors étapes payantes)": { ...t.targets, steps: undefined },
    "onboarding.review": t.onboarding.review,
    "onboarding (URL)": { ...t.onboarding, review: undefined },
    "audits.estimate": t.audits.estimate,
    "audits.analysis": {
      title: t.audits.analysisTitle,
      d: t.audits.analysisDescription,
      r: t.audits.analysisRunning,
      f: t.audits.analysisFailed,
      done: t.audits.analysisDone,
    },
  };
  for (const [name, tree] of Object.entries(scoped)) {
    it(`${name} : ni dollars ni mot interdit`, () => {
      const all: [string, string][] = [];
      strings(tree, name, all);
      expect(all.length).toBeGreaterThan(0);
      expect(all.filter(([, v]) => FORBIDDEN.test(v))).toEqual([]);
    });
  }
});
