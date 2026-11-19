import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { googleConfig } from "@/features/google/config";
import { readState } from "@/features/google/oauth";
import { completeGoogleConnect } from "@/features/google/service";
import { defaultMailboxDeps } from "@/features/mailboxes/service";
import { parseKeyRing } from "@/features/mailboxes/crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const back = (siteId: string | null, result: string) => {
  const path = siteId ? `/app/site/${siteId}` : "/app/reglages/boite";
  return new URL(`${path}?google=${result}#boite-envoi`, env.NEXT_PUBLIC_APP_URL);
};

/** Retour de Google : vérifie le `state` et le cookie, puis enregistre la boîte. */
export async function GET(req: NextRequest) {
  const cfg = googleConfig();
  if (!cfg) return new NextResponse("Not found", { status: 404 });
  const ring = parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS);
  const state = readState(req.nextUrl.searchParams.get("state"), ring);
  const cookieNonce = req.cookies.get("g_oauth_nonce")?.value;
  const clear = (r: NextResponse) => {
    r.cookies.delete({ name: "g_oauth_nonce", path: "/api/google" });
    return r;
  };
  if (!state || !cookieNonce || cookieNonce !== state.nonce) {
    return clear(NextResponse.redirect(back(null, "invalide")));
  }
  const code = req.nextUrl.searchParams.get("code");
  if (req.nextUrl.searchParams.get("error") || !code) {
    return clear(NextResponse.redirect(back(state.siteId, "refuse")));
  }
  const supabase = await createClient();
  const result = await completeGoogleConnect(supabase, state, code, {
    config: cfg,
    keyRing: () => ring,
    getServiceClient: () => defaultMailboxDeps(createServiceClient).getServiceClient(),
  });
  return clear(NextResponse.redirect(back(state.siteId, result.ok ? "ok" : result.reason)));
}
