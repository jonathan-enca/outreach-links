import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/env";
import type { Database } from "@/lib/supabase/database.types";

/** Rafraîchit la session Supabase et protège /app : sans session, redirection vers /connexion. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  // Filet de sécurité : un lien d'email dont l'URL de redirection n'a pas été reconnue atterrit sur
  // l'accueil avec `?code=` ; on le reprend dans la route de callback.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // /api/inngest est exclu : appelé par Inngest (pas de session), il se protège par sa clé de signature.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/inngest|api/stripe|api/unsubscribe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
