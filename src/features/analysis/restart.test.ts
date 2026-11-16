import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { t } from "@/lib/messages";
import { relaunchStalled, restartFromStep } from "./restart";
import { ANALYSIS_EVENT } from "./service";

const AUDIT = {
  id: "audit-1",
  workspace_id: "ws-1",
  analysis_status: "echoue",
  analysis_confirmed_at: "2026-11-17T09:00:00.000Z",
  cost_cap_usd: 2,
};

function setup(audit: Record<string, unknown> = {}, extra: Record<string, unknown[]> = {}) {
  const rpc = vi.fn<(name: string, args: unknown) => { data: unknown; error: null }>(() => ({
    data: null,
    error: null,
  }));
  const f = fakeSupabase(
    {
      audits: [{ ...AUDIT, ...audit }],
      cost_ledger: [],
      events: [],
      analysis_steps: [],
      ...(extra as Record<string, Record<string, unknown>[]>),
    },
    { rpc },
  );
  const send = vi.fn(async () => {});
  return { ...f, rpc, send };
}

describe("restartFromStep : « Reprendre à partir d'ici »", () => {
  it("remet l'étape et les suivantes à zéro (une seule fonction SQL), puis envoie UN événement neuf", async () => {
    const { client, tables, rpc, send } = setup();
    const res = await restartFromStep(client, "audit-1", "recherche", send, "user-1");
    expect(res).toMatchObject({ status: "ok", message: t.analysis.messages.restarted });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]).toEqual([
      "analysis_reset_steps",
      { p_audit: "audit-1", p_steps: ["recherche", "tri", "contacts", "constats", "demandes"] },
    ]);
    const audit = tables.audits![0]!;
    expect(audit.analysis_status).toBe("confirme");
    expect(audit.analysis_confirmed_at).not.toBe(AUDIT.analysis_confirmed_at);
    expect(send).toHaveBeenCalledWith({
      id: `analysis-audit-1-${audit.analysis_confirmed_at}`,
      name: ANALYSIS_EVENT,
      data: { auditId: "audit-1" },
    });
    expect(tables.events!.map((e) => e.type)).toEqual(["analysis.restarted"]);
  });

  it("refuse tant que l'analyse tourne, une étape inconnue, l'état des lieux, et une analyse jamais lancée", async () => {
    for (const status of ["confirme", "en_cours"]) {
      const s = setup({ analysis_status: status });
      const res = await restartFromStep(s.client, "audit-1", "tri", s.send, "user-1");
      expect(res).toMatchObject({ status: "error", message: t.analysis.messages.restartRunning });
      expect(s.rpc).not.toHaveBeenCalled();
      expect(s.send).not.toHaveBeenCalled();
    }
    for (const key of ["etat_des_lieux", "nimporte"]) {
      const s = setup();
      const res = await restartFromStep(s.client, "audit-1", key, s.send, "user-1");
      expect(res).toMatchObject({
        status: "error",
        message: t.analysis.messages.restartUnknownStep,
      });
    }
    const never = setup({ analysis_status: "aucun" });
    expect(await restartFromStep(never.client, "audit-1", "tri", never.send, "u")).toMatchObject({
      status: "error",
    });
    const anon = setup();
    expect(await restartFromStep(anon.client, "audit-1", "tri", anon.send, null)).toMatchObject({
      status: "error",
      message: t.analysis.messages.unauthenticated,
    });
  });

  it("n'efface rien si le plafond de l'audit est déjà atteint", async () => {
    const { client, rpc, send } = setup(
      {},
      { cost_ledger: [{ audit_id: "audit-1", estimated_cost_usd: 2, actual_cost_usd: 2 }] },
    );
    const res = await restartFromStep(client, "audit-1", "recherche", send, "user-1");
    expect(res).toMatchObject({ status: "error", message: t.analysis.messages.overCap });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("une reprise réussie d'une analyse terminée est possible aussi", async () => {
    const { client, send } = setup({ analysis_status: "termine" });
    expect((await restartFromStep(client, "audit-1", "constats", send, "u")).status).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("relaunchStalled : démarrage bloqué", () => {
  const now = () => new Date("2026-11-17T09:03:00.000Z");

  it("confirmée depuis plus de 2 minutes sans étape : nouveau jeton, nouvel événement", async () => {
    const { client, tables, send } = setup({ analysis_status: "confirme" });
    const res = await relaunchStalled(client, "audit-1", send, "user-1", { now });
    expect(res.status).toBe("ok");
    expect(tables.audits![0]!.analysis_confirmed_at).toBe("2026-11-17T09:03:00.000Z");
    expect(send).toHaveBeenCalledWith({
      id: "analysis-audit-1-2026-11-17T09:03:00.000Z",
      name: ANALYSIS_EVENT,
      data: { auditId: "audit-1" },
    });
  });

  it("ne relance pas si c'est récent, si une étape a démarré, ou si l'analyse n'est pas « confirmée »", async () => {
    const recent = setup({
      analysis_status: "confirme",
      analysis_confirmed_at: "2026-11-17T09:02:00.000Z",
    });
    await relaunchStalled(recent.client, "audit-1", recent.send, "u", { now });
    const started = setup(
      { analysis_status: "confirme" },
      { analysis_steps: [{ audit_id: "audit-1", key: "comprendre", status: "en_cours" }] },
    );
    await relaunchStalled(started.client, "audit-1", started.send, "u", { now });
    const running = setup({ analysis_status: "en_cours" });
    await relaunchStalled(running.client, "audit-1", running.send, "u", { now });
    for (const s of [recent, started, running]) expect(s.send).not.toHaveBeenCalled();
  });
});
