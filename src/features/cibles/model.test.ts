import { describe, expect, it } from "vitest";
import type { TargetCard } from "@/features/targets/types";
import { messageStateKey, parseTab, toDecide } from "./model";

const card = (id: string, validated: boolean) =>
  ({ id, domain: `${id}.fr`, alreadyValidated: validated }) as unknown as TargetCard;

describe("parseTab", () => {
  it("accepte les trois onglets et retombe sur « À décider »", () => {
    expect(parseTab("retenues")).toBe("retenues");
    expect(parseTab("ecartees")).toBe("ecartees");
    expect(parseTab("n'importe-quoi")).toBe("decider");
    expect(parseTab(null)).toBe("decider");
  });
});

describe("toDecide", () => {
  it("garde les cibles non retenues, dans l'ordre reçu", () => {
    const out = toDecide([card("a", false), card("b", true), card("c", false)]);
    expect(out.map((c) => c.id)).toEqual(["a", "c"]);
  });
});

describe("messageStateKey", () => {
  it("un message non relu reste à relire", () => {
    expect(messageStateKey(true)).toBe("pret");
    expect(messageStateKey(false)).toBe("aRelire");
  });
});
