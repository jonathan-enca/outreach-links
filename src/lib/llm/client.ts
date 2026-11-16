import { z } from "zod";
import { env, EnvError, requireEnv } from "@/env";
import { recordCost, type CostClient } from "@/lib/costs";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { costUsd, estimateCostUsd } from "./pricing";

/**
 * Client LLM abstrait (M1.5) : Anthropic (cible) et OpenAI (développement), sortie
 * structurée validée par zod, coût journalisé dans cost_ledger pour CHAQUE appel.
 * Pas de SDK : fetch direct, pour rester léger et testable avec un faux fetch.
 */

export const LLM_PROVIDERS = ["anthropic", "openai"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
};

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly kind: "http" | "invalid" | "refusal" | "config",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/** Levée AVANT l'appel quand l'estimation dépasse un plafond : rien n'est facturé. */
export class LlmBudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly estimatedCostUsd: number,
    public readonly limitUsd: number,
  ) {
    super(message);
    this.name = "LlmBudgetExceededError";
  }
}

export type LlmAuth = { apiKey: string } | "proxy";

export interface LlmClientOptions {
  /** Client service_role : écrit cost_ledger. Obligatoire. */
  costClient: CostClient;
  provider: LlmProvider;
  model?: string;
  auth: LlmAuth | (() => LlmAuth);
  fetchImpl?: typeof fetch;
  /** Plafond de dépense cumulée de CE client (USD, estimations avant, réel après). */
  budgetUsd?: number;
  /** Plafond par appel (estimation, USD). */
  maxCostPerCallUsd?: number;
}

export interface LlmCallOptions<T extends z.ZodType> {
  /** Nom court de la tâche : devient `llm.<task>` dans cost_ledger. */
  task: string;
  system: string;
  prompt: string;
  schema: T;
  /** Nom du schéma envoyé au fournisseur (lettres, chiffres, _). */
  schemaName?: string;
  maxOutputTokens?: number;
  temperature?: number;
  workspaceId?: string | null;
  auditId?: string | null;
}

export interface LlmOutput<T extends z.ZodType> {
  data: z.output<T>;
  provider: LlmProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const API = {
  anthropic: "https://api.anthropic.com/v1/messages",
  openai: "https://api.openai.com/v1/chat/completions",
} as const;

type Raw = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  /** Le modèle s'est arrêté faute de jetons de sortie : la réponse est incomplète. */
  truncated?: boolean;
};

function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

async function readJson(res: Response, provider: string): Promise<unknown> {
  if (!res.ok) {
    // Le corps d'erreur peut citer la requête : on ne garde que le statut.
    throw new LlmError(`${provider} : HTTP ${res.status}`, "http", res.status);
  }
  return res.json();
}

const anthropicReply = z.looseObject({
  model: z.string().nullish(),
  stop_reason: z.string().nullish(),
  content: z.array(z.looseObject({ type: z.string(), input: z.unknown().optional() })),
  usage: z.looseObject({ input_tokens: z.number(), output_tokens: z.number() }),
});

const openaiReply = z.looseObject({
  model: z.string().nullish(),
  choices: z.array(
    z.looseObject({
      finish_reason: z.string().nullish(),
      message: z.looseObject({
        content: z.string().nullish(),
        refusal: z.string().nullish(),
      }),
    }),
  ),
  usage: z.looseObject({ prompt_tokens: z.number(), completion_tokens: z.number() }),
});

export function createLlmClient(options: LlmClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? DEFAULT_MODELS[options.provider];
  let spentUsd = 0;

  async function callProvider<T extends z.ZodType>(
    o: LlmCallOptions<T>,
    maxOutputTokens: number,
  ): Promise<Raw> {
    const auth = typeof options.auth === "function" ? options.auth() : options.auth;
    const name = (o.schemaName ?? o.task).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60);
    const js = jsonSchemaOf(o.schema);
    if (options.provider === "anthropic") {
      if (auth === "proxy") throw new LlmError("Anthropic exige une clé API", "config");
      const res = await fetchImpl(API.anthropic, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": auth.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens,
          temperature: o.temperature ?? 0.2,
          system: o.system,
          messages: [{ role: "user", content: o.prompt }],
          tools: [{ name, description: "Renvoie le résultat structuré.", input_schema: js }],
          tool_choice: { type: "tool", name },
        }),
      });
      const body = anthropicReply.parse(await readJson(res, "anthropic"));
      const tool = body.content.find((c) => c.type === "tool_use");
      if (!tool) throw new LlmError("anthropic : aucune sortie structurée", "invalid");
      return {
        text: JSON.stringify(tool.input ?? null),
        inputTokens: body.usage.input_tokens,
        outputTokens: body.usage.output_tokens,
        model: body.model ?? model,
        truncated: body.stop_reason === "max_tokens",
      };
    }
    const res = await fetchImpl(API.openai, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(auth === "proxy" ? {} : { authorization: `Bearer ${auth.apiKey}` }),
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxOutputTokens,
        temperature: o.temperature ?? 0.2,
        messages: [
          { role: "system", content: o.system },
          { role: "user", content: o.prompt },
        ],
        response_format: { type: "json_schema", json_schema: { name, schema: js, strict: false } },
      }),
    });
    const body = openaiReply.parse(await readJson(res, "openai"));
    const choice = body.choices[0];
    if (choice?.message.refusal) throw new LlmError("openai : refus du modèle", "refusal");
    if (!choice?.message.content) throw new LlmError("openai : réponse vide", "invalid");
    return {
      text: choice.message.content,
      inputTokens: body.usage.prompt_tokens,
      outputTokens: body.usage.completion_tokens,
      model: body.model ?? model,
    };
  }

  /** Appel structuré : plafond vérifié avant, JSON validé par zod, coût réel journalisé après. */
  async function generate<T extends z.ZodType>(o: LlmCallOptions<T>): Promise<LlmOutput<T>> {
    const maxOutputTokens = o.maxOutputTokens ?? 800;
    const estimate = estimateCostUsd(model, o.system.length + o.prompt.length, maxOutputTokens);
    if (options.maxCostPerCallUsd !== undefined && estimate > options.maxCostPerCallUsd) {
      throw new LlmBudgetExceededError(
        `Appel LLM refusé : estimation ${estimate} USD > plafond par appel ${options.maxCostPerCallUsd} USD`,
        estimate,
        options.maxCostPerCallUsd,
      );
    }
    if (options.budgetUsd !== undefined && spentUsd + estimate > options.budgetUsd + 1e-9) {
      throw new LlmBudgetExceededError(
        `Appel LLM refusé : ${spentUsd} USD engagés + ${estimate} > budget ${options.budgetUsd} USD`,
        estimate,
        options.budgetUsd,
      );
    }
    const raw = await callProvider(o, maxOutputTokens);
    const actual = costUsd(raw.model, raw.inputTokens, raw.outputTokens);
    spentUsd += actual;
    // Le coût est journalisé même si la sortie est ensuite invalide : l'appel est payé.
    try {
      await recordCost(options.costClient, {
        workspaceId: o.workspaceId ?? null,
        auditId: o.auditId ?? null,
        provider: options.provider,
        operation: `llm.${o.task}`,
        units: raw.inputTokens + raw.outputTokens,
        estimatedCostUsd: estimate,
        actualCostUsd: actual,
        metadata: {
          model: raw.model,
          inputTokens: raw.inputTokens,
          outputTokens: raw.outputTokens,
        },
      });
    } catch (e) {
      logger.error("llm : coût non journalisé", { task: o.task, error: (e as Error).message });
    }
    // Essai du 17/11 : Haiku s'arrêtait à la limite de jetons et renvoyait `{}` (12 lots sur 12 perdus).
    if (raw.truncated) {
      throw new LlmError(
        `${options.provider} : sortie tronquée (limite de jetons atteinte)`,
        "invalid",
      );
    }
    let json: unknown;
    try {
      json = JSON.parse(raw.text);
    } catch {
      throw new LlmError(`${options.provider} : JSON invalide`, "invalid");
    }
    const parsed = o.schema.safeParse(json);
    if (!parsed.success) {
      throw new LlmError(
        `${options.provider} : sortie non conforme au schéma (${parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")} : ${i.code} ${i.message}`.slice(0, 120))
          .join(" ; ")}) début : ${raw.text.slice(0, 160).replace(/\s+/g, " ")}`,
        "invalid",
      );
    }
    return {
      data: parsed.data,
      provider: options.provider,
      model: raw.model,
      inputTokens: raw.inputTokens,
      outputTokens: raw.outputTokens,
      costUsd: actual,
    };
  }

  return {
    provider: options.provider,
    model,
    generate,
    get spentUsd() {
      return spentUsd;
    },
  };
}

export type LlmClient = ReturnType<typeof createLlmClient>;

function pickProvider(): LlmProvider {
  if (env.LLM_PROVIDER) return env.LLM_PROVIDER;
  if (env.ANTHROPIC_API_KEY) return "anthropic";
  if (env.OPENAI_API_KEY || env.LLM_PROXY_AUTH) return "openai";
  return "anthropic";
}

/** Choix du fournisseur depuis l'environnement ; erreur claire si aucune clé n'est configurée. */
export function createLlmClientFromEnv(overrides: Partial<LlmClientOptions> = {}): LlmClient {
  const provider = overrides.provider ?? pickProvider();
  return createLlmClient({
    costClient: overrides.costClient ?? createServiceClient(),
    provider,
    model: env.LLM_MODEL,
    auth: () => {
      if (provider === "openai" && env.LLM_PROXY_AUTH) {
        if (env.NODE_ENV === "production") {
          throw new EnvError([
            "LLM_PROXY_AUTH : interdit en production, fournir OPENAI_API_KEY ou ANTHROPIC_API_KEY",
          ]);
        }
        return "proxy";
      }
      return {
        apiKey: requireEnv(provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"),
      };
    },
    ...overrides,
  });
}
