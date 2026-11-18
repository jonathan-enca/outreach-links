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
  /**
   * Profondeur de réflexion des modèles Anthropic récents (Haiku 5.5, Sonnet 5.5, Opus 5.5), qui
   * réfléchissent avant de répondre. La réflexion est comptée dans `maxOutputTokens`. Ignoré ailleurs.
   */
  effort?: "low" | "medium" | "high";
  /**
   * Met la consigne système en cache chez Anthropic (génération 5) : relue à 10 % du prix d'entrée dans
   * les cinq minutes. À réserver aux consignes longues et identiques d'un appel à l'autre.
   */
  cacheSystem?: boolean;
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
  /** Le modèle a refusé de répondre (classifieur de sécurité) : aucune sortie exploitable. */
  refused?: boolean;
};

function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

const apiError = z.looseObject({
  error: z.looseObject({ type: z.string().optional(), message: z.string().optional() }),
});

async function readJson(res: Response, provider: string): Promise<unknown> {
  if (!res.ok) {
    // Le corps d'erreur peut citer la requête : on ne garde que le statut. Exception : une requête
    // refusée pour sa forme (400), dont le début du motif dit quel paramètre corriger.
    let detail = "";
    if (res.status === 400) {
      const parsed = apiError.safeParse(await res.json().catch(() => null));
      if (parsed.success) {
        const e = parsed.data.error;
        detail = ` (${[e.type, e.message?.slice(0, 160)].filter(Boolean).join(" : ")})`;
      }
    }
    throw new LlmError(`${provider} : HTTP ${res.status}${detail}`, "http", res.status);
  }
  return res.json();
}

const anthropicReply = z.looseObject({
  model: z.string().nullish(),
  stop_reason: z.string().nullish(),
  content: z.array(
    z.looseObject({
      type: z.string(),
      input: z.unknown().optional(),
      text: z.string().optional(),
    }),
  ),
  usage: z.looseObject({
    input_tokens: z.number(),
    output_tokens: z.number(),
    cache_creation_input_tokens: z.number().nullish(),
    cache_read_input_tokens: z.number().nullish(),
  }),
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

/**
 * Modèles Anthropic d'avant la génération 5 : sortie structurée par outil forcé, température réglable.
 * Les modèles récents refusent l'un ou l'autre (HTTP 400) : ils passent par `output_config.format`.
 */
export function isLegacyAnthropicModel(model: string): boolean {
  return /^claude-(3|haiku-4|sonnet-4|opus-4)/.test(model);
}

const UNSUPPORTED_SCHEMA_KEYS = [
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minItems",
  "maxItems",
  "pattern",
  "format",
  "default",
];

/**
 * Schéma accepté par les sorties structurées d'Anthropic : sans contraintes de longueur ni de bornes
 * (elles restent vérifiées par zod après l'appel), et `additionalProperties: false` sur chaque objet.
 */
export function structuredOutputSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(structuredOutputSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (UNSUPPORTED_SCHEMA_KEYS.includes(k)) continue;
    out[k] =
      k === "properties" && v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>).map(([n, p]) => [
              n,
              structuredOutputSchema(p),
            ]),
          )
        : structuredOutputSchema(v);
  }
  if (out.type === "object") out.additionalProperties = false;
  return out;
}

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
      const headers = {
        "content-type": "application/json",
        "x-api-key": auth.apiKey,
        "anthropic-version": "2023-06-01",
      };
      if (!isLegacyAnthropicModel(model)) {
        // Génération 5 : ni outil forcé ni température (HTTP 400). Le JSON est contraint par
        // `output_config.format` et revient dans un bloc de texte, après d'éventuels blocs de réflexion.
        const res = await fetchImpl(API.anthropic, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            max_tokens: maxOutputTokens,
            system: o.cacheSystem
              ? [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }]
              : o.system,
            messages: [{ role: "user", content: o.prompt }],
            output_config: {
              effort: o.effort ?? "low",
              format: { type: "json_schema", schema: structuredOutputSchema(js) },
            },
          }),
        });
        const body = anthropicReply.parse(await readJson(res, "anthropic"));
        const usage = {
          // Jetons d'entrée au prix plein : écriture du cache à 125 %, lecture à 10 %.
          inputTokens: Math.round(
            body.usage.input_tokens +
              1.25 * (body.usage.cache_creation_input_tokens ?? 0) +
              0.1 * (body.usage.cache_read_input_tokens ?? 0),
          ),
          outputTokens: body.usage.output_tokens,
          model: body.model ?? model,
        };
        // Un refus est une réponse 200 facturée : le coût est journalisé, puis l'appel échoue.
        if (body.stop_reason === "refusal") return { ...usage, text: "", refused: true };
        const text = body.content
          .filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join("");
        return { ...usage, text, truncated: body.stop_reason === "max_tokens" };
      }
      const res = await fetchImpl(API.anthropic, {
        method: "POST",
        headers,
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
    if (raw.refused) throw new LlmError(`${options.provider} : refus du modèle`, "refusal");
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

export function pickProvider(): LlmProvider {
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
