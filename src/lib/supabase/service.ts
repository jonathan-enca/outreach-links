import { createClient } from "@supabase/supabase-js";
import { env, requireEnv } from "@/env";
import type { Database } from "./database.types";

/**
 * Client service_role : contourne la RLS. Serveur uniquement (jobs Inngest, helpers
 * serveur) ; ne jamais l'importer depuis un composant client ni l'exposer.
 */
export function createServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
