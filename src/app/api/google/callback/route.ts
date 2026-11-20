import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { googleConfig } from "@/features/google/config";
import { readState } from "@/features/google/oauth";
import { completeGoogleConnect } from "@/features/google/service";
import { defaultMailboxDeps } from "@/features/mailboxes/service";
import { parseKeyRing } from "@/features/mailboxes/crypto";
import { completeSearchConsoleConnect } from "@/features/search-console/service";
import { searchConsoleEnabled } from "@/features/search-console/load";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Retour de la Search Console : son onglet des réglages (une seule page pour connecter ou déconnecter). */
const backSc = (result: string) =>
  new URL(`/app/reglages/search-console?sc=${result}`, env.NEXT_PUBLIC_APP_URL);

const back = (siteId: string | null, result: string, param = "google", anchor = "boite-envoi") => {
  const path = siteId ? `/app/site/${siteId}` : "/app/reglages/boite";
  return new URL(`${path}?${param}=${result}#${anchor}`, env.NEXT_PUBLIC_APP_URL);
};

/** Retour de Google : vérifie le `state` et le cookie, puis enregistre la boîte (ou la Search Console). */
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
  const searchConsole = state.purpose === "search_console";
  const anchor = searchConsole ? "search-console" : "boite-envoi";
  const param = searchConsole ? "sc" : "google";
  if (req.nextUrl.searchParams.get("error") || !code) {
    return clear(
      NextResponse.redirect(
        searchConsole ? backSc("refuse") : back(state.siteId, "refuse", param, anchor),
      ),
    );
  }
  if (searchConsole) {
    if (!searchConsoleEnabled()) return new NextResponse("Not found", { status: 404 });
    const supabase = await createClient();
    const result = await completeSearchConsoleConnect(supabase, state, code, {
      config: cfg,
      keyRing: () => ring,
      getServiceClient: createServiceClient,
    });
    const key = result.ok ? "ok" : result.reason;
    return clear(NextResponse.redirect(backSc(key)));
  }
  const supabase = await createClient();
  const result = await completeGoogleConnect(supabase, state, code, {
    config: cfg,
    keyRing: () => ring,
    getServiceClient: () => defaultMailboxDeps(createServiceClient).getServiceClient(),
  });
  return clear(NextResponse.redirect(back(state.siteId, result.ok ? "ok" : result.reason)));
}
