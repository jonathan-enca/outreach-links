import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import { googleConfig } from "@/features/google/config";
import { buildAuthUrl, newNonce, signState } from "@/features/google/oauth";
import { parseKeyRing } from "@/features/mailboxes/crypto";
import { createClient } from "@/lib/supabase/server";

const NONCE_COOKIE = "g_oauth_nonce";

/** Démarre la connexion d'une boîte par compte Google. Fermé tant que GOOGLE_OAUTH_ENABLED n'est pas "true". */
export async function GET(req: NextRequest) {
  const cfg = googleConfig();
  if (!cfg) return new NextResponse("Not found", { status: 404 });
  const siteId = req.nextUrl.searchParams.get("site");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL("/connexion", env.NEXT_PUBLIC_APP_URL));
  const { data: site } = siteId
    ? await supabase.from("sites").select("id").eq("id", siteId).maybeSingle()
    : { data: null };
  if (!site) return new NextResponse("Not found", { status: 404 });

  const nonce = newNonce();
  const state = signState(
    { siteId: site.id, userId: auth.user.id, nonce },
    parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS),
  );
  const res = NextResponse.redirect(buildAuthUrl(cfg, state));
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return res;
}
