import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaidPlanKey } from "./plans";
import { t } from "@/lib/messages";

/**
 * Adaptateur Stripe (fetch direct, sans SDK). Depuis le 21/11/2026 (décision de Jonathan : paiement
 * réel), les clés `sk_live_` et `sk_test_` sont acceptées ; toute autre clé est refusée. Le webhook
 * est authentifié par sa signature.
 */
export interface BillingProvider {
  readonly name: "stripe" | "fake";
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
}

/** Période de facturation : mensuelle, ou annuelle (prix annuel exact, 20 % de remise). */
export type BillingPeriod = "month" | "year";

export interface CheckoutInput {
  workspaceId: string;
  plan: PaidPlanKey;
  planName: string;
  period: BillingPeriod;
  /** Montant TTC facturé à chaque période, en centimes. */
  priceEurCents: number;
  customerId?: string | null;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export class BillingConfigError extends Error {}

export function assertSecretKey(key: string): void {
  if (!/^sk_(test|live)_/.test(key)) {
    throw new BillingConfigError(
      "Clé Stripe refusée : une clé secrète sk_test_ ou sk_live_ est attendue.",
    );
  }
}

type FetchLike = typeof fetch;

export function createStripeProvider(
  secretKey: string,
  fetchImpl: FetchLike = fetch,
): BillingProvider {
  assertSecretKey(secretKey);
  async function post(path: string, form: URLSearchParams): Promise<{ url?: string }> {
    const res = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.url) {
      throw new Error(`Stripe a refusé la requête (${res.status}) : ${json.error?.message ?? "?"}`);
    }
    return json;
  }
  return {
    name: "stripe",
    async createCheckout(i) {
      const f = new URLSearchParams();
      f.set("mode", "subscription");
      f.set("success_url", i.successUrl);
      f.set("cancel_url", i.cancelUrl);
      f.set("client_reference_id", i.workspaceId);
      f.set("metadata[workspace_id]", i.workspaceId);
      f.set("metadata[plan]", i.plan);
      f.set("metadata[period]", i.period);
      f.set("subscription_data[metadata][workspace_id]", i.workspaceId);
      f.set("subscription_data[metadata][plan]", i.plan);
      f.set("subscription_data[metadata][period]", i.period);
      f.set("line_items[0][quantity]", "1");
      f.set("line_items[0][price_data][currency]", "eur");
      f.set("line_items[0][price_data][unit_amount]", String(i.priceEurCents));
      f.set("line_items[0][price_data][recurring][interval]", i.period);
      f.set("line_items[0][price_data][product_data][name]", `${t.app.name} ${i.planName}`);
      if (i.customerId) f.set("customer", i.customerId);
      else if (i.customerEmail) f.set("customer_email", i.customerEmail);
      const r = await post("checkout/sessions", f);
      return { url: r.url! };
    },
    async createPortal(i) {
      const f = new URLSearchParams({ customer: i.customerId, return_url: i.returnUrl });
      const r = await post("billing_portal/sessions", f);
      return { url: r.url! };
    },
  };
}

/** Adaptateur factice (clés manquantes) : aucune requête réseau, pas de paiement possible. */
export function createFakeProvider(baseUrl: string): BillingProvider {
  return {
    name: "fake",
    async createCheckout(i) {
      return { url: `${baseUrl}/app/facturation?factice=1&plan=${i.plan}` };
    },
    async createPortal() {
      return { url: `${baseUrl}/app/facturation?factice=1` };
    },
  };
}

export function getBillingProvider(env: {
  STRIPE_SECRET_KEY?: string;
  NEXT_PUBLIC_APP_URL: string;
}): BillingProvider {
  return env.STRIPE_SECRET_KEY
    ? createStripeProvider(env.STRIPE_SECRET_KEY)
    : createFakeProvider(env.NEXT_PUBLIC_APP_URL);
}

/** Vérifie l'en-tête `Stripe-Signature` (HMAC-SHA256 de `t.payload`, tolérance 5 minutes). */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  now: Date = new Date(),
  toleranceSeconds = 300,
): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || sigs.length === 0 || !/^\d+$/.test(t)) return false;
  if (Math.abs(now.getTime() / 1000 - Number(t)) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const b = Buffer.from(s, "hex");
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}

/** Signe un payload (tests et essais locaux). */
export function signStripePayload(payload: string, secret: string, now: Date = new Date()): string {
  const t = Math.floor(now.getTime() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}
