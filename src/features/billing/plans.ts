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

/** Délai laissé pour régulariser un paiement refusé avant la pause des envois (décision de Jonathan, 22/11/2026). */
export const PAYMENT_GRACE_DAYS = 7;

/** Date de la pause des envois après un paiement refusé. */
export function paymentPauseAt(failedAt: string | Date): Date {
  return new Date(new Date(failedAt).getTime() + PAYMENT_GRACE_DAYS * 86_400_000);
}

/** Paiement refusé depuis plus de 7 jours et toujours pas régularisé (pur, testé). */
export function paymentOverdue(
  sub: { status: string; payment_failed_at: string | null },
  now: Date,
): boolean {
  return (
    sub.status === "past_due" &&
    sub.payment_failed_at !== null &&
    paymentPauseAt(sub.payment_failed_at) <= now
  );
}

/**
 * Plan qui s'applique aux ENVOIS : celui de l'abonnement, sauf si un paiement refusé n'a pas été
 * régularisé dans les 7 jours (les envois sont alors en pause ; rien d'autre n'est retiré ni supprimé).
 */
export async function sendingPlan(
  db: Client,
  workspaceId: string,
  now: Date,
): Promise<BillingPlanKey> {
  const plan = await effectivePlan(db, workspaceId, now);
  if (plan === "gratuit") return plan;
  const { data } = await db
    .from("subscriptions")
    .select("status, payment_failed_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data && paymentOverdue(data, now) ? "gratuit" : plan;
}

/** Pendant la bêta, un espace sans abonnement envoie comme ce plan (décision de Jonathan, 17/11/2026). */
export const BETA_SEND_PLAN: PaidPlanKey = "starter";

/** Statuts d'un envoi réel parti ou en cours (le dry run et les annulés ne comptent pas). */
const REAL_STATUSES = ["en_cours", "envoye", "a_reessayer", "echec"];

/**
 * Cibles contactées ce mois civil (UTC) : les PREMIERS messages réels. La relance et les réponses
 * sont incluses dans l'offre et ne comptent pas (décision de Jonathan, 21/11/2026).
 */
export async function contactedThisMonth(
  db: Client,
  workspaceId: string,
  now: Date,
): Promise<number> {
  const { data } = await db
    .from("sent_messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("dry_run", false)
    .eq("step", "initial")
    .in("status", REAL_STATUSES)
    .gte("claimed_at", monthStart(now).toISOString());
  return data?.length ?? 0;
}

/**
 * Autorise (ou non) UN premier message réel. Appliqué côté serveur, au moteur d'envoi : un workspace
 * gratuit n'envoie rien ; un abonné est plafonné par `plans.monthly_send_cap` (cibles contactées du
 * mois). Une lecture impossible du plan refuse (jamais d'envoi par défaut).
 *
 * `countsAgainstCap: false` pour une relance ou une réponse : l'offre doit permettre l'envoi, mais le
 * plafond mensuel ne s'applique pas (une cible déjà contactée se relance et se répond toujours).
 *
 * `beta` (réglage `BETA_MODE`, lu par l'appelant) : tant que le paiement n'est pas ouvert, un espace
 * sans abonnement peut envoyer, plafonné comme `BETA_SEND_PLAN`. Les protections d'envoi (fenêtre,
 * rythme, échauffement, validation, liste de suppression) ne changent pas.
 */
export async function checkSendAllowance(
  db: Client,
  workspaceId: string,
  now: Date,
  beta = false,
  countsAgainstCap = true,
): Promise<SendDecision> {
  const subscribed = await sendingPlan(db, workspaceId, now);
  const plan = subscribed === "gratuit" && beta ? BETA_SEND_PLAN : subscribed;
  if (plan === "gratuit") return { allowed: false, reason: "abonnement_requis", plan };
  const { data: p } = await db
    .from("plans")
    .select("monthly_send_cap")
    .eq("key", plan)
    .maybeSingle();
  if (!p || p.monthly_send_cap <= 0) {
    return { allowed: false, reason: "abonnement_requis", plan: "gratuit" };
  }
  const used = await contactedThisMonth(db, workspaceId, now);
  if (countsAgainstCap && used >= p.monthly_send_cap) {
    return { allowed: false, reason: "quota_mensuel", plan };
  }
  return { allowed: true, plan, used, cap: p.monthly_send_cap };
}
