import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { FunnelStats } from "./funnel";
import { finalizeMore, rankAll, type MoreRun } from "./more";
import type { QualResult } from "./types";

const run: MoreRun = {
  id: "run-1",
  auditId: "audit-1",
  collectionId: "col-1",
  workspaceId: "ws-1",
  siteId: "site-1",
  budgetUsd: 0.15,
  model: "m",
  auditCapUsd: 2,
  priorYield: {},
};

const result = (domain: string, over: Partial<QualResult> = {}): QualResult => ({
  domain,
  url: `https://${domain}/`,
  tactics: ["inconnus"],
  status: "liste_courte",
  stageReached: 6,
  exclusionReason: null,
  exclusionDetail: null,
  provisionalScore: 40,
  page: null,
  judgement: null,
  contact: {
    status: "email_verifie",
    email: `contact@${domain}`,
    contactUrl: null,
    formUrl: null,
    sendable: true,
    reason: "",
  },
  score: 50,
  scoreParts: null,
  rank: 1,
  requestLines: ["a", "b", "c"],
  why: "Parce que.",
  platformHosted: false,
  domainRank: null,
  competitorsCount: 0,
  ...over,
});

const stock = (domain: string) => ({
  id: `stock-${domain}`,
  run_id: "run-1",
  audit_id: "audit-1",
  domain,
  status: "reserve",
  exclusion_reason: "hors_budget_lecture",
  score: null,
  rank: null,
});
const delivered = (domain: string, score: number, rank: number) => ({
  id: `ok-${domain}`,
  run_id: "run-1",
  audit_id: "audit-1",
  domain,
  status: "liste_courte",
  exclusion_reason: null,
  score,
  rank,
});

describe("rang de toute la liste après un lot", () => {
  it("par score puis par domaine ; seules les cibles déjà livrées dont le rang change sont réécrites", () => {
    const out = rankAll(
      [
        { id: "a", domain: "a.fr", score: 60, rank: 1 },
        { id: "b", domain: "b.fr", score: 40, rank: 2 },
      ],
      [
        { domain: "n1.fr", score: 70 },
        { domain: "n2.fr", score: 40 },
      ],
    );
    expect([...out.rankOf]).toEqual([
      ["n1.fr", 1],
      ["a.fr", 2],
      ["b.fr", 3],
      ["n2.fr", 4],
    ]);
    expect(out.changed).toEqual([
      { id: "a", rank: 2 },
      { id: "b", rank: 3 },
    ]);
    expect(out.total).toBe(4);
  });
});

describe("rangement d'un lot du stock", () => {
  const stats = { costUsd: 0.05, stock: 1, pagesRead: 3, judged: 3, relevant: 1 } as FunnelStats;

  it("jamais de suppression, une cible livrée a toujours un rang, les cibles déjà livrées gardent leur identifiant", async () => {
    const db = fakeSupabase({
      qualified_targets: [
        delivered("ancienne.fr", 60, 1),
        delivered("autre.fr", 30, 2),
        stock("nouvelle.fr"),
        stock("ecartee.fr"),
        stock("pas-lue.fr"),
      ],
      qualification_runs: [
        { id: "run-1", audit_id: "audit-1", stats: { pagesRead: 100 }, actual_cost_usd: 0.2 },
      ],
    });
    const out = await finalizeMore(
      db.client,
      run,
      [
        result("nouvelle.fr", { score: 45 }),
        result("ecartee.fr", {
          status: "exclu",
          exclusionReason: "hors_sujet",
          score: null,
          rank: null,
          contact: null,
        }),
        result("pas-lue.fr", {
          status: "reserve",
          exclusionReason: "hors_budget_lecture",
          score: null,
          rank: null,
          contact: null,
        }),
      ],
      stats,
    );
    expect(out).toEqual({ added: 1, shortlist: 3, stock: 1 });
    expect(db.log.some((l) => l.table === "qualified_targets" && l.op === "delete")).toBe(false);
    const rows = db.tables.qualified_targets!;
    expect(rows).toHaveLength(5);
    const by = (d: string) => rows.find((r) => r.domain === d)!;
    expect(by("ancienne.fr")).toMatchObject({ id: "ok-ancienne.fr", rank: 1 });
    expect(by("nouvelle.fr")).toMatchObject({ status: "liste_courte", rank: 2, score: 45 });
    expect(by("autre.fr")).toMatchObject({ id: "ok-autre.fr", rank: 3 });
    expect(by("ecartee.fr")).toMatchObject({ status: "exclu", rank: null });
    expect(by("pas-lue.fr")).toMatchObject({ exclusion_reason: "hors_budget_lecture" });
    // Contrainte de la table : une cible livrée a toujours un rang.
    expect(rows.filter((r) => r.status === "liste_courte").every((r) => r.rank !== null)).toBe(
      true,
    );
    expect(db.tables.qualification_runs![0]).toMatchObject({ more_status: "termine" });
  });

  it("rejouable : un site qui n'est plus en stock n'est pas réécrit", async () => {
    const db = fakeSupabase({
      qualified_targets: [delivered("deja.fr", 45, 1)],
      qualification_runs: [{ id: "run-1", audit_id: "audit-1", stats: {}, actual_cost_usd: 0 }],
    });
    const out = await finalizeMore(db.client, run, [result("deja.fr", { score: 99 })], stats);
    expect(out.added).toBe(0);
    expect(db.tables.qualified_targets![0]).toMatchObject({ id: "ok-deja.fr", score: 45, rank: 1 });
  });
});
