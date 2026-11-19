import { describe, expect, it } from "vitest";
import type { ResourceCandidate } from "@/features/collection/resource-judge";
import {
  normalizeDomain,
  prescreenSeeds,
  rankSeeds,
  withReferringDomains,
} from "./prescreen";

const cand = (domain: string, over: Partial<ResourceCandidate> = {}): ResourceCandidate => ({
  domain,
  title: null,
  url: null,
  queries: 0,
  origin: "citee",
  citedBy: 1,
  referringDomains: null,
  ...over,
});

describe("normalizeDomain", () => {
  it("minuscules, sans www ni point final", () => {
    expect(normalizeDomain(" WWW.Hugolescargot.com. ")).toBe("hugolescargot.com");
  });
});

describe("withReferringDomains", () => {
  it("range le nombre de domaines citants par domaine, sans regarder la casse ni le www", () => {
    const out = withReferringDomains(
      [cand("www.tidou.fr"), cand("esle.io")],
      [
        { target: "tidou.fr", referring_domains: 42 },
        { target: "ESLE.io", referring_domains: 7 },
      ],
    );
    expect(out.map((c) => c.referringDomains)).toEqual([42, 7]);
  });

  it("ne remplace pas une taille déjà connue", () => {
    const out = withReferringDomains(
      [cand("tidou.fr", { referringDomains: 3 })],
      [{ target: "tidou.fr", referring_domains: 42 }],
    );
    expect(out[0].referringDomains).toBe(3);
  });

  it("laisse null un site absent de la réponse", () => {
    const out = withReferringDomains([cand("inconnu.fr")], []);
    expect(out[0].referringDomains).toBeNull();
  });
});

describe("prescreenSeeds", () => {
  it("garde le seuil atteint (inclus), écarte le reste et les tailles inconnues", () => {
    const kept = prescreenSeeds(
      [
        cand("a.fr", { referringDomains: 10 }),
        cand("b.fr", { referringDomains: 9 }),
        cand("c.fr", { referringDomains: null }),
        cand("d.fr", { referringDomains: 250 }),
      ],
      10,
    );
    expect(kept.map((c) => c.domain)).toEqual(["a.fr", "d.fr"]);
  });

  it("le seuil par défaut est 10", () => {
    expect(prescreenSeeds([cand("x.fr", { referringDomains: 9 })])).toHaveLength(0);
  });
});

describe("rankSeeds", () => {
  it("classe par pages citantes, puis domaines citants, sans ordre alphabétique", () => {
    const ranked = rankSeeds([
      cand("aaa.fr", { citedBy: 2, referringDomains: 10 }),
      cand("zzz.fr", { citedBy: 2, referringDomains: 80 }),
      cand("mmm.fr", { citedBy: 3, referringDomains: 10 }),
    ]);
    expect(ranked.map((c) => c.domain)).toEqual(["mmm.fr", "zzz.fr", "aaa.fr"]);
  });

  it("le nom de domaine ne sert qu'à départager des ex æquo", () => {
    const ranked = rankSeeds([cand("b.fr", { citedBy: 1 }), cand("a.fr", { citedBy: 1 })]);
    expect(ranked.map((c) => c.domain)).toEqual(["a.fr", "b.fr"]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const input = [cand("b.fr", { citedBy: 1 }), cand("a.fr", { citedBy: 5 })];
    rankSeeds(input);
    expect(input[0].domain).toBe("b.fr");
  });
});

describe("mr1Settings", () => {
  it("sans variable : comportement d'origine (rien de réglé)", async () => {
    const { mr1Settings } = await import("./service");
    expect(mr1Settings({})).toEqual({
      max: undefined,
      rowsPerCall: undefined,
      prescreen: false,
      phaseCapUsd: undefined,
    });
  });

  it("lit les variables du test, ignore les valeurs invalides", async () => {
    const { mr1Settings } = await import("./service");
    expect(
      mr1Settings({
        SNOWBALL_MAX_RESOURCES: "20",
        SNOWBALL_ROWS_PER_CALL: "1000",
        SNOWBALL_PRESCREEN: "true",
        SNOWBALL_PHASE_CAP_USD: "3",
      }),
    ).toEqual({ max: 20, rowsPerCall: 1000, prescreen: true, phaseCapUsd: 3 });
    expect(mr1Settings({ SNOWBALL_MAX_RESOURCES: "abc", SNOWBALL_PHASE_CAP_USD: "-1" })).toMatchObject({
      max: undefined,
      phaseCapUsd: undefined,
    });
  });
});
