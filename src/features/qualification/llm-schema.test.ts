import { describe, expect, it } from "vitest";
import { batchSchema } from "./llm";

describe("schéma de jugement (MC.6g)", () => {
  it("accepte un motif et une note trop longs au lieu de rejeter tout le lot", () => {
    const r = batchSchema.safeParse({
      results: [
        {
          id: "c1",
          site_type: "blog",
          situation: "autre",
          fit: 0.3,
          fit_reason: "x".repeat(400),
          sells_links: false,
          same_offer: false,
          unrealistic: false,
          hook: null,
          note: "y".repeat(300),
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});
