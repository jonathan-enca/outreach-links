import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * MQ.4 : l'état des lieux a-t-il fini (réussi ou échoué) pour cet audit ? Lu en base, donc sans état
 * mémorisé : l'analyse la relit à chaque tour d'attente. Une erreur de lecture vaut « pas fini ».
 */
export async function linksStateSettled(service: Client, auditId: string): Promise<boolean> {
  const { data, error } = await service
    .from("analysis_steps")
    .select("status")
    .eq("audit_id", auditId)
    .eq("key", "etat_des_lieux")
    .maybeSingle();
  if (error || !data) return false;
  return data.status === "termine" || data.status === "echoue";
}

/**
 * Attente bornée de l'état des lieux : au plus `maxChecks` lectures espacées de `interval`
 * (Inngest `step.sleep` entre deux). Au-delà, l'analyse continue sans les requêtes Search Console.
 */
export const LINKS_STATE_WAIT = { maxChecks: 24, interval: "15s" } as const;
