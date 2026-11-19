import { describe, expect, it } from "vitest";
import {
  DEEP_FLAG,
  DEEP_LIMITS,
  deepEnabled,
  deepGate,
  deepLevelCostUsd,
  reviewSample,
  yieldOf,
} from "./deep";
import { runDeepSnowballForAudit } from "./service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const open = {
  level: 2,
  enabled: true,
  realReplies: 3,
  previousLevelDone: true,
  previousYield: 0.4,
};

describe("interrupteur de la boule de neige profonde", () => {
  it("est coupé par défaut, et seulement « true » l'allume", () => {
    expect(deepEnabled({})).toBe(false);
    expect(deepEnabled({ [DEEP_FLAG]: "1" })).toBe(false);
    expect(deepEnabled({ [DEEP_FLAG]: "false" })).toBe(false);
    expect(deepEnabled({ [DEEP_FLAG]: "true" })).toBe(true);
  });
});

describe("deepGate", () => {
  it("accepte un niveau quand tout est réuni", () => {
    expect(deepGate(open)).toEqual({ ok: true });
  });

  it("bloque tant que l'interrupteur est coupé, même avec des réponses", () => {
    expect(deepGate({ ...open, enabled: false })).toEqual({ ok: false, reason: "desactive" });
  });

  it("n'amplifie jamais sans réponse réelle", () => {
    expect(deepGate({ ...open, realReplies: 0 })).toEqual({ ok: false, reason: "pas_de_reponses" });
  });

  it("refuse un niveau hors de la plage 2 à maxLevel", () => {
    expect(deepGate({ ...open, level: 1 })).toEqual({ ok: false, reason: "niveau_hors_plage" });
    expect(deepGate({ ...open, level: DEEP_LIMITS.maxLevel + 1 })).toEqual({
      ok: false,
      reason: "niveau_hors_plage",
    });
    expect(deepGate({ ...open, level: 2.5 })).toEqual({ ok: false, reason: "niveau_hors_plage" });
  });

  it("exige que le niveau précédent soit lancé et relu", () => {
    expect(deepGate({ ...open, previousLevelDone: false })).toEqual({
      ok: false,
      reason: "niveau_precedent_absent",
    });
    expect(deepGate({ ...open, previousYield: null })).toEqual({
      ok: false,
      reason: "rendement_non_mesure",
    });
  });

  it("arrête la chaîne quand le rendement est sous le seuil", () => {
    expect(deepGate({ ...open, previousYield: DEEP_LIMITS.minYield - 0.01 })).toEqual({
      ok: false,
      reason: "rendement_insuffisant",
    });
    expect(deepGate({ ...open, previousYield: DEEP_LIMITS.minYield })).toEqual({ ok: true });
  });

  it("garde le coût pire cas d'un niveau sous le plafond annoncé", () => {
    expect(deepLevelCostUsd().worstUsd).toBeLessThanOrEqual(DEEP_LIMITS.levelCapUsd);
  });
});

describe("rendement et échantillon", () => {
  it("mesure la part de cibles bonnes, sans division par zéro", () => {
    expect(yieldOf([true, false, true, false])).toEqual({ kept: 2, sample: 4, rate: 0.5 });
    expect(yieldOf([])).toEqual({ kept: 0, sample: 0, rate: null });
  });

  it("prend un échantillon réparti, déterministe, de la taille demandée", () => {
    const targets = Array.from({ length: 100 }, (_, i) => ({
      domain: `site-${String(i).padStart(3, "0")}.fr`,
    }));
    const a = reviewSample(targets);
    const b = reviewSample([...targets].reverse());
    expect(a).toHaveLength(DEEP_LIMITS.reviewSample);
    expect(a).toEqual(b);
    // Réparti sur toute la liste, pas seulement les premiers.
    expect(a[a.length - 1].domain > "site-080.fr").toBe(true);
  });

  it("garde tout l'échantillon quand la liste est plus petite", () => {
    const few = [{ domain: "b.fr" }, { domain: "a.fr" }];
    expect(reviewSample(few).map((x) => x.domain)).toEqual(["a.fr", "b.fr"]);
  });
});

describe("runDeepSnowballForAudit sans interrupteur", () => {
  it("ne touche ni à la base ni aux API payantes", async () => {
    const service = new Proxy(
      {},
      {
        get: () => {
          throw new Error("base touchée");
        },
      },
    ) as unknown as SupabaseClient<Database>;
    const out = await runDeepSnowballForAudit(
      service,
      "11111111-1111-4111-8111-111111111111",
      {
        dfs: {
          backlinksBacklinks: async () => {
            throw new Error("DataForSEO appelé");
          },
        },
      } as never,
      2,
      { enabled: false },
    );
    expect(out).toEqual({ status: "bloque", reason: "desactive" });
  });
});
