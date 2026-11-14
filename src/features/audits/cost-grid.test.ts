import { describe, expect, it, vi } from "vitest";
import { estimatePublicAudit, FREE_LIMITS } from "@/features/public-audit/config";
import { estimateBacklinks } from "@/features/backlinks/limits";
import { estimateProfile } from "@/features/profile/limits";
import { fetchBenchmark, type ProfileRun } from "@/features/profile/run";
import { estimateDiscovery } from "./estimate";
import { PLAN_LIMITS } from "./plans";
import { PRICING } from "@/lib/dataforseo/endpoints";

/** Grille recalée sur les coûts réels mesurés le 14/11/2026 (MA.3). */
describe("grille de coûts recalée (MA.3)", () => {
  it("les tarifs reprennent les mesures réelles", () => {
    expect(PRICING.labsPerRequest).toBe(0.012);
    expect(PRICING.backlinksPerRequest).toBeCloseTo(0.02 * 1.2, 6);
    expect(PRICING.backlinksPerRow).toBeCloseTo(0.00003 * 1.2, 8);
  });

  it("parcours gratuit complet (concurrents + backlinks + profil) : marge d'au moins 10 % sous le plafond", () => {
    const cap = PLAN_LIMITS.gratuit.costCapUsd;
    expect(cap).toBe(0.25);
    const discovery = estimateDiscovery(["a", "b", "c"], PLAN_LIMITS.gratuit).totalUsd;
    const backlinks = estimateBacklinks(3, "gratuit", cap - discovery)!;
    expect(backlinks).not.toBeNull();
    const profile = estimateProfile(3, "gratuit", cap - discovery - backlinks.totalUsd, 3)!;
    expect(profile).not.toBeNull();
    const total = discovery + backlinks.totalUsd + profile.totalUsd;
    expect(total).toBeLessThanOrEqual(cap * 0.9);
    // La marge est rendue par la limite de lignes, pas par le plafond.
    expect(backlinks.limit).toBe(75);
  });

  it("audit gratuit public : marge d'au moins 10 % sous le plafond", () => {
    expect(estimatePublicAudit().totalUsd).toBeLessThanOrEqual(FREE_LIMITS.costCapUsd * 0.9);
  });

  it("fetchBenchmark : taille déjà mesurée = aucun appel payant", async () => {
    const dfs = { backlinksSummary: vi.fn() };
    const out = await fetchBenchmark({} as never, dfs as never, {} as unknown as ProfileRun, {
      id: "c1",
      domain: "petit.fr",
      referringDomains: 1200,
    });
    expect(out).toEqual({ domain: "petit.fr", referringDomains: 1200 });
    expect(dfs.backlinksSummary).not.toHaveBeenCalled();
  });
});
