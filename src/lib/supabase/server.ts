import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/env";
import type { Database } from "./database.types";

/** Client serveur (Server Components, Server Actions, Route Handlers), lié à la session par cookies. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le proxy rafraîchit déjà la session.
          }
        },
      },
    },
  );
}
