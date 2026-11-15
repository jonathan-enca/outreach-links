import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { checkSendAllowance, effectivePlan, isPaidPlan, type BillingPlanKey } from "./plans";
import type { BillingProvider } from "./stripe";

type Client = SupabaseClient<Database>;

export type BillingResult = { ok: true; url: string } | { ok: false; error: string };

export interface PlanRow {
  key: string;
  name: string;
  price_eur_cents: number;
  monthly_send_cap: number;
  monthly_credits: number;
  max_sites: number;
  max_mailboxes: number;
}

export interface BillingOverview {
  workspaceId: string;
  plan: BillingPlanKey;
  status: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
  plans: PlanRow[];
  sendUsed: number | null;
  sendCap: number | null;
  credits: number;
}

/** Lecture par la RLS (client utilisateur) : plan, abonnement, usage du mois, solde de crédits. */
export async function getBillingOverview(
  supabase: Client,
  now: Date = new Date(),
): Promise<BillingOverview | null> {
  const { data: ws } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
  if (!ws) return null;
  const [{ data: plans }, { data: sub }, { data: ledger }] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("subscriptions").select("*").eq("workspace_id", ws.id).maybeSingle(),
    supabase.from("credits_ledger").select("delta").eq("workspace_id", ws.id),
  ]);
  const plan = await effectivePlan(supabase, ws.id, now);
  const allowance = await checkSendAllowance(supabase, ws.id, now);
  return {
    workspaceId: ws.id,
    plan,
    status: sub?.status ?? null,
    periodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    hasCustomer: Boolean(sub?.stripe_customer_id),
    plans: (plans ?? []) as PlanRow[],
    sendUsed: allowance.allowed ? allowance.used : null,
    sendCap: allowance.allowed ? allowance.cap : null,
    credits: (ledger ?? []).reduce((n, r) => n + r.delta, 0),
  };
}

export async function startCheckout(
  supabase: Client,
  provider: BillingProvider,
  appUrl: string,
  planRaw: unknown,
  email: string | null,
): Promise<BillingResult> {
  if (!isPaidPlan(planRaw)) return { ok: false, error: "Plan inconnu." };
  const { data: ws } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
  if (!ws) return { ok: false, error: "Espace de travail introuvable." };
  const { data: plan } = await supabase.from("plans").select("*").eq("key", planRaw).maybeSingle();
  if (!plan) return { ok: false, error: "Plan inconnu." };
  const current = await effectivePlan(supabase, ws.id, new Date());
  if (current !== "gratuit") {
    return { ok: false, error: "Un abonnement est déjà actif : utilisez le portail client." };
  }
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", ws.id)
    .maybeSingle();
  try {
    const r = await provider.createCheckout({
      workspaceId: ws.id,
      plan: planRaw,
      planName: plan.name,
      priceEurCents: plan.price_eur_cents,
      customerId: sub?.stripe_customer_id ?? null,
      customerEmail: email,
      successUrl: `${appUrl}/app/facturation?paiement=ok`,
      cancelUrl: `${appUrl}/app/facturation?paiement=annule`,
    });
    return { ok: true, url: r.url };
  } catch {
    return { ok: false, error: "Le paiement n'a pas pu être lancé. Réessayez plus tard." };
  }
}

export async function openPortal(
  supabase: Client,
  provider: BillingProvider,
  appUrl: string,
): Promise<BillingResult> {
  const { data: ws } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
  if (!ws) return { ok: false, error: "Espace de travail introuvable." };
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", ws.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) return { ok: false, error: "Aucun abonnement à gérer." };
  try {
    const r = await provider.createPortal({
      customerId: sub.stripe_customer_id,
      returnUrl: `${appUrl}/app/facturation`,
    });
    return { ok: true, url: r.url };
  } catch {
    return { ok: false, error: "Le portail n'a pas pu s'ouvrir. Réessayez plus tard." };
  }
}
