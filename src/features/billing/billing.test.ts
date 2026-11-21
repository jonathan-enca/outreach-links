import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { checkSendAllowance, effectivePlan, monthStart } from "./plans";
import { startCheckout } from "./service";
import {
  assertSecretKey,
  createFakeProvider,
  createStripeProvider,
  signStripePayload,
  verifyStripeSignature,
} from "./stripe";
import { handleStripeEvent, type StripeEvent } from "./webhook";

const NOW = new Date("2026-11-20T10:00:00Z");
const PLANS = [
  { key: "gratuit", name: "Gratuit", price_eur_cents: 0, monthly_send_cap: 0, monthly_credits: 0 },
  {
    key: "starter",
    name: "Starter",
    price_eur_cents: 4900,
    monthly_send_cap: 2,
    monthly_credits: 100,
  },
  { key: "pro", name: "Pro", price_eur_cents: 11900, monthly_send_cap: 600, monthly_credits: 400 },
];
const sub = (over: Record<string, unknown> = {}) => ({
  workspace_id: "ws1",
  plan: "starter",
  status: "active",
  current_period_end: "2026-12-01T00:00:00Z",
  ...over,
});

describe("signature Stripe", () => {
  const secret = "whsec_test";
  const body = '{"id":"evt_1"}';
  it("accepte une signature valide, refuse altérée, mauvaise clé, périmée, absente", () => {
    const h = signStripePayload(body, secret, NOW);
    expect(verifyStripeSignature(body, h, secret, NOW)).toBe(true);
    expect(verifyStripeSignature(body + " ", h, secret, NOW)).toBe(false);
    expect(verifyStripeSignature(body, h, "autre", NOW)).toBe(false);
    expect(verifyStripeSignature(body, h, secret, new Date(NOW.getTime() + 600_000))).toBe(false);
    expect(verifyStripeSignature(body, null, secret, NOW)).toBe(false);
    expect(verifyStripeSignature(body, "t=abc,v1=zz", secret, NOW)).toBe(false);
  });
});

describe("clés Stripe", () => {
  it("accepte une clé secrète réelle ou de test, refuse le reste", () => {
    expect(() => assertSecretKey("sk_live_abc")).not.toThrow();
    expect(() => assertSecretKey("sk_test_abc")).not.toThrow();
    expect(() => createStripeProvider("sk_live_abc")).not.toThrow();
    expect(() => assertSecretKey("rk_live_abc")).not.toThrow();
    expect(() => assertSecretKey("pk_live_abc")).toThrow(/sk_/);
    expect(() => createStripeProvider("whsec_abc")).toThrow();
  });
  it("le fournisseur Stripe envoie une session de paiement en euros, mensuelle, avec le workspace", async () => {
    const f = vi.fn(
      async () => new Response(JSON.stringify({ url: "https://checkout.stripe.test/x" })),
    );
    const p = createStripeProvider("sk_test_abc", f as unknown as typeof fetch);
    const r = await p.createCheckout({
      workspaceId: "ws1",
      plan: "starter",
      planName: "Starter",
      period: "month",
      priceEurCents: 4900,
      customerEmail: "a@b.fr",
      successUrl: "https://app/ok",
      cancelUrl: "https://app/ko",
    });
    expect(r.url).toBe("https://checkout.stripe.test/x");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const body = new URLSearchParams(String(init.body));
    expect(body.get("mode")).toBe("subscription");
    expect(body.get("metadata[workspace_id]")).toBe("ws1");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("4900");
    expect(body.get("line_items[0][price_data][recurring][interval]")).toBe("month");
  });
  it("l'adaptateur factice ne fait aucun appel réseau", async () => {
    const r = await createFakeProvider("https://app").createCheckout({
      workspaceId: "w",
      plan: "pro",
      planName: "Pro",
      period: "month",
      priceEurCents: 1,
      successUrl: "",
      cancelUrl: "",
    });
    expect(r.url).toContain("factice=1");
  });
});

describe("plafonds d'envoi appliqués côté serveur", () => {
  it("un workspace gratuit ne peut pas envoyer", async () => {
    const { client } = fakeSupabase({ plans: PLANS });
    const d = await checkSendAllowance(client, "ws1", NOW);
    expect(d).toEqual({ allowed: false, reason: "abonnement_requis", plan: "gratuit" });
  });
  it("bêta : sans abonnement, l'envoi est permis et plafonné comme le plan Starter", async () => {
    const row = {
      workspace_id: "ws1",
      dry_run: false,
      status: "envoye",
      step: "initial",
      claimed_at: NOW.toISOString(),
    };
    const one = fakeSupabase({ plans: PLANS, sent_messages: [row], reply_sends: [] });
    expect(await checkSendAllowance(one.client, "ws1", NOW, true)).toEqual({
      allowed: true,
      plan: "starter",
      used: 1,
      cap: 2,
    });
    const full = fakeSupabase({ plans: PLANS, sent_messages: [row, row], reply_sends: [] });
    expect(await checkSendAllowance(full.client, "ws1", NOW, true)).toMatchObject({
      allowed: false,
      reason: "quota_mensuel",
    });
    // Hors bêta, rien ne change : pas d'abonnement, pas d'envoi.
    expect(await checkSendAllowance(one.client, "ws1", NOW, false)).toMatchObject({
      allowed: false,
      reason: "abonnement_requis",
    });
  });
  it("un abonnement annulé, impayé-incomplet ou expiré revient au gratuit", async () => {
    for (const over of [
      { status: "canceled" },
      { status: "incomplete" },
      { current_period_end: "2026-11-01T00:00:00Z" },
    ]) {
      const { client } = fakeSupabase({ plans: PLANS, subscriptions: [sub(over)] });
      expect(await effectivePlan(client, "ws1", NOW)).toBe("gratuit");
    }
    const { client } = fakeSupabase({ plans: PLANS, subscriptions: [sub({ status: "past_due" })] });
    expect(await effectivePlan(client, "ws1", NOW)).toBe("starter");
  });
  it("un abonné est plafonné par mois en cibles contactées ; relances, réponses et dry run ne comptent pas", async () => {
    const sent = (over: Record<string, unknown>) => ({
      workspace_id: "ws1",
      dry_run: false,
      status: "envoye",
      step: "initial",
      claimed_at: "2026-11-05T10:00:00Z",
      ...over,
    });
    const reply = {
      workspace_id: "ws1",
      dry_run: false,
      status: "envoye",
      claimed_at: "2026-11-07T10:00:00Z",
    };
    const { client } = fakeSupabase({
      plans: PLANS,
      subscriptions: [sub()],
      sent_messages: [
        sent({}),
        sent({ step: "relance", claimed_at: "2026-11-15T10:00:00Z" }),
        sent({ dry_run: true, status: "simule" }),
        sent({ claimed_at: "2026-10-30T10:00:00Z" }),
      ],
      reply_sends: [reply, reply],
    });
    expect(await checkSendAllowance(client, "ws1", NOW)).toMatchObject({
      allowed: true,
      used: 1,
      cap: 2,
    });
    const { client: c2 } = fakeSupabase({
      plans: PLANS,
      subscriptions: [sub()],
      sent_messages: [sent({}), sent({ claimed_at: "2026-11-06T10:00:00Z" })],
      reply_sends: [],
    });
    expect(await checkSendAllowance(c2, "ws1", NOW)).toEqual({
      allowed: false,
      reason: "quota_mensuel",
      plan: "starter",
    });
    // Plafond atteint : une relance ou une réponse reste permise.
    expect(await checkSendAllowance(c2, "ws1", NOW, false, false)).toMatchObject({
      allowed: true,
      used: 2,
      cap: 2,
    });
  });
  it("début de mois civil UTC", () => {
    expect(monthStart(NOW).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("webhooks Stripe", () => {
  const base = (): Parameters<typeof fakeSupabase>[0] => ({
    plans: PLANS,
    workspaces: [{ id: "ws1", plan: "gratuit" }],
  });
  const ev = (
    id: string,
    type: string,
    object: Record<string, unknown>,
    livemode = false,
  ): StripeEvent => ({
    id,
    type,
    livemode,
    data: { object },
  });
  const subObj = (over: Record<string, unknown> = {}) => ({
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    current_period_end: 1796083200,
    cancel_at_period_end: false,
    metadata: { workspace_id: "ws1", plan: "starter" },
    ...over,
  });

  it("checkout puis abonnement actif : abonnement créé, workspace passé en payant", async () => {
    const { client, tables } = fakeSupabase(base());
    await handleStripeEvent(
      client,
      ev("evt_1", "checkout.session.completed", {
        customer: "cus_1",
        subscription: "sub_1",
        client_reference_id: "ws1",
        metadata: { workspace_id: "ws1", plan: "starter" },
      }),
    );
    expect(tables.subscriptions![0]).toMatchObject({
      status: "incomplete",
      stripe_customer_id: "cus_1",
    });
    expect(await effectivePlan(client, "ws1", NOW)).toBe("gratuit");
    await handleStripeEvent(client, ev("evt_2", "customer.subscription.created", subObj()));
    expect(tables.subscriptions).toHaveLength(1);
    expect(tables.subscriptions![0]).toMatchObject({ status: "active", plan: "starter" });
    expect(tables.workspaces![0]!.plan).toBe("payant");
  });
  it("un événement rejoué est ignoré (idempotence)", async () => {
    const { client, tables } = fakeSupabase(base());
    const e = ev("evt_2", "customer.subscription.created", subObj());
    expect((await handleStripeEvent(client, e)).status).toBe("traite");
    tables.subscriptions![0]!.status = "past_due";
    expect((await handleStripeEvent(client, e)).status).toBe("doublon");
    expect(tables.subscriptions![0]!.status).toBe("past_due");
  });
  it("annulation : retour au plan gratuit", async () => {
    const { client, tables } = fakeSupabase(base());
    await handleStripeEvent(client, ev("e1", "customer.subscription.created", subObj()));
    await handleStripeEvent(
      client,
      ev("e2", "customer.subscription.deleted", subObj({ status: "canceled" })),
    );
    expect(tables.subscriptions![0]!.status).toBe("canceled");
    expect(tables.workspaces![0]!.plan).toBe("gratuit");
    expect(await effectivePlan(client, "ws1", NOW)).toBe("gratuit");
  });
  it("l'espace de travail est retrouvé par l'identifiant d'abonnement sans métadonnées", async () => {
    const { client, tables } = fakeSupabase(base());
    await handleStripeEvent(client, ev("e1", "customer.subscription.created", subObj()));
    await handleStripeEvent(
      client,
      ev("e2", "customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        status: "past_due",
        metadata: {},
      }),
    );
    expect(tables.subscriptions![0]).toMatchObject({ status: "past_due", plan: "starter" });
  });
  it("facture payée : crédits du plan, une seule fois par facture", async () => {
    const { client, tables } = fakeSupabase(base());
    await handleStripeEvent(client, ev("e1", "customer.subscription.created", subObj()));
    const inv = { id: "in_1", subscription: "sub_1", customer: "cus_1" };
    await handleStripeEvent(client, ev("e2", "invoice.paid", inv));
    await handleStripeEvent(client, ev("e3", "invoice.paid", inv)); // autre événement, même facture
    expect(tables.credits_ledger).toHaveLength(1);
    expect(tables.credits_ledger![0]).toMatchObject({ delta: 100, reason: "abonnement" });
  });
  it("type inconnu : aucun effet ; un événement réel est traité comme un événement de test", async () => {
    const { client, tables } = fakeSupabase(base());
    expect((await handleStripeEvent(client, ev("e2", "charge.refunded", {}))).status).toBe(
      "ignore",
    );
    expect(tables.subscriptions ?? []).toHaveLength(0);
    expect(tables.workspaces![0]!.plan).toBe("gratuit");
    const live = await handleStripeEvent(
      client,
      ev("e1", "customer.subscription.created", subObj(), true),
    );
    expect(live.status).not.toBe("ignore");
  });
});

describe("souscription", () => {
  it("refuse un plan inconnu ou gratuit, et un second abonnement", async () => {
    const provider = createFakeProvider("https://app");
    const { client } = fakeSupabase({ plans: PLANS, workspaces: [{ id: "ws1" }] });
    expect((await startCheckout(client, provider, "https://app", "gratuit", null)).ok).toBe(false);
    expect((await startCheckout(client, provider, "https://app", "nimporte", null)).ok).toBe(false);
    expect((await startCheckout(client, provider, "https://app", "pro", null)).ok).toBe(true);
    const { client: c2 } = fakeSupabase({
      plans: PLANS,
      workspaces: [{ id: "ws1" }],
      subscriptions: [sub()],
    });
    expect((await startCheckout(c2, provider, "https://app", "pro", null)).ok).toBe(false);
  });
});
