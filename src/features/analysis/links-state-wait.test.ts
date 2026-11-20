import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { linksStateSettled } from "./links-state-wait";

function withStep(status: string | null) {
  const rows = status ? [{ audit_id: "a1", key: "etat_des_lieux", status }] : [];
  return fakeSupabase({ analysis_steps: rows });
}

describe("attente de l'état des lieux avant la recherche (MQ.4)", () => {
  it("fini (réussi ou échoué) : c'est settled", async () => {
    expect(await linksStateSettled(withStep("termine").client as never, "a1")).toBe(true);
    expect(await linksStateSettled(withStep("echoue").client as never, "a1")).toBe(true);
  });

  it("encore en cours, en attente ou absent : pas fini", async () => {
    expect(await linksStateSettled(withStep("en_cours").client as never, "a1")).toBe(false);
    expect(await linksStateSettled(withStep("attente").client as never, "a1")).toBe(false);
    expect(await linksStateSettled(withStep(null).client as never, "a1")).toBe(false);
  });
});
