import { describe, expect, it } from "vitest";
import { limitsFor, PLAN_LIMITS } from "@/features/audits/plans";
import { isTestDomain, TEST_COST_CAP_USD } from "./test-domains";

describe("sites de test", () => {
  it("reconnaît les deux sites de Jonathan, avec ou sans www, schéma ou sous-domaine", () => {
    expect(isTestDomain("remove-me.io")).toBe(true);
    expect(isTestDomain("https://www.mega-coloring.com/page")).toBe(true);
    expect(isTestDomain("blog.mega-coloring.com")).toBe(true);
  });
  it("refuse les autres domaines et les domaines qui ne font que ressembler", () => {
    expect(isTestDomain("evil-remove-me.io")).toBe(false);
    expect(isTestDomain("remove-me.io.evil.com")).toBe(false);
    expect(isTestDomain("example.fr")).toBe(false);
    expect(isTestDomain(null)).toBe(false);
  });
  it("lève le plafond seulement pour eux", () => {
    expect(limitsFor("gratuit", "mega-coloring.com").costCapUsd).toBe(TEST_COST_CAP_USD);
    expect(limitsFor("gratuit", "mega-coloring.com").maxCompetitors).toBe(
      PLAN_LIMITS.payant.maxCompetitors,
    );
    expect(limitsFor("gratuit", "autre.fr")).toEqual(PLAN_LIMITS.gratuit);
  });
});
