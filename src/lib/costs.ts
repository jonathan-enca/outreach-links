import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";

/**
 * Journal des coûts. TOUT appel payant (DataForSEO, LLM, recherche d'emails) doit
 * passer par recordCost() : le coût par audit est le principal risque économique.
 */
export const costEntrySchema = z.object({
  /** Nul pour un appel système (ex. health). */
  workspaceId: z.uuid().nullish(),
  auditId: z.uuid().nullish(),
  /** Audit gratuit public (sans workspace) : base du coupe-circuit journalier. */
  publicAuditId: z.uuid().nullish(),
  provider: z.string().min(1).max(60),
  operation: z.string().min(1).max(120),
  units: z.number().nonnegative().default(1),
  /** Coût estimé en USD avant l'appel. */
  estimatedCostUsd: z.number().nonnegative().default(0),
  /** Coût réel en USD, si le fournisseur le renvoie. */
  actualCostUsd: z.number().nonnegative().nullish(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CostEntryInput = z.input<typeof costEntrySchema>;

export type CostLedgerRow = Database["public"]["Tables"]["cost_ledger"]["Row"];

/** Client Supabase à utiliser : service_role (la table n'accepte aucune écriture client). */
export type CostClient = SupabaseClient<Database>;

export async function recordCost(
  client: CostClient,
  input: CostEntryInput,
): Promise<CostLedgerRow> {
  const e = costEntrySchema.parse(input);
  const { data, error } = await client
    .from("cost_ledger")
    .insert({
      workspace_id: e.workspaceId ?? null,
      audit_id: e.auditId ?? null,
      public_audit_id: e.publicAuditId ?? null,
      provider: e.provider,
      operation: e.operation,
      units: e.units,
      estimated_cost_usd: e.estimatedCostUsd,
      actual_cost_usd: e.actualCostUsd ?? null,
      metadata: e.metadata as Json,
    })
    .select()
    .single();
  if (error) {
    logger.error("cost_ledger : écriture impossible", {
      provider: e.provider,
      operation: e.operation,
      error: error.message,
    });
    throw new Error(`recordCost : ${error.message}`);
  }
  logger.info("coût enregistré", {
    provider: e.provider,
    operation: e.operation,
    units: e.units,
    estimatedCostUsd: e.estimatedCostUsd,
    actualCostUsd: e.actualCostUsd ?? null,
    auditId: e.auditId ?? null,
  });
  return data;
}

/** Coût total (réel s'il existe, sinon estimé) d'un audit, en USD. */
export async function totalCostForAudit(client: CostClient, auditId: string): Promise<number> {
  const { data, error } = await client
    .from("cost_ledger")
    .select("estimated_cost_usd, actual_cost_usd")
    .eq("audit_id", auditId);
  if (error) throw new Error(`totalCostForAudit : ${error.message}`);
  return (data ?? []).reduce(
    (sum, r) => sum + Number(r.actual_cost_usd ?? r.estimated_cost_usd),
    0,
  );
}

/** Coût total (réel s'il existe, sinon estimé) d'un audit gratuit public, en USD. */
export async function totalCostForPublicAudit(
  client: CostClient,
  publicAuditId: string,
): Promise<number> {
  const { data, error } = await client
    .from("cost_ledger")
    .select("estimated_cost_usd, actual_cost_usd")
    .eq("public_audit_id", publicAuditId);
  if (error) throw new Error(`totalCostForPublicAudit : ${error.message}`);
  return (data ?? []).reduce(
    (sum, r) => sum + Number(r.actual_cost_usd ?? r.estimated_cost_usd),
    0,
  );
}

/** Dépenses d'API de toute la plateforme sur les 24 dernières heures (USD, réel sinon estimé). */
export async function dailySpendUsd(client: CostClient, now: Date = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("cost_ledger")
    .select("estimated_cost_usd, actual_cost_usd")
    .gte("created_at", since);
  if (error) throw new Error(`dailySpendUsd : ${error.message}`);
  return (data ?? []).reduce(
    (sum, r) => sum + Number(r.actual_cost_usd ?? r.estimated_cost_usd),
    0,
  );
}

/** Vrai si la plateforme a déjà dépensé le plafond quotidien de sécurité (aucun nouvel audit ni nouvelle étape). */
export async function dailyCapReached(
  client: CostClient,
  capUsd: number,
  now: Date = new Date(),
): Promise<boolean> {
  return (await dailySpendUsd(client, now)) >= capUsd;
}
