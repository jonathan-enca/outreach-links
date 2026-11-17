import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createAnthropicBatchClient, type BatchRequest } from "./batch";
import { batchCostUsd, costUsd } from "./pricing";

const schema = z.object({ ok: z.boolean() });
const req = (customId: string): BatchRequest => ({
  customId,
  system: "sys",
  prompt: "p",
  schema,
  schemaName: "qualification",
  maxOutputTokens: 100,
  temperature: 0,
});

const line = (customId: string, over: object = {}) =>
  JSON.stringify({
    custom_id: customId,
    result: {
      type: "succeeded",
      message: {
        model: "claude-haiku-4-5",
        stop_reason: "tool_use",
        content: [{ type: "tool_use", input: { ok: true } }],
        usage: { input_tokens: 4800, output_tokens: 660 },
        ...over,
      },
    },
  });

function setup(responses: Record<string, () => Response>) {
  const calls: { url: string; method: string; body?: string; key?: string }[] = [];
  const ledger: Record<string, unknown>[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      method: init.method ?? "GET",
      body: init.body as string | undefined,
      key: (init.headers as Record<string, string>)["x-api-key"],
    });
    const key = Object.keys(responses).find((k) => url.endsWith(k))!;
    return responses[key]!();
  }) as unknown as typeof fetch;
  const costClient = {
    from: () => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            const meta = row.metadata as { batchId: string; customId: string };
            if (ledger.some((r) => (r.metadata as typeof meta).customId === meta.customId))
              return {
                data: null,
                error: { message: "duplicate key value violates unique constraint" },
              };
            ledger.push(row);
            return { data: { id: ledger.length, ...row }, error: null };
          },
        }),
      }),
    }),
  } as never;
  const client = createAnthropicBatchClient({
    apiKey: () => "k-test",
    model: "claude-haiku-4-5",
    costClient,
    fetchImpl,
  });
  return { client, calls, ledger };
}

describe("API par lots d'Anthropic", () => {
  it("tarif : exactement la moitié du tarif direct (entrée et sortie)", () => {
    expect(batchCostUsd("claude-haiku-4-5", 4800, 660)).toBeCloseTo(
      costUsd("claude-haiku-4-5", 4800, 660) / 2,
      6,
    );
  });

  it("envoi : mêmes paramètres qu'un appel direct (outil forcé, température 0), une requête par groupe", async () => {
    const { client, calls } = setup({
      "/messages/batches": () =>
        Response.json({ id: "msgbatch_1", processing_status: "in_progress" }),
    });
    expect(await client.submit([req("g0"), req("g1")])).toEqual({ id: "msgbatch_1" });
    expect(calls[0]).toMatchObject({ method: "POST", key: "k-test" });
    const body = JSON.parse(calls[0]!.body!);
    expect(body.requests).toHaveLength(2);
    expect(body.requests[0]).toMatchObject({
      custom_id: "g0",
      params: {
        model: "claude-haiku-4-5",
        max_tokens: 100,
        temperature: 0,
        tool_choice: { type: "tool", name: "qualification" },
      },
    });
  });

  it("état : en cours puis terminé", async () => {
    let state = "in_progress";
    const { client } = setup({
      "/msgbatch_1": () =>
        Response.json({
          id: "msgbatch_1",
          processing_status: state,
          request_counts: { processing: 1, succeeded: 2, errored: 1, canceled: 0, expired: 0 },
        }),
    });
    expect(await client.status("msgbatch_1")).toMatchObject({ state: "en_cours", failed: 1 });
    state = "ended";
    expect((await client.status("msgbatch_1")).state).toBe("termine");
  });

  it("résultats : coût réel à demi-tarif journalisé ; erreurs, troncature et sortie invalide sont des échecs sans exception", async () => {
    const text = [
      line("g0"),
      line("g1", { stop_reason: "max_tokens" }),
      line("g2", { content: [{ type: "tool_use", input: { ok: "non" } }] }),
      JSON.stringify({ custom_id: "g3", result: { type: "expired" } }),
    ].join("\n");
    const { client, ledger } = setup({ "/results": () => new Response(text) });
    const out = await client.results("msgbatch_1", [req("g0"), req("g1"), req("g2"), req("g3")], {
      workspaceId: null,
      auditId: null,
      task: "qualification",
    });
    expect(out.get("g0")).toMatchObject({ ok: true, data: { ok: true } });
    expect((out.get("g0") as { costUsd: number }).costUsd).toBeCloseTo(
      batchCostUsd("claude-haiku-4-5", 4800, 660),
      6,
    );
    expect(out.get("g1")).toMatchObject({ ok: false });
    expect(out.get("g2")).toMatchObject({ ok: false });
    expect(out.get("g3")).toMatchObject({ ok: false });
    // Payées : g0, g1, g2 (une requête qui a répondu est facturée) ; g3 a expiré, non facturée.
    expect(ledger.map((r) => (r.metadata as { customId: string }).customId)).toEqual([
      "g0",
      "g1",
      "g2",
    ]);
    expect(ledger[0]).toMatchObject({
      operation: "llm.qualification.batch",
      provider: "anthropic",
    });
  });

  it("résultats relus (étape rejouée) : aucune ligne de coût en double, mêmes réponses", async () => {
    const { client, ledger } = setup({ "/results": () => new Response(line("g0")) });
    const scope = { workspaceId: null, auditId: null, task: "qualification" };
    const first = await client.results("msgbatch_1", [req("g0")], scope);
    const second = await client.results("msgbatch_1", [req("g0")], scope);
    expect(ledger).toHaveLength(1);
    expect(second.get("g0")).toEqual(first.get("g0"));
  });

  it("erreur HTTP : seul le statut est gardé (le corps peut citer la requête)", async () => {
    const { client } = setup({
      "/msgbatch_1": () => new Response("secret prompt", { status: 529 }),
    });
    await expect(client.status("msgbatch_1")).rejects.toThrow("HTTP 529");
    await expect(client.status("msgbatch_1")).rejects.not.toThrow(/secret/);
  });
});
