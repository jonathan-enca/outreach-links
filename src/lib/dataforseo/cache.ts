import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

/** JSON stable : clés triées, pour qu'un même jeu de paramètres donne toujours la même clé. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Clé de cache : sha256(endpoint + paramètres normalisés), 64 caractères hexadécimaux. */
export function cacheKey(endpoint: string, normalizedParams: unknown): string {
  return createHash("sha256")
    .update(`${endpoint}\n${stableStringify(normalizedParams)}`)
    .digest("hex");
}

export type CacheEntry = {
  response: unknown;
  /** Coût payé lors de l'appel d'origine, en USD. */
  costUsd: number;
  /** Date de l'appel d'origine (ISO), si le cache la connaît. */
  createdAt?: string;
};

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>;
  set(
    key: string,
    entry: CacheEntry & { endpoint: string; params: unknown; ttlSeconds: number },
  ): Promise<void>;
}

/** Cache en mémoire (tests, scripts). */
export class MemoryCache implements CacheStore {
  readonly entries = new Map<string, CacheEntry & { expiresAt: number; createdAt: string }>();
  constructor(private readonly now: () => number = Date.now) {}

  async get(key: string) {
    const e = this.entries.get(key);
    if (!e || e.expiresAt <= this.now()) return null;
    return { response: e.response, costUsd: e.costUsd, createdAt: e.createdAt };
  }

  async set(
    key: string,
    entry: CacheEntry & { endpoint: string; params: unknown; ttlSeconds: number },
  ) {
    this.entries.set(key, {
      response: entry.response,
      costUsd: entry.costUsd,
      createdAt: new Date(this.now()).toISOString(),
      expiresAt: this.now() + entry.ttlSeconds * 1000,
    });
  }
}

/** Cache Postgres (table dataforseo_cache, service_role uniquement). */
export class SupabaseCache implements CacheStore {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async get(key: string): Promise<CacheEntry | null> {
    const { data, error } = await this.client
      .from("dataforseo_cache")
      .select("response, cost_usd, created_at")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw new Error(`dataforseo_cache (lecture) : ${error.message}`);
    return data
      ? { response: data.response, costUsd: Number(data.cost_usd), createdAt: data.created_at }
      : null;
  }

  async set(
    key: string,
    entry: CacheEntry & { endpoint: string; params: unknown; ttlSeconds: number },
  ): Promise<void> {
    const { error } = await this.client.from("dataforseo_cache").upsert({
      cache_key: key,
      endpoint: entry.endpoint,
      params: entry.params as Json,
      response: entry.response as Json,
      cost_usd: entry.costUsd,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + entry.ttlSeconds * 1000).toISOString(),
    });
    if (error) throw new Error(`dataforseo_cache (écriture) : ${error.message}`);
  }
}
