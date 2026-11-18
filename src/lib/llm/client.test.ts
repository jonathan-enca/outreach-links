import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { costUsd, priceFor } from "./pricing";
import {
  createLlmClient,
  isLegacyAnthropicModel,
  LlmBudgetExceededError,
  LlmError,
  structuredOutputSchema,
} from "./client";

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

describe("client LLM Anthropic, modèles de génération 5", () => {
  const reply = (over: Record<string, unknown> = {}) =>
    json({
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      // La réflexion précède le texte : la réponse se lit par type de bloc, jamais par position.
      content: [
        { type: "thinking", thinking: "", signature: "abc" },
        { type: "text", text: '{"summary":"ok"}' },
      ],
      usage: { input_tokens: 1000, output_tokens: 500 },
      ...over,
    });

  it("distingue les anciens modèles des nouveaux", () => {
    expect(isLegacyAnthropicModel("claude-haiku-4-5")).toBe(true);
    expect(isLegacyAnthropicModel("claude-haiku-4-5-20251001")).toBe(true);
    expect(isLegacyAnthropicModel("claude-sonnet-4-5")).toBe(true);
    expect(isLegacyAnthropicModel("claude-haiku-5-5")).toBe(false);
    expect(isLegacyAnthropicModel("claude-opus-5-5")).toBe(false);
  });

  it("demande le JSON par output_config, sans outil forcé ni température", async () => {
    const { client, fetchImpl, db } = setup("anthropic", reply, { model: "claude-opus-5-5" });
    const out = await client.generate({ ...call, effort: "medium", temperature: 0.7 });
    expect(out.data).toEqual({ summary: "ok" });
    const body = JSON.parse(String((fetchImpl.mock.calls[0]![1] as RequestInit).body));
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.output_config.effort).toBe("medium");
    expect(body.output_config.format).toEqual({
      type: "json_schema",
      schema: {
        type: "object",
        properties: { summary: { type: "string" } },
        required: ["summary"],
        additionalProperties: false,
      },
    });
    for (const k of ["temperature", "tools", "tool_choice", "thinking"])
      expect(body).not.toHaveProperty(k);
    // 1000 jetons en entrée à 4 USD et 500 en sortie à 20 USD par million.
    expect(out.costUsd).toBeCloseTo(0.014, 6);
    expect(db.tables.cost_ledger![0]).toMatchObject({ operation: "llm.audit_summary" });
  });

  it("met la consigne système en cache sur demande et compte les jetons du cache au bon prix", async () => {
    const { client, fetchImpl } = setup(
      "anthropic",
      () =>
        reply({
          usage: {
            input_tokens: 200,
            output_tokens: 500,
            cache_creation_input_tokens: 400,
            cache_read_input_tokens: 4000,
          },
        }),
      { model: "claude-opus-5-5" },
    );
    const out = await client.generate({ ...call, cacheSystem: true });
    const body = JSON.parse(String((fetchImpl.mock.calls[0]![1] as RequestInit).body));
    expect(body.system).toEqual([
      { type: "text", text: call.system, cache_control: { type: "ephemeral" } },
    ]);
    // 200 + 1,25 × 400 + 0,1 × 4 000 = 1 100 jetons d'entrée à 4 USD, 500 en sortie à 20 USD par million.
    expect(out.inputTokens).toBe(1100);
    expect(out.costUsd).toBeCloseTo(0.0144, 6);
  });

  it("un refus du modèle est une erreur, et son coût est journalisé", async () => {
    const { client, db } = setup(
      "anthropic",
      () => reply({ stop_reason: "refusal", content: [] }),
      {
        model: "claude-haiku-5-5",
      },
    );
    await expect(client.generate(call)).rejects.toMatchObject({ kind: "refusal" });
    expect(db.tables.cost_ledger).toHaveLength(1);
  });

  it("une sortie coupée par la limite de jetons est refusée", async () => {
    const { client } = setup("anthropic", () => reply({ stop_reason: "max_tokens" }), {
      model: "claude-haiku-5-5",
    });
    await expect(client.generate(call)).rejects.toMatchObject({ kind: "invalid" });
  });

  it("retire du schéma les contraintes que l'API refuse, à tous les niveaux", () => {
    const js = z.toJSONSchema(
      z.object({
        verdict: z.enum(["a", "b"]),
        motif: z.string().min(1).max(10),
        pages: z.array(z.string().max(5)).max(3),
        sous: z.object({ n: z.number().int().min(0).max(9) }).nullable(),
      }),
      { target: "draft-7" },
    );
    const text = JSON.stringify(structuredOutputSchema(js));
    for (const k of ["minLength", "maxLength", "maxItems", "minimum", "maximum"])
      expect(text).not.toContain(k);
    expect(text).toContain('"enum":["a","b"]');
    expect(text.match(/"additionalProperties":false/g)).toHaveLength(2);
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
