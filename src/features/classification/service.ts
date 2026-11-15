import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { LlmClient } from "@/lib/llm/client";
import type { Database } from "@/lib/supabase/database.types";
import { applyEffects, decideAction } from "./actions";
import { classifyReply, isTransient } from "./classify";
import { CLASSIFY_LIMITS, type Classification } from "./types";

type Db = SupabaseClient<Database>;

export interface ClassifyDeps {
  db: Db;
  /** Créé à la demande : aucun client LLM n'est construit s'il n'y a rien à classer. */
  llm: () => LlmClient;
  now?: () => Date;
}

export interface ClassifyOutcome {
  examined: number;
  classified: number;
  waiting: number;
  byCategory: Record<string, number>;
  costUsd: number;
}

/**
 * Classe les messages entrants non traités (M5.1). Idempotent : les effets de bord sont rejouables
 * et la classification est unique par message. Une panne du modèle laisse le message en attente
 * (jamais de catégorie inventée) ; une sortie invalide donne « ambigu » à relire.
 */
export async function runClassifyTick(deps: ClassifyDeps): Promise<ClassifyOutcome> {
  const { db } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const out: ClassifyOutcome = { examined: 0, classified: 0, waiting: 0, byCategory: {}, costUsd: 0 };

  const { data: rows, error } = await db
    .from("inbound_messages")
    .select("*")
    .is("classified_at", null)
    .order("created_at", { ascending: true })
    .limit(CLASSIFY_LIMITS.maxPerTick);
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return out;

  let llm: LlmClient | null = null;
  const getLlm = () => (llm ??= deps.llm());

  for (const row of rows) {
    out.examined++;
    const { data: sent } = await db
      .from("sent_messages")
      .select("id, to_email")
      .eq("id", row.sent_message_id)
      .single();
    let result: Classification;
    try {
      result = await classifyReply(
        // Le client n'est demandé que si une règle ne tranche pas.
        lazyLlm(getLlm),
        {
          inboundKind: row.kind as "reponse" | "rebond" | "reponse_automatique",
          subject: row.subject,
          body: row.body_excerpt,
          fromEmail: row.from_email,
        },
        { workspaceId: row.workspace_id },
      );
    } catch (e) {
      if (!isTransient(e)) throw e;
      out.waiting++;
      logger.warn("classification : message laissé en attente", {
        inbound_message_id: row.id,
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    const plan = decideAction(result);
    const postponeUntil = await applyEffects(db, plan, {
      workspaceId: row.workspace_id,
      sentMessageId: row.sent_message_id,
      toEmail: sent?.to_email ?? null,
      fromEmail: row.from_email,
      now,
    });

    const ins = await db.from("reply_classifications").insert({
      workspace_id: row.workspace_id,
      inbound_message_id: row.id,
      sent_message_id: row.sent_message_id,
      category: result.category,
      confidence: result.confidence,
      justification: result.justification,
      source: result.source,
      needs_review: result.needsReview || plan.status === "proposee",
      injection_suspected: result.injectionSuspected,
      proposed_action: plan.action,
      action_status: plan.status,
      follow_up_not_before: postponeUntil ? postponeUntil.toISOString() : null,
      model: result.model,
      cost_usd: result.costUsd,
    });
    if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
    await db.from("inbound_messages").update({ classified_at: now.toISOString() }).eq("id", row.id);

    if (!ins.error) {
      out.classified++;
      out.byCategory[result.category] = (out.byCategory[result.category] ?? 0) + 1;
      out.costUsd += result.costUsd;
      await db.from("events").insert({
        workspace_id: row.workspace_id,
        type: plan.alert ? "reply.complaint" : "reply.classified",
        payload: {
          inbound_message_id: row.id,
          category: result.category,
          source: result.source,
          action: plan.action,
          action_status: plan.status,
          injection_suspected: result.injectionSuspected,
        } as never,
      });
    }
  }
  return out;
}

/** Façade : ne construit le client LLM (donc ne lit la clé) qu'au premier appel réel. */
function lazyLlm(get: () => LlmClient): LlmClient {
  return new Proxy({} as LlmClient, {
    get: (_t, prop) => (get() as unknown as Record<string | symbol, unknown>)[prop],
  });
}
