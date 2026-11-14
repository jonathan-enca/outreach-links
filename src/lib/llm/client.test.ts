import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { costUsd, priceFor } from "./pricing";
import { createLlmClient, LlmBudgetExceededError, LlmError } from "./client";

const WS = "22222222-2222-4222-8222-222222222222";
const AUDIT = "11111111-1111-4111-8111-111111111111";
const schema = z.object({ summary: z.string() });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function setup(provider: "anthropic" | "openai", reply: () => Response, extra = {}) {
  const db = fakeSupabase({ cost_ledger: [] });
  const fetchImpl = vi.fn<typeof fetch>(async () => reply());
  const client = createLlmClient({
    costClient: db.client,
    provider,
    auth: { apiKey: "cle-de-test" },
    fetchImpl: fetchImpl as unknown as typeof fetch,
    ...extra,
  });
  return { db, fetchImpl, client };
}

const call = {
  task: "audit_summary",
  system: "Tu résumes.",
  prompt: "Données.",
  schema,
  workspaceId: WS,
  auditId: AUDIT,
};

describe("pricing", () => {
  it("calcule le coût à partir des jetons", () => {
    expect(costUsd("gpt-4o-mini", 1_000_000, 1_000_000)).toBeCloseTo(0.75, 6);
    expect(costUsd("claude-haiku-4-5", 1000, 1000)).toBeCloseTo(0.006, 6);
  });
  it("reconnaît un modèle daté, et applique un tarif prudent à un inconnu", () => {
    expect(priceFor("gpt-4o-mini-2024-07-18")).toEqual(priceFor("gpt-4o-mini"));
    expect(priceFor("modele-inconnu").inputPerMTok).toBeGreaterThan(
      priceFor("gpt-4o-mini").inputPerMTok,
    );
  });
});

describe("client LLM OpenAI", () => {
  const ok = () =>
    json({
      model: "gpt-4o-mini-2024-07-18",
      choices: [{ finish_reason: "stop", message: { content: '{"summary":"ok"}' } }],
      usage: { prompt_tokens: 1000, completion_tokens: 200 },
    });

  it("renvoie une sortie validée par zod et journalise le coût réel", async () => {
    const { client, db, fetchImpl } = setup("openai", ok);
    const out = await client.generate(call);
    expect(out.data).toEqual({ summary: "ok" });
    expect(out.costUsd).toBeCloseTo(costUsd("gpt-4o-mini", 1000, 200), 6);
    const row = db.tables.cost_ledger![0]!;
    expect(row).toMatchObject({
      provider: "openai",
      operation: "llm.audit_summary",
      workspace_id: WS,
      audit_id: AUDIT,
      units: 1200,
    });
    expect(Number(row.actual_cost_usd)).toBeGreaterThan(0);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api.openai.com/v1/chat/completions");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer cle-de-test");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.schema.properties.summary).toBeTruthy();
  });
  it("n'envoie aucune clé en mode proxy", async () => {
    const db = fakeSupabase({ cost_ledger: [] });
    const fetchImpl = vi.fn<typeof fetch>(async () => ok());
    const client = createLlmClient({
      costClient: db.client,
      provider: "openai",
      auth: "proxy",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.generate(call);
    const headers = (fetchImpl.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });
  it("rejette une sortie non conforme, mais le coût est journalisé (l'appel est payé)", async () => {
    const { client, db } = setup("openai", () =>
      json({
        choices: [{ message: { content: '{"autre":1}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    );
    await expect(client.generate(call)).rejects.toMatchObject({ kind: "invalid" });
    expect(db.tables.cost_ledger).toHaveLength(1);
  });
  it("rejette un JSON invalide, un refus et une erreur HTTP", async () => {
    const bad = setup("openai", () =>
      json({
        choices: [{ message: { content: "pas du json" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    await expect(bad.client.generate(call)).rejects.toBeInstanceOf(LlmError);
    const refusal = setup("openai", () =>
      json({
        choices: [{ message: { content: null, refusal: "non" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    await expect(refusal.client.generate(call)).rejects.toMatchObject({ kind: "refusal" });
    const http = setup("openai", () => json({ error: { message: "secret" } }, 500));
    const err = await http.client.generate(call).catch((e: Error) => e);
    expect(err).toMatchObject({ kind: "http", status: 500 });
    expect((err as Error).message).not.toContain("secret");
    expect(http.db.tables.cost_ledger).toHaveLength(0);
  });
});

describe("client LLM Anthropic", () => {
  it("utilise un outil forcé pour la sortie structurée", async () => {
    const { client, fetchImpl, db } = setup("anthropic", () =>
      json({
        model: "claude-haiku-4-5",
        content: [{ type: "tool_use", name: "audit_summary", input: { summary: "ok" } }],
        usage: { input_tokens: 500, output_tokens: 100 },
      }),
    );
    const out = await client.generate(call);
    expect(out.data).toEqual({ summary: "ok" });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("cle-de-test");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.tool_choice).toEqual({ type: "tool", name: "audit_summary" });
    expect(body.tools[0].input_schema.type).toBe("object");
    expect(db.tables.cost_ledger![0]).toMatchObject({ provider: "anthropic" });
  });
  it("refuse une réponse sans sortie structurée", async () => {
    const { client } = setup("anthropic", () =>
      json({ content: [{ type: "text" }], usage: { input_tokens: 1, output_tokens: 1 } }),
    );
    await expect(client.generate(call)).rejects.toMatchObject({ kind: "invalid" });
  });
});

describe("plafonds", () => {
  const ok = () =>
    json({
      choices: [{ message: { content: '{"summary":"ok"}' } }],
      usage: { prompt_tokens: 1000, completion_tokens: 200 },
    });
  it("refuse AVANT l'appel si l'estimation dépasse le plafond par appel", async () => {
    const { client, fetchImpl, db } = setup("openai", ok, { maxCostPerCallUsd: 1e-9 });
    await expect(client.generate(call)).rejects.toBeInstanceOf(LlmBudgetExceededError);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(db.tables.cost_ledger).toHaveLength(0);
  });
  it("cumule la dépense et refuse quand le budget est épuisé", async () => {
    const { client, fetchImpl } = setup("openai", ok, { budgetUsd: 0.001 });
    await client.generate({ ...call, maxOutputTokens: 100 });
    expect(client.spentUsd).toBeGreaterThan(0);
    await expect(client.generate({ ...call, maxOutputTokens: 1500 })).rejects.toBeInstanceOf(
      LlmBudgetExceededError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
