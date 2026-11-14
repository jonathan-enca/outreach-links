import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { startOfUtcDay } from "./config";

type Client = SupabaseClient<Database>;

/** Anti-abus de l'audit gratuit : hachage des identifiants, limitation de débit, coupe-circuit. */

/** Hachage HMAC (jamais d'IP ni d'email en clair dans les tables d'anti-abus). */
export function hashKey(value: string, salt: string): string {
  return createHmac("sha256", salt).update(value.trim().toLowerCase()).digest("hex");
}

/** Premier élément de x-forwarded-for (Vercel), sinon x-real-ip, sinon "inconnu". */
export function requesterIp(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip")?.trim() || "inconnu";
}

export interface RateRule {
  limit: number;
  windowSeconds: number;
}

export interface RateResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Limitation de débit dans Postgres (fonction rate_limit_hit, atomique). En cas de panne
 * de la base on REFUSE (échec fermé) : mieux vaut bloquer que laisser filer une dépense.
 */
export async function rateLimit(
  service: Client,
  bucket: string,
  keyHash: string,
  rule: RateRule,
): Promise<RateResult> {
  const { data, error } = await service.rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });
  const row = data?.[0];
  if (error || !row) {
    logger.error("rate_limit_hit : refus par prudence", { bucket, error: error?.message });
    return { allowed: false, retryAfterSeconds: 60 };
  }
  return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
}

export type BreakerState =
  | { open: false; spentUsd: number }
  | { open: true; reason: "desactive" | "plafond_jour" | "indisponible"; spentUsd: number | null };

export interface BreakerOptions {
  enabled: boolean;
  dailyCapUsd: number;
  /** Coût estimé du nouvel audit : la dépense du jour + cette estimation ne doit pas dépasser le plafond. */
  estimateUsd: number;
  now?: Date;
}

/**
 * Coupe-circuit de dépense : somme du cost_ledger des audits publics depuis minuit UTC.
 * Ouvert (= audit gratuit désactivé) si l'interrupteur est coupé, si la dépense plus
 * l'estimation dépasse le plafond journalier, ou si la dépense est illisible.
 */
export async function checkCircuitBreaker(
  service: Client,
  opts: BreakerOptions,
): Promise<BreakerState> {
  if (!opts.enabled) return { open: true, reason: "desactive", spentUsd: null };
  const { data, error } = await service.rpc("public_audit_spend_since", {
    p_since: startOfUtcDay(opts.now).toISOString(),
  });
  if (error || data === null || data === undefined) {
    logger.error("coupe-circuit : dépense illisible, audit gratuit fermé", {
      error: error?.message,
    });
    return { open: true, reason: "indisponible", spentUsd: null };
  }
  const spentUsd = Number(data);
  if (spentUsd + opts.estimateUsd > opts.dailyCapUsd + 1e-9) {
    return { open: true, reason: "plafond_jour", spentUsd };
  }
  return { open: false, spentUsd };
}
