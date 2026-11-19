import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { SearchConsoleSnapshot } from "@/features/search-console/load";

// Le plafond de dépense n'est pas le sujet ici : on le laisse passer.
vi.mock("@/features/collection/guard", () => ({
  assertCanSpend: async () => undefined,
  spendLimitsFor: () => ({}),
}));

import { executeLinksState, type LinksStateRun } from "./links-state";

const snapshot: SearchConsoleSnapshot = {
  measuredAt: "2026-11-19T00:00:00.000Z",
  property: "sc-domain:exemple.fr",
  days: 90,
  queries: [{ key: "cloportes", clicks: 3, impressions: 90, position: 12 }],
  pages: [{ key: "https://exemple.fr/guide", clicks: 5, impressions: 60, position: 4 }],
};

const emptyDfs = {
  backlinksSummary: async () => ({ result: null }),
  backlinksReferringDomains: async () => ({ result: null }),
  labsRankedKeywords: async () => ({ result: null }),
} as never;

const run: LinksStateRun = {
  auditId: "a1",
  siteId: "s1",
  workspaceId: "w1",
  domain: "exemple.fr",
  costCapUsd: 1,
};

// Étapes exécutées en ligne, sans Inngest. Progression muette.
const runStep = (_id: string, fn: () => unknown) => Promise.resolve(fn()) as never;
const silent = { update: async () => undefined, feed: async () => undefined } as never;

function setup() {
  const f = fakeSupabase({ audits: [{ id: "a1", workspace_id: "w1", links_state: null }] });
  return f;
}

describe("état des lieux : Search Console (MQ.2)", () => {
  it("un site connecté : ses requêtes réelles sont dans l'état de l'audit", async () => {
    const f = setup();
    const out = await executeLinksState(
      { service: () => f.client, dfs: () => emptyDfs, searchConsole: async () => snapshot },
      run,
      runStep,
      silent,
    );
    expect(out.state.searchConsole).toEqual(snapshot);
    expect(f.tables.audits?.[0]?.links_state).toMatchObject({
      searchConsole: { queries: [{ key: "cloportes" }] },
    });
  });

  it("un site non connecté : pas d'erreur, Search Console à null", async () => {
    const f = setup();
    const out = await executeLinksState(
      { service: () => f.client, dfs: () => emptyDfs, searchConsole: async () => null },
      run,
      runStep,
      silent,
    );
    expect(out.state.searchConsole).toBeNull();
  });
});
