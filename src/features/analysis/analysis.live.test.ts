import { describe, it } from "vitest";
import { computeAuditEstimate, transitionAudit } from "@/features/audits/service";
import { inngest } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { startAnalysis } from "./service";

/**
 * Run RÉEL de l'analyse unique (MU.1), sur la vraie base et un vrai serveur Inngest local :
 * `ANALYSIS_SITE_ID=<uuid> pnpm demo:analysis`. Crée un audit (site de test uniquement), le confirme,
 * envoie l'UNIQUE événement `analysis/run.requested`, puis suit la progression jusqu'à la fin et
 * imprime durée, coût réel (cost_ledger) et chiffres par étape. Prérequis : `pnpm dev` et
 * `pnpm inngest:dev` lancés avec les mêmes variables. Ignoré par défaut, donc jamais en CI.
 * `ANALYSIS_AUDIT_ID=<uuid>` reprend un audit existant au lieu d'en créer un.
 */
describe.skipIf(process.env.ANALYSIS_LIVE !== "1")("analyse unique : run réel", () => {
  it("un événement produit une liste courte", { timeout: 3 * 3_600_000 }, async () => {
    const service = createServiceClient();
    let auditId = process.env.ANALYSIS_AUDIT_ID ?? "";
    let userId: string | null = null;
    if (!auditId) {
      const siteId = process.env.ANALYSIS_SITE_ID;
      if (!siteId) throw new Error("ANALYSIS_SITE_ID manquant");
      const { data: site } = await service
        .from("sites")
        .select("id, workspace_id, domain, niche, offered_asset, priority_queries")
        .eq("id", siteId)
        .single();
      if (!site || !["mega-coloring.com", "remove-me.io"].includes(site.domain)) {
        throw new Error("run réel réservé aux sites de test");
      }
      const { data: member } = await service
        .from("memberships")
        .select("user_id")
        .eq("workspace_id", site.workspace_id)
        .limit(1)
        .single();
      userId = member?.user_id ?? null;
      const est = computeAuditEstimate({
        domain: site.domain,
        niche: site.niche,
        offeredAsset: site.offered_asset,
        priorityQueries: site.priority_queries,
        workspacePlan: "payant",
      });
      const { data: audit, error } = await service
        .from("audits")
        .insert({
          workspace_id: site.workspace_id,
          site_id: site.id,
          status: "en_attente",
          plan: est.plan,
          queries: est.queries,
          max_competitors: est.limits.maxCompetitors,
          cost_cap_usd: est.limits.costCapUsd,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error || !audit) throw new Error(`audit : ${error?.message}`);
      auditId = audit.id;
      await transitionAudit(service, auditId, "en_attente", "estime", {
        estimated_cost_usd: est.estimate.totalUsd,
        estimate_details: JSON.parse(JSON.stringify({ ...est.estimate, chain: est.chain })),
        estimated_at: new Date().toISOString(),
      });
      await transitionAudit(service, auditId, "estime", "confirme", {
        confirmed_at: new Date().toISOString(),
        auto_chain: true,
      });
      console.log(JSON.stringify({ auditId, annonce: est.chain }));
    } else {
      const { data } = await service.from("audits").select("created_by").eq("id", auditId).single();
      userId = data?.created_by ?? null;
    }

    const t0 = Date.now();
    const res = await startAnalysis(service, auditId, (e) => inngest.send(e), userId);
    console.log(JSON.stringify({ lancement: res }));
    if (res.status !== "ok") throw new Error(res.message);

    let last = "";
    for (;;) {
      await new Promise((r) => setTimeout(r, 15_000));
      const [{ data: a }, { data: steps }] = await Promise.all([
        service.from("audits").select("analysis_status, analysis_error").eq("id", auditId).single(),
        service
          .from("analysis_steps")
          .select("key, position, status, counters, last_example, error_message")
          .eq("audit_id", auditId)
          .order("position"),
      ]);
      const line = JSON.stringify({
        t: Math.round((Date.now() - t0) / 1000),
        analyse: a?.analysis_status,
        etapes: (steps ?? []).map(
          (s) => `${s.position}:${s.status}${s.counters ? JSON.stringify(s.counters) : ""}`,
        ),
      });
      if (line !== last) console.log(line);
      last = line;
      if (a?.analysis_status === "termine" || a?.analysis_status === "echoue") {
        console.log(JSON.stringify({ fin: a, secondes: Math.round((Date.now() - t0) / 1000) }));
        break;
      }
    }
  });
});
