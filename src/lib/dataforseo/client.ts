import { z } from "zod";
import { env, EnvError, requireEnv } from "@/env";
import { logger } from "@/lib/logger";
import { recordCost, type CostClient } from "@/lib/costs";
import { createServiceClient } from "@/lib/supabase/service";
import { cacheKey, SupabaseCache, type CacheStore } from "./cache";
import {
  endpoints,
  type EndpointInput,
  type EndpointKey,
  type EndpointResult,
  type EndpointSpec,
} from "./endpoints";
import { responseEnvelope } from "./schemas";

export const PROVIDER = "dataforseo";
export const DEFAULT_BASE_URL = "https://api.dataforseo.com";
const DAY = 86_400;
/** Durée de vie du cache par défaut : 7 jours (SERP, Labs, Backlinks) ; 1 jour pour OnPage. */
const DEFAULT_TTL_SECONDS = 7 * DAY;
const TTL_BY_ENDPOINT: Partial<Record<EndpointKey, number>> = { onpageInstantPages: DAY };

export class DataForSeoError extends Error {
  constructor(
    message: string,
    public readonly kind: "http" | "api" | "task" | "pending" | "invalid",
    public readonly code?: number,
  ) {
    super(message);
    this.name = "DataForSeoError";
  }
}

/** Levée AVANT l'appel quand l'estimation dépasse un plafond : rien n'est facturé. */
export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public readonly estimatedCostUsd: number,
    public readonly limitUsd: number,
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export type DataForSeoAuth = { login: string; password: string } | "proxy";

export type DataForSeoClientOptions = {
  /** Client service_role : écrit cost_ledger. Obligatoire, tout appel payant est journalisé. */
  costClient: CostClient;
  /** Identifiants ; "proxy" = aucun identifiant envoyé (un proxy injecte l'authentification). */
  auth: DataForSeoAuth | (() => DataForSeoAuth);
  cache?: CacheStore;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Nouvelles tentatives sur 429 / 5xx (défaut 2). */
  maxRetries?: number;
  /** Plafond de dépense cumulée de CE client (estimations, USD). */
  budgetUsd?: number;
  /** Plafond par appel (estimation, USD). */
  maxCostPerCallUsd?: number;
};

export type CallOptions = {
  workspaceId?: string | null;
  auditId?: string | null;
  /** Ignore le cache en lecture (la réponse fraîche est tout de même stockée). */
  bypassCache?: boolean;
  ttlSeconds?: number;
};

export type CallOutput<K extends EndpointKey> = {
  /** Premier élément de tasks[0].result, validé par zod. */
  result: EndpointResult<K> | null;
  /** Identifiant de tâche (utile en mode différé). */
  taskId: string | null;
  estimatedCostUsd: number;
  /** Coût réel renvoyé par l'API (0 si servi par le cache). */
  actualCostUsd: number;
  cacheHit: boolean;
};

function authHeader(auth: DataForSeoAuth): Record<string, string> {
  if (auth === "proxy") return {};
  return {
    Authorization: `Basic ${Buffer.from(`${auth.login}:${auth.password}`).toString("base64")}`,
  };
}

export function createDataForSeoClient(options: DataForSeoClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const maxRetries = options.maxRetries ?? 2;
  let spentEstimateUsd = 0;

  async function http(spec: EndpointSpec<z.ZodType, z.ZodType>, params: unknown): Promise<unknown> {
    const auth = typeof options.auth === "function" ? options.auth() : options.auth;
    const url = baseUrl + spec.path(params);
    const init: RequestInit = {
      method: spec.method,
      headers: {
        ...authHeader(auth),
        ...(spec.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(spec.method === "POST" ? { body: JSON.stringify([spec.body!(params)]) } : {}),
    };
    for (let attempt = 0; ; attempt++) {
      let res: Response | null = null;
      try {
        res = await fetchImpl(url, init);
      } catch (e) {
        if (attempt >= maxRetries) {
          throw new DataForSeoError(`${spec.name} : réseau (${(e as Error).message})`, "http");
        }
      }
      if (res) {
        if (res.ok) return res.json();
        const retryable = res.status === 429 || res.status >= 500;
        if (!retryable || attempt >= maxRetries) {
          throw new DataForSeoError(`${spec.name} : HTTP ${res.status}`, "http", res.status);
        }
      }
      await sleep(500 * 2 ** attempt);
    }
  }

  /** Valide l'enveloppe, vérifie les statuts et extrait (tâche, coût réel). */
  function parseEnvelope(spec: EndpointSpec<z.ZodType, z.ZodType>, raw: unknown) {
    const parsedEnv = responseEnvelope.safeParse(raw);
    if (!parsedEnv.success) {
      throw new DataForSeoError(`${spec.name} : enveloppe inattendue`, "invalid");
    }
    const e = parsedEnv.data;
    // 20000 = ok ; 401xx = authentification ; 402xx / 40501... = paramètres ou solde.
    if (e.status_code !== 20000) {
      throw new DataForSeoError(
        `${spec.name} : ${e.status_message ?? "erreur API"} (${e.status_code})`,
        "api",
        e.status_code,
      );
    }
    const task = e.tasks?.[0];
    if (!task) throw new DataForSeoError(`${spec.name} : aucune tâche renvoyée`, "invalid");
    if (task.status_code === 40602) {
      throw new DataForSeoError(`${spec.name} : tâche pas encore prête`, "pending", 40602);
    }
    if (task.status_code !== spec.okStatus) {
      throw new DataForSeoError(
        `${spec.name} : ${task.status_message ?? "erreur de tâche"} (${task.status_code})`,
        "task",
        task.status_code,
      );
    }
    return { task, actualCostUsd: task.cost ?? e.cost ?? 0 };
  }

  async function call<K extends EndpointKey>(
    key: K,
    input: EndpointInput<K>,
    opts: CallOptions = {},
  ): Promise<CallOutput<K>> {
    const spec = endpoints[key] as unknown as EndpointSpec<z.ZodType, z.ZodType>;
    const params = spec.params.parse(input);
    const estimatedCostUsd = spec.estimate(params);

    const key64 = cacheKey(spec.name, params);
    const useCache = spec.cacheable && options.cache;
    let envelope: unknown = null;
    let cacheHit = false;

    if (useCache && !opts.bypassCache) {
      let hit: Awaited<ReturnType<CacheStore["get"]>> = null;
      try {
        hit = await options.cache!.get(key64);
      } catch (e) {
        // Un cache en panne ne doit pas bloquer l'audit : on appelle l'API.
        logger.warn("dataforseo : cache non lu", { endpoint: spec.name, error: String(e) });
      }
      if (hit) {
        envelope = hit.response;
        cacheHit = true;
      }
    }

    if (!cacheHit) {
      if (options.maxCostPerCallUsd !== undefined && estimatedCostUsd > options.maxCostPerCallUsd) {
        throw new BudgetExceededError(
          `${spec.name} : coût estimé ${estimatedCostUsd} USD au-dessus du plafond par appel (${options.maxCostPerCallUsd} USD)`,
          estimatedCostUsd,
          options.maxCostPerCallUsd,
        );
      }
      if (
        options.budgetUsd !== undefined &&
        spentEstimateUsd + estimatedCostUsd > options.budgetUsd
      ) {
        throw new BudgetExceededError(
          `${spec.name} : budget du client dépassé (${spentEstimateUsd} déjà engagés + ${estimatedCostUsd} > ${options.budgetUsd} USD)`,
          estimatedCostUsd,
          options.budgetUsd,
        );
      }
      envelope = await http(spec, params);
    }

    const { task, actualCostUsd: paid } = parseEnvelope(spec, envelope);
    const actualCostUsd = cacheHit ? 0 : paid;
    const first = task.result?.[0];

    const journal = async () => {
      try {
        await recordCost(options.costClient, {
          workspaceId: opts.workspaceId,
          auditId: opts.auditId,
          provider: PROVIDER,
          operation: spec.name,
          units: 1,
          estimatedCostUsd: cacheHit ? 0 : estimatedCostUsd,
          actualCostUsd,
          metadata: { cacheHit, cacheKey: key64, taskId: task.id ?? null },
        });
      } catch (e) {
        // La réponse est déjà payée : on ne la jette pas, mais l'échec est bruyant.
        logger.error("dataforseo : coût non journalisé", { endpoint: spec.name, error: String(e) });
      }
    };

    // Un résultat absent est valide (ex. aucun backlink) ; un résultat présent doit respecter le schéma.
    // Si la réponse payée est invalide, le coût est quand même journalisé (jamais d'appel payant hors cost_ledger).
    let parsed: unknown = null;
    if (first != null) {
      const check = spec.result.safeParse(first);
      if (!check.success) {
        if (!cacheHit) {
          spentEstimateUsd += Math.max(estimatedCostUsd, paid);
          await journal();
        }
        throw new DataForSeoError(
          `${spec.name} : résultat inattendu (${check.error.message})`,
          "invalid",
        );
      }
      parsed = check.data;
    }

    if (!cacheHit) {
      spentEstimateUsd += Math.max(estimatedCostUsd, paid);
      // Cache AVANT le journal : une réponse payée n'est jamais perdue.
      if (useCache) {
        try {
          await options.cache!.set(key64, {
            endpoint: spec.name,
            params,
            response: envelope,
            costUsd: paid,
            ttlSeconds: opts.ttlSeconds ?? TTL_BY_ENDPOINT[key] ?? DEFAULT_TTL_SECONDS,
          });
        } catch (e) {
          logger.warn("dataforseo : cache non écrit", { endpoint: spec.name, error: String(e) });
        }
      }
    }

    await journal();

    return {
      result: parsed as EndpointResult<K> | null,
      taskId: task.id ?? null,
      estimatedCostUsd,
      actualCostUsd,
      cacheHit,
    };
  }

  return {
    call,
    /** SERP Google organique, top `depth` (défaut 30), France / français par défaut. */
    serpOrganicLive: (p: EndpointInput<"serpOrganicLive">, o?: CallOptions) =>
      call("serpOrganicLive", p, o),
    /** Mode différé : poste la tâche (moins cher), récupère plus tard avec serpOrganicTaskGet. */
    serpOrganicTaskPost: (p: EndpointInput<"serpOrganicTaskPost">, o?: CallOptions) =>
      call("serpOrganicTaskPost", p, o),
    /** Lève DataForSeoError de kind "pending" si la tâche n'est pas encore prête. */
    serpOrganicTaskGet: (id: string, o?: CallOptions) => call("serpOrganicTaskGet", { id }, o),
    labsRankedKeywords: (p: EndpointInput<"labsRankedKeywords">, o?: CallOptions) =>
      call("labsRankedKeywords", p, o),
    labsCompetitorsDomain: (p: EndpointInput<"labsCompetitorsDomain">, o?: CallOptions) =>
      call("labsCompetitorsDomain", p, o),
    backlinksSummary: (p: EndpointInput<"backlinksSummary">, o?: CallOptions) =>
      call("backlinksSummary", p, o),
    backlinksReferringDomains: (p: EndpointInput<"backlinksReferringDomains">, o?: CallOptions) =>
      call("backlinksReferringDomains", p, o),
    backlinksBacklinks: (p: EndpointInput<"backlinksBacklinks">, o?: CallOptions) =>
      call("backlinksBacklinks", p, o),
    backlinksDomainIntersection: (
      p: EndpointInput<"backlinksDomainIntersection">,
      o?: CallOptions,
    ) => call("backlinksDomainIntersection", p, o),
    onpageInstantPages: (p: EndpointInput<"onpageInstantPages">, o?: CallOptions) =>
      call("onpageInstantPages", p, o),
    /** Dépense estimée cumulée de ce client (USD). */
    get spentEstimateUsd() {
      return spentEstimateUsd;
    },
  };
}

export type DataForSeoClient = ReturnType<typeof createDataForSeoClient>;

/**
 * Client prêt à l'emploi pour le serveur : service_role + cache Postgres + identifiants
 * lus dans l'environnement AU MOMENT DE L'USAGE (erreur claire s'ils manquent).
 */
export function createDataForSeoClientFromEnv(
  overrides: Partial<DataForSeoClientOptions> = {},
): DataForSeoClient {
  const costClient = overrides.costClient ?? createServiceClient();
  return createDataForSeoClient({
    costClient,
    cache: new SupabaseCache(costClient),
    auth: () => {
      if (env.DATAFORSEO_PROXY_AUTH) {
        if (env.NODE_ENV === "production") {
          throw new EnvError([
            "DATAFORSEO_PROXY_AUTH : interdit en production, fournir DATAFORSEO_LOGIN et DATAFORSEO_PASSWORD",
          ]);
        }
        return "proxy";
      }
      return { login: requireEnv("DATAFORSEO_LOGIN"), password: requireEnv("DATAFORSEO_PASSWORD") };
    },
    ...overrides,
  });
}
