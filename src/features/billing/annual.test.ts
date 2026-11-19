import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { startCheckout } from "./service";
import { createStripeProvider, type BillingProvider, type CheckoutInput } from "./stripe";

const db = () =>
  fakeSupabase(
    {
      workspaces: [{ id: "ws1" }],
      plans: [
        {
          key: "pro",
          name: "Pro",
          price_eur_cents: 4990,
          price_annual_eur_cents: 47904,
          monthly_send_cap: 300,
        },
      ],
      subscriptions: [],
    },
    { userId: "u1" },
  );

function capture(): { provider: BillingProvider; calls: CheckoutInput[] } {
  const calls: CheckoutInput[] = [];
  const provider: BillingProvider = {
    name: "fake",
    async createCheckout(i) {
      calls.push(i);
      return { url: "https://example.test/checkout" };
    },
    async createPortal() {
      return { url: "https://example.test/portal" };
    },
  };
  return { provider, calls };
}

describe("facturation annuelle", () => {
  it("année : montant annuel exact, intervalle année", async () => {
    const { provider, calls } = capture();
    const r = await startCheckout(
      db().client as never,
      provider,
      "https://app.test",
      "pro",
      null,
      "year",
    );
    expect(r.ok).toBe(true);
    expect(calls[0]).toMatchObject({ period: "year", priceEurCents: 47904 });
  });

  it("mois par défaut : montant mensuel", async () => {
    const { provider, calls } = capture();
    await startCheckout(db().client as never, provider, "https://app.test", "pro", null);
    expect(calls[0]).toMatchObject({ period: "month", priceEurCents: 4990 });
  });

  it("période inconnue : refus, rien n'est envoyé à Stripe", async () => {
    const { provider, calls } = capture();
    const r = await startCheckout(
      db().client as never,
      provider,
      "https://app.test",
      "pro",
      null,
      "week",
    );
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("Stripe reçoit l'intervalle choisi, sans prix mensuel figé", async () => {
    const bodies: string[] = [];
    const fetchMock = (async (_url: unknown, init?: { body?: unknown }) => {
      bodies.push(String(init?.body ?? ""));
      return new Response(JSON.stringify({ url: "https://checkout.stripe.test/s" }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const provider = createStripeProvider("sk_test_abc", fetchMock);
    await provider.createCheckout({
      workspaceId: "ws1",
      plan: "pro",
      planName: "Pro",
      period: "year",
      priceEurCents: 47904,
      successUrl: "https://app.test/ok",
      cancelUrl: "https://app.test/ko",
    });
    const body = new URLSearchParams(bodies[0]);
    expect(body.get("line_items[0][price_data][recurring][interval]")).toBe("year");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("47904");
    expect(body.get("metadata[period]")).toBe("year");
  });
});
