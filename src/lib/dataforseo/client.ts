import { z } from "zod";
import { env, EnvError, requireEnv } from "@/env";
import { logger } from "@/lib/logger";
import { recordCost, type CostClient } from "@/lib/costs";
import { createServiceClient } from "@/lib/supabase/service";
import { isTestDomain } from "@/features/sites/test-domains";
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
  /**
   * Décide, appel par appel, d'ignorer le cache en lecture (ex. sites de test). `{ notBefore }` :
   * seules les réponses mises en cache APRÈS cette date sont relues (reprise d'un même audit sans
   * repayer, alors qu'un nouvel audit repart de zéro).
   */
  shouldBypassCache?: (opts: CallOptions) => Promise<CachePolicy>;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Nouvelles tentatives sur 429 / 5xx (défaut 2). */
  maxRetries?: number;
  /**
   * Délai maximal d'UN appel HTTP (défaut 60 s) : le même appel Content Analysis a duré 46 s pour 3
   * résultats en production ; sans limite, un appel bloqué figerait l'analyse. Un dépassement est une
   * erreur réseau (nouvelle tentative, puis `DataForSeoError` de type « http »).
   */
  timeoutMs?: number;
  /** Plafond de dépense cumulée de CE client (estimations, USD). */
  budgetUsd?: number;
  /** Plafond par appel (estimation, USD). */
  maxCostPerCallUsd?: number;
};

export type CachePolicy = boolean | { notBefore: string };

export type CallOptions = {
  workspaceId?: string | null;
  auditId?: string | null;
  /** Audit gratuit public (coûts rattachés par public_audit_id). */
  publicAuditId?: string | null;
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
  const timeoutMs = options.timeoutMs ?? 60_000;
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
    // Content Analysis (150 lignes) a répondu en 130 à 140 s au run réel du 17/11 : 60 s le tuait à tort.
    const callTimeoutMs = spec.name.startsWith("content")
      ? Math.max(timeoutMs, 240_000)
      : timeoutMs;
    for (let attempt = 0; ; attempt++) {
      let res: Response | null = null;
      try {
        res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(callTimeoutMs) });
      } catch (e) {
        // Délai dépassé : pas de nouvelle tentative ici (trois fois 60 s = trois minutes dans UN step) ;
        // l'appelant décide (nouvelles tentatives espacées, puis appel « manqué »).
        if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") {
          throw new DataForSeoError(
            `${spec.name} : délai dépassé (${callTimeoutMs / 1000} s)`,
            "http",
          );
        }
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

    let bypass = opts.bypassCache === true;
    let notBefore: number | null = null;
    if (useCache && !bypass && options.shouldBypassCache) {
      try {
        const policy = await options.shouldBypassCache(opts);
        if (typeof policy === "boolean") bypass = policy;
        else {
          const ms = Date.parse(policy.notBefore);
          // Une date illisible ne doit jamais ouvrir le cache : on repart de zéro.
          if (Number.isFinite(ms)) notBefore = ms;
          else bypass = true;
        }
      } catch (e) {
        logger.warn("dataforseo : politique de cache non lue", { error: String(e) });
      }
    }

    if (useCache && !bypass) {
      let hit: Awaited<ReturnType<CacheStore["get"]>> = null;
      try {
        hit = await options.cache!.get(key64);
      } catch (e) {
        // Un cache en panne ne doit pas bloquer l'audit : on appelle l'API.
        logger.warn("dataforseo : cache non lu", { endpoint: spec.name, error: String(e) });
      }
      if (hit && notBefore !== null) {
        const at = hit.createdAt ? Date.parse(hit.createdAt) : NaN;
        if (!Number.isFinite(at) || at < notBefore) hit = null;
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
          publicAuditId: opts.publicAuditId,
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
    backlinksBulkReferringDomains: (
      p: EndpointInput<"backlinksBulkReferringDomains">,
      o?: CallOptions,
    ) => call("backlinksBulkReferringDomains", p, o),
    backlinksReferringDomains: (p: EndpointInput<"backlinksReferringDomains">, o?: CallOptions) =>
      call("backlinksReferringDomains", p, o),
    backlinksBacklinks: (p: EndpointInput<"backlinksBacklinks">, o?: CallOptions) =>
      call("backlinksBacklinks", p, o),
    backlinksDomainIntersection: (
      p: EndpointInput<"backlinksDomainIntersection">,
      o?: CallOptions,
    ) => call("backlinksDomainIntersection", p, o),
    /** Content Analysis `search` (MT.3) : pages qui parlent d'un sujet, filtrables par type de page. */
    contentAnalysisSearch: (p: EndpointInput<"contentAnalysisSearch">, o?: CallOptions) =>
      call("contentAnalysisSearch", p, o),
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
    shouldBypassCache: testDomainCachePolicy(),
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

/**
 * Sites de test : chaque audit repart de zéro (la réponse fraîche est tout de même stockée). MU.1 :
 * un audit relit seulement ce qu'il a lui-même payé, c'est-à-dire les réponses mises en cache depuis
 * sa création : reprendre une analyse interrompue ne repaie rien, lancer un nouvel audit repaie tout.
 * Résolution du domaine par audit, mémorisée pour la durée du client.
 */
function testDomainCachePolicy(): (opts: CallOptions) => Promise<CachePolicy> {
  const memo = new Map<string, CachePolicy>();
  return async (opts) => {
    const ref = opts.auditId
      ? ({ table: "audits", id: opts.auditId, col: "site_id" } as const)
      : opts.publicAuditId
        ? ({ table: "public_audits", id: opts.publicAuditId, col: "domain" } as const)
        : null;
    if (!ref) return false;
    const k = `${ref.table}:${ref.id}`;
    const known = memo.get(k);
    if (known !== undefined) return known;
    const db = createServiceClient();
    let domain: string | null = null;
    let createdAt: string | null = null;
    if (ref.table === "public_audits") {
      const { data } = await db
        .from("public_audits")
        .select("domain")
        .eq("id", ref.id)
        .maybeSingle();
      domain = data?.domain ?? null;
    } else {
      const { data } = await db
        .from("audits")
        .select("created_at, sites(domain)")
        .eq("id", ref.id)
        .maybeSingle();
      domain = (data?.sites as { domain: string } | null)?.domain ?? null;
      createdAt = data?.created_at ?? null;
    }
    const result: CachePolicy = !isTestDomain(domain)
      ? false
      : createdAt
        ? { notBefore: createdAt }
        : true;
    memo.set(k, result);
    return result;
  };
}
