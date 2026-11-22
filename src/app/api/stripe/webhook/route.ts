import { NextResponse } from "next/server";
import { env, requireEnv } from "@/env";
import { trackServer } from "@/features/analytics/track-server";
import { verifyStripeSignature } from "@/features/billing/stripe";
import { handleStripeEvent, type StripeEvent } from "@/features/billing/webhook";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/** Webhook Stripe (mode test). Authentifié par la signature, jamais par la session. */
export async function POST(request: Request) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook_non_configure" }, { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "signature_invalide" }, { status: 400 });
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "json_invalide" }, { status: 400 });
  }
  try {
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const result = await handleStripeEvent(createServiceClient(), event);
    if (event.type === "checkout.session.completed" && result.status === "traite") {
      const plan = (event.data.object.metadata as { plan?: unknown } | undefined)?.plan;
      if (typeof plan === "string") await trackServer("subscription_started", { plan });
    }
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    logger.error("webhook Stripe : échec", { type: event.type, error: String(e).slice(0, 200) });
    // 500 : Stripe réessaie ; le traitement est idempotent.
    return NextResponse.json({ error: "traitement_echoue" }, { status: 500 });
  }
}
