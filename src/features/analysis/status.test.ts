import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { loadAnalysisSnapshot } from "./status";

type Call = { table: string; method: string; args: unknown[] };

const row = (i: number) => ({ domain: `cible-${i}.test`, site_type: null, why: null });

/**
 * Faux client Supabase : chaque appel de méthode est enregistré. Les lectures renvoient
 * toutes les cibles fournies, donc le tri et l'absence de limite se vérifient dans les appels.
 */
function fakeSupabase(targets: unknown[]) {
  const calls: Call[] = [];
  const result = (table: string) => {
    if (table === "audits")
      return {
        data: {
          id: "a1",
          site_id: "s1",
          analysis_status: "en_cours",
          analysis_error: null,
          analysis_started_at: null,
          analysis_confirmed_at: null,
          analysis_finished_at: null,
          sites: { domain: "exemple.test" },
        },
        error: null,
      };
    if (table === "qualified_targets_v")
      return { data: targets, count: targets.length, error: null };
    if (table === "analysis_steps") return { data: [], error: null };
    return { data: null, error: null };
  };
  const chain = (table: string): unknown =>
    new Proxy(function () {}, {
      get(_fn, prop) {
        if (prop === "then") {
          const r = result(table);
          return (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
            Promise.resolve(r).then(ok, ko);
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: String(prop), args });
          return prop === "maybeSingle" ? Promise.resolve(result(table)) : chain(table);
        };
      },
    });
  const client = { from: (table: string) => chain(table) } as unknown as SupabaseClient<Database>;
  return { calls, client };
}

describe("loadAnalysisSnapshot : cibles de l'écran d'analyse", () => {
  it("lit toutes les cibles validées, sans limite, la plus récente en premier", async () => {
    const { calls, client } = fakeSupabase(Array.from({ length: 9 }, (_, i) => row(i + 1)));

    const snap = await loadAnalysisSnapshot(client, "a1");

    const targetCalls = calls.filter((c) => c.table === "qualified_targets_v");
    expect(targetCalls.some((c) => c.method === "limit")).toBe(false);
    expect(targetCalls).toContainEqual({
      table: "qualified_targets_v",
      method: "order",
      args: ["created_at", { ascending: false }],
    });
    expect(snap?.targets).toHaveLength(9);
    expect(snap?.targetsCount).toBe(9);
  });
});
