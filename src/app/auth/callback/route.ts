import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { destinationAfterCode } from "@/features/auth/destination";
import { trackServer } from "@/features/analytics/track-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Reçoit le lien d'un email (confirmation d'inscription ou réinitialisation du mot de passe, code
 * PKCE ou token_hash), ouvre la session, puis mène à /reinitialiser (récupération) ou /app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) return NextResponse.redirect(new URL("/connexion?erreur=1", origin));
  const recovery = type === "recovery";
  if (!recovery) await trackServer("email_confirmed");
  const { data } = await supabase.auth.getUser();
  return NextResponse.redirect(
    new URL(recovery ? "/reinitialiser" : destinationAfterCode(data.user), origin),
  );
}
