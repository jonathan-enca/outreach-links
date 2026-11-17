import { describe, expect, it } from "vitest";
import { repliesToNotify } from "./notifications";

describe("« une réponse vous attend » : qui prévenir", () => {
  const drafts = [
    { id: "d1", workspace_id: "w1" },
    { id: "d2", workspace_id: "w1" },
    { id: "d3", workspace_id: "w2" },
    { id: "d4", workspace_id: "w3" },
  ];
  it("un groupe par espace, sans les réponses déjà signalées ni les espaces qui l'ont coupée", () => {
    const g = repliesToNotify(drafts, new Set(["d2"]), new Set(["w3"]));
    expect([...g.entries()]).toEqual([
      ["w1", ["d1"]],
      ["w2", ["d3"]],
    ]);
  });
  it("tout déjà signalé : personne", () => {
    expect(repliesToNotify(drafts, new Set(["d1", "d2", "d3", "d4"]), new Set()).size).toBe(0);
  });
});
