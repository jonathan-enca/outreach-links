import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ACTIVE_STATUSES, isPaidPlan, type PaidPlanKey } from "./plans";

type Client = SupabaseClient<Database>;

export interface StripeEvent {
  id: string;
  type: string;
  livemode?: boolean;
  data: { object: Record<string, unknown> };
}

export type WebhookResult =
  | { status: "traite"; detail?: string }
  | { status: "doublon" }
  | { status: "ignore"; reason: string };

type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

function mapStatus(s: unknown): SubStatus {
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "incomplete":
      return s;
    default:
      // canceled, unpaid, incomplete_expired, paused : plus d'accès payant.
      return "canceled";
  }
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const iso = (v: unknown): string | null =>
  typeof v === "number" && Number.isFinite(v) ? new Date(v * 1000).toISOString() : null;

function meta(o: Record<string, unknown>): Record<string, unknown> {
  return (o.metadata as Record<string, unknown> | null | undefined) ?? {};
}

/**
 * Traite un événement Stripe déjà authentifié (signature vérifiée par la route). Idempotent :
 * un événement déjà traité est ignoré (`stripe_events`), et chaque effet est lui-même un upsert
 * ou une écriture à clé d'idempotence. Événements réels et de test acceptés (21/11/2026).
 */
export async function handleStripeEvent(db: Client, event: StripeEvent): Promise<WebhookResult> {
  const seen = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen.data) return { status: "doublon" };

  const obj = event.data.object;
  let result: WebhookResult;
  switch (event.type) {
    case "checkout.session.completed":
      result = await onCheckout(db, obj);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      result = await onSubscription(db, obj, event.type === "customer.subscription.deleted");
      break;
    case "invoice.paid":
      result = await onInvoicePaid(db, obj);
      break;
    default:
      result = { status: "ignore", reason: "type_non_gere" };
  }
  const { error } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (error && error.code !== "23505") throw new Error(error.message);
  return result;
}

async function workspaceFor(
  db: Client,
  obj: Record<string, unknown>,
  ids: { subscription?: string | null; customer?: string | null },
): Promise<string | null> {
  const fromMeta = str(meta(obj).workspace_id) ?? str(obj.client_reference_id);
  if (fromMeta) return fromMeta;
  if (ids.subscription) {
    const { data } = await db
      .from("subscriptions")
      .select("workspace_id")
      .eq("stripe_subscription_id", ids.subscription)
      .maybeSingle();
    if (data) return data.workspace_id;
  }
  if (ids.customer) {
    const { data } = await db
      .from("subscriptions")
      .select("workspace_id")
      .eq("stripe_customer_id", ids.customer)
      .maybeSingle();
    if (data) return data.workspace_id;
  }
  return null;
}

async function syncWorkspacePlan(db: Client, workspaceId: string, active: boolean) {
  await db
    .from("workspaces")
    .update({ plan: active ? "payant" : "gratuit" })
    .eq("id", workspaceId);
}

async function onCheckout(db: Client, obj: Record<string, unknown>): Promise<WebhookResult> {
  const customer = str(obj.customer);
  const subscription = str(obj.subscription);
  const ws = await workspaceFor(db, obj, { subscription, customer });
  const plan = str(meta(obj).plan);
  if (!ws || !isPaidPlan(plan))
    return { status: "ignore", reason: "checkout_sans_workspace_ou_plan" };
  // Lien client/abonnement seulement : le statut d'accès vient de `customer.subscription.*`.
  const existing = await db.from("subscriptions").select("id").eq("workspace_id", ws).maybeSingle();
  if (existing.data) {
    await db
      .from("subscriptions")
      .update({
        stripe_customer_id: customer,
        stripe_subscription_id: subscription,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", ws);
  } else {
    await db.from("subscriptions").insert({
      workspace_id: ws,
      plan,
      status: "incomplete",
      stripe_customer_id: customer,
      stripe_subscription_id: subscription,
    });
  }
  return { status: "traite", detail: "checkout" };
}

async function onSubscription(
  db: Client,
  obj: Record<string, unknown>,
  deleted: boolean,
): Promise<WebhookResult> {
  const subId = str(obj.id);
  const customer = str(obj.customer);
  const ws = await workspaceFor(db, obj, { subscription: subId, customer });
  if (!ws) return { status: "ignore", reason: "workspace_inconnu" };
  const status: SubStatus = deleted ? "canceled" : mapStatus(obj.status);
  const item = ((obj.items as { data?: Record<string, unknown>[] } | undefined)?.data ?? [])[0];
  const start = iso(obj.current_period_start) ?? iso(item?.current_period_start);
  const end = iso(obj.current_period_end) ?? iso(item?.current_period_end);
  const planMeta = str(meta(obj).plan);
  const current = await db
    .from("subscriptions")
    .select("plan")
    .eq("workspace_id", ws)
    .maybeSingle();
  const plan: PaidPlanKey | null = isPaidPlan(planMeta)
    ? planMeta
    : isPaidPlan(current.data?.plan)
      ? current.data.plan
      : null;
  if (!plan) return { status: "ignore", reason: "plan_inconnu" };
  const row = {
    workspace_id: ws,
    plan,
    status,
    stripe_customer_id: customer,
    stripe_subscription_id: subId,
    current_period_start: start,
    current_period_end: end,
    cancel_at_period_end: obj.cancel_at_period_end === true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("subscriptions").upsert(row, { onConflict: "workspace_id" });
  if (error) throw new Error(error.message);
  await syncWorkspacePlan(db, ws, (ACTIVE_STATUSES as readonly string[]).includes(status));
  return { status: "traite", detail: status };
}

async function onInvoicePaid(db: Client, obj: Record<string, unknown>): Promise<WebhookResult> {
  const invoiceId = str(obj.id);
  const parent = (obj.parent as { subscription_details?: { subscription?: unknown } } | undefined)
    ?.subscription_details?.subscription;
  const subId = str(obj.subscription) ?? str(parent);
  const customer = str(obj.customer);
  if (!invoiceId) return { status: "ignore", reason: "facture_sans_id" };
  const ws = await workspaceFor(db, {}, { subscription: subId, customer });
  if (!ws) return { status: "ignore", reason: "workspace_inconnu" };
  const sub = await db.from("subscriptions").select("plan").eq("workspace_id", ws).maybeSingle();
  if (!sub.data) return { status: "ignore", reason: "abonnement_inconnu" };
  const plan = await db
    .from("plans")
    .select("monthly_credits")
    .eq("key", sub.data.plan)
    .maybeSingle();
  const credits = plan.data?.monthly_credits ?? 0;
  if (credits <= 0) return { status: "traite", detail: "aucun_credit" };
  const { error } = await db.from("credits_ledger").insert({
    workspace_id: ws,
    delta: credits,
    reason: "abonnement",
    idempotency_key: `invoice:${invoiceId}`,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  return { status: "traite", detail: `credits:${credits}` };
}
