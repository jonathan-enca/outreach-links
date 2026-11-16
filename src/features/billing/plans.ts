import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export const BILLING_PLANS = ["gratuit", "starter", "pro", "business"] as const;
export type BillingPlanKey = (typeof BILLING_PLANS)[number];
export type PaidPlanKey = Exclude<BillingPlanKey, "gratuit">;

export function isBillingPlan(v: unknown): v is BillingPlanKey {
  return typeof v === "string" && (BILLING_PLANS as readonly string[]).includes(v);
}
export function isPaidPlan(v: unknown): v is PaidPlanKey {
  return v === "starter" || v === "pro" || v === "business";
}

/** Statuts Stripe qui donnent accès au plan payant. `past_due` garde l'accès (relance de paiement). */
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

export type SendDecision =
  | { allowed: true; plan: BillingPlanKey; used: number; cap: number }
  | { allowed: false; reason: "abonnement_requis" | "quota_mensuel"; plan: BillingPlanKey };

/** Début du mois civil UTC : fenêtre du plafond mensuel d'envois. */
export function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Plan effectif d'un workspace : l'abonnement seulement s'il est actif et non expiré. */
export async function effectivePlan(
  db: Client,
  workspaceId: string,
  now: Date,
): Promise<BillingPlanKey> {
  const { data } = await db
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data || !isPaidPlan(data.plan)) return "gratuit";
  if (!(ACTIVE_STATUSES as readonly string[]).includes(data.status)) return "gratuit";
  if (data.current_period_end && new Date(data.current_period_end) < now) return "gratuit";
  return data.plan;
}

/**
 * Autorise (ou non) UN envoi réel. Appliqué côté serveur, au moteur d'envoi : un workspace gratuit
 * n'envoie rien ; un abonné est plafonné par `plans.monthly_send_cap` (emails + réponses du mois).
 * Une lecture impossible du plan refuse (jamais d'envoi par défaut).
 */
export async function checkSendAllowance(
  db: Client,
  workspaceId: string,
  now: Date,
): Promise<SendDecision> {
  const plan = await effectivePlan(db, workspaceId, now);
  if (plan === "gratuit") return { allowed: false, reason: "abonnement_requis", plan };
  const { data: p } = await db
    .from("plans")
    .select("monthly_send_cap")
    .eq("key", plan)
    .maybeSingle();
  if (!p) return { allowed: false, reason: "abonnement_requis", plan: "gratuit" };
  const since = monthStart(now).toISOString();
  const real = ["en_cours", "envoye", "a_reessayer", "echec"];
  const [mails, replies] = await Promise.all([
    db
      .from("sent_messages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("dry_run", false)
      .in("status", real)
      .gte("claimed_at", since),
    db
      .from("reply_sends")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("dry_run", false)
      .in("status", real)
      .gte("claimed_at", since),
  ]);
  const used = (mails.data?.length ?? 0) + (replies.data?.length ?? 0);
  if (used >= p.monthly_send_cap) return { allowed: false, reason: "quota_mensuel", plan };
  return { allowed: true, plan, used, cap: p.monthly_send_cap };
}
