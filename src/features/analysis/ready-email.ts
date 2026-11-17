import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { notifyAnalysisReady, type NotifyResult } from "./notify";

type Client = SupabaseClient<Database>;

/**
 * Email « vos cibles sont prêtes », envoyé à la FIN DÉFINITIVE de l'analyse : après la dernière
 * lecture d'arrière-plan, ou tout de suite si rien n'est à lire en arrière-plan (retour de Jonathan,
 * 18/11 : la liste passait de 53 à 70 cibles après l'email). Le nombre annoncé est celui de la liste
 * courte à cet instant. Une seule fois par analyse (`notifyAnalysisReady`), jamais bloquant.
 * Le résultat est tracé dans `events` (`analysis.email_result`, sans adresse).
 */
export async function sendReadyEmail(service: Client, auditId: string): Promise<NotifyResult> {
  const { data: audit } = await service
    .from("audits")
    .select("workspace_id, site_id, created_by, sites(domain)")
    .eq("id", auditId)
    .maybeSingle();
  const site = audit?.sites as unknown as { domain: string } | null;
  if (!audit || !site || !audit.created_by) return "sans_adresse";
  const { data: run } = await service
    .from("qualification_runs")
    .select("id")
    .eq("audit_id", auditId)
    .maybeSingle();
  let shortlist = 0;
  if (run) {
    const { count } = await service
      .from("qualified_targets")
      .select("id", { count: "exact", head: true })
      .eq("run_id", run.id)
      .eq("status", "liste_courte");
    shortlist = count ?? 0;
  }
  const result = await notifyAnalysisReady(
    service,
    {
      auditId,
      workspaceId: audit.workspace_id,
      siteId: audit.site_id,
      domain: site.domain,
      actorId: audit.created_by,
    },
    shortlist,
  );
  await service.from("events").insert({
    workspace_id: audit.workspace_id,
    actor_id: null,
    type: "analysis.email_result",
    payload: { audit_id: auditId, result },
  });
  return result;
}
