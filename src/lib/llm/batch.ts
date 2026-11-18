import { z } from "zod";
import { env, requireEnv } from "@/env";
import { recordCost, type CostClient } from "@/lib/costs";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_MODELS, LlmError } from "./client";
import { batchCostUsd, BATCH_DISCOUNT, estimateCostUsd } from "./pricing";

/**
 * API par lots d'Anthropic (Message Batches), pour les appels qui n'ont pas besoin d'une réponse
 * immédiate (jugement des lots d'arrière-plan). Mêmes paramètres qu'un appel direct (outil forcé,
 * même schéma), 50 % du tarif. Jamais d'attente bloquante ici : `submit` envoie, `status` lit l'état,
 * `results` récupère ; c'est l'appelant (Inngest) qui attend entre deux lectures avec `step.sleep`.
 * Le coût RÉEL de chaque réponse réussie est journalisé dans `cost_ledger` (une ligne par requête).
 */

const API = "https://api.anthropic.com/v1/messages/batches";

export interface BatchRequest {
  /** Identifiant libre (lettres, chiffres, _ et -), rendu avec la réponse. */
  customId: string;
  system: string;
  prompt: string;
  schema: z.ZodType;
  schemaName: string;
  maxOutputTokens: number;
  temperature?: number;
}

export type BatchOutcome =
  | { ok: true; data: unknown; inputTokens: number; outputTokens: number; costUsd: number }
  | { ok: false; error: string };

export interface BatchStatus {
  /** `termine` : tous les résultats sont disponibles (réussis, en erreur, expirés ou annulés). */
  state: "en_cours" | "termine";
  processing: number;
  succeeded: number;
  failed: number;
}

export interface BatchScope {
  workspaceId: string | null;
  auditId: string | null;
  /** Nom court de la tâche : devient `llm.<task>.batch` dans cost_ledger. */
  task: string;
}

export interface LlmBatchClient {
  readonly model: string;
  /** Pire coût d'une requête (USD, tarif des lots), pour planifier avant d'envoyer. */
  estimateUsd(promptChars: number, maxOutputTokens: number): number;
  submit(requests: readonly BatchRequest[]): Promise<{ id: string }>;
  status(id: string): Promise<BatchStatus>;
  results(
    id: string,
    requests: readonly BatchRequest[],
    scope: BatchScope,
  ): Promise<Map<string, BatchOutcome>>;
  cancel(id: string): Promise<void>;
}

const counts = z.looseObject({
  processing: z.number().default(0),
  succeeded: z.number().default(0),
  errored: z.number().default(0),
  canceled: z.number().default(0),
  expired: z.number().default(0),
});
const batchReply = z.looseObject({
  id: z.string(),
  processing_status: z.string(),
  request_counts: counts.optional(),
});
const resultLine = z.looseObject({
  custom_id: z.string(),
  result: z.looseObject({
    type: z.string(),
    message: z
      .looseObject({
        model: z.string().nullish(),
        stop_reason: z.string().nullish(),
        content: z.array(z.looseObject({ type: z.string(), input: z.unknown().optional() })),
        usage: z.looseObject({ input_tokens: z.number(), output_tokens: z.number() }),
      })
      .optional(),
    error: z.unknown().optional(),
  }),
});

export function createAnthropicBatchClient(options: {
  apiKey: () => string;
  model?: string;
  costClient: CostClient;
  fetchImpl?: typeof fetch;
}): LlmBatchClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? DEFAULT_MODELS.anthropic;
  const headers = () => ({
    "content-type": "application/json",
    "x-api-key": options.apiKey(),
    "anthropic-version": "2023-06-01",
  });
  const call = async (url: string, init: RequestInit = {}) => {
    const res = await fetchImpl(url, { ...init, headers: { ...headers(), ...init.headers } });
    // Le corps d'erreur peut citer la requête : on ne garde que le statut.
    if (!res.ok) throw new LlmError(`anthropic (lots) : HTTP ${res.status}`, "http", res.status);
    return res;
  };
  const estimateUsd = (promptChars: number, maxOutputTokens: number) =>
    Math.round(estimateCostUsd(model, promptChars, maxOutputTokens) * BATCH_DISCOUNT * 1e6) / 1e6;
  const toolName = (r: BatchRequest) => r.schemaName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60);

  return {
    model,
    estimateUsd,
    async submit(requests) {
      const body = {
        requests: requests.map((r) => {
          const js = z.toJSONSchema(r.schema, { target: "draft-7" }) as Record<string, unknown>;
          delete js.$schema;
          return {
            custom_id: r.customId,
            params: {
              model,
              max_tokens: r.maxOutputTokens,
              temperature: r.temperature ?? 0,
              system: r.system,
              messages: [{ role: "user", content: r.prompt }],
              tools: [
                {
                  name: toolName(r),
                  description: "Renvoie le résultat structuré.",
                  input_schema: js,
                },
              ],
              tool_choice: { type: "tool", name: toolName(r) },
            },
          };
        }),
      };
      const res = await call(API, { method: "POST", body: JSON.stringify(body) });
      return { id: batchReply.parse(await res.json()).id };
    },
    async status(id) {
      const b = batchReply.parse(await (await call(`${API}/${encodeURIComponent(id)}`)).json());
      const c = counts.parse(b.request_counts ?? {});
      return {
        state: b.processing_status === "ended" ? "termine" : "en_cours",
        processing: c.processing,
        succeeded: c.succeeded,
        failed: c.errored + c.canceled + c.expired,
      };
    },
    async results(id, requests, scope) {
      const res = await call(`${API}/${encodeURIComponent(id)}/results`);
      const byId = new Map(requests.map((r) => [r.customId, r]));
      const out = new Map<string, BatchOutcome>();
      for (const line of (await res.text()).split("\n")) {
        if (!line.trim()) continue;
        const parsedLine = resultLine.safeParse(JSON.parse(line));
        if (!parsedLine.success) continue;
        const { custom_id: customId, result } = parsedLine.data;
        const req = byId.get(customId);
        if (!req || out.has(customId)) continue;
        if (result.type !== "succeeded" || !result.message) {
          out.set(customId, { ok: false, error: `lot : requête ${result.type}` });
          continue;
        }
        const m = result.message;
        const usedModel = m.model ?? model;
        const cost = batchCostUsd(usedModel, m.usage.input_tokens, m.usage.output_tokens);
        // La requête réussie est payée même si sa sortie est ensuite refusée : coût journalisé d'abord.
        try {
          await recordCost(options.costClient, {
            workspaceId: scope.workspaceId,
            auditId: scope.auditId,
            provider: "anthropic",
            operation: `llm.${scope.task}.batch`,
            units: m.usage.input_tokens + m.usage.output_tokens,
            estimatedCostUsd: estimateUsd(
              req.system.length + req.prompt.length,
              req.maxOutputTokens,
            ),
            actualCostUsd: cost,
            metadata: {
              model: usedModel,
              batch: true,
              batchId: id,
              customId,
              inputTokens: m.usage.input_tokens,
              outputTokens: m.usage.output_tokens,
            },
          });
        } catch (e) {
          // Résultats relus (étape rejouée) : la ligne existe déjà, index unique `cost_ledger_batch_request_key`.
          if (!/duplicate key|23505/.test((e as Error).message))
            logger.error("llm (lots) : coût non journalisé", { error: (e as Error).message });
        }
        if (m.stop_reason === "max_tokens") {
          out.set(customId, { ok: false, error: "sortie tronquée (limite de jetons atteinte)" });
          continue;
        }
        const tool = m.content.find((c) => c.type === "tool_use");
        const parsed = tool ? req.schema.safeParse(tool.input ?? null) : null;
        if (!parsed?.success) {
          out.set(customId, { ok: false, error: "sortie non conforme au schéma" });
          continue;
        }
        out.set(customId, {
          ok: true,
          data: parsed.data,
          inputTokens: m.usage.input_tokens,
          outputTokens: m.usage.output_tokens,
          costUsd: cost,
        });
      }
      return out;
    },
    async cancel(id) {
      await call(`${API}/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    },
  };
}

/** Client de lots de l'environnement ; null hors Anthropic, sans clé, ou si l'interrupteur est coupé. */
export function createBatchClientFromEnv(model?: string): LlmBatchClient | null {
  if (env.LLM_BATCH_JUDGEMENT === "off") return null;
  const provider = env.LLM_PROVIDER ?? (env.ANTHROPIC_API_KEY ? "anthropic" : null);
  if (provider !== "anthropic" || !env.ANTHROPIC_API_KEY) return null;
  return createAnthropicBatchClient({
    apiKey: () => requireEnv("ANTHROPIC_API_KEY"),
    model: model ?? env.LLM_MODEL,
    costClient: createServiceClient(),
  });
}
