import { describe, it } from "vitest";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { createServiceClient } from "@/lib/supabase/service";
import { estimateDiscovery } from "./estimate";
import { PLAN_LIMITS } from "./plans";
import { beginDiscovery, discoverQuery, finalizeDiscovery } from "./run";
import { transitionAudit } from "./service";

/**
 * Run RÉEL de validation sur mega-coloring.com (payant, ~0,018 USD, plafond dur 1,50 USD) :
 * ignoré par défaut, donc jamais en CI. Lancer : pnpm demo:audit
 * Nécessite DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD (ou DATAFORSEO_PROXY_AUTH=true),
 * NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY. Écrit un vrai audit dans la base
 * (workspace AUDIT_DEMO_WORKSPACE_ID, sinon le premier workspace) : cost_ledger contient
 * ensuite le coût estimé et le coût réel de chaque appel.
 */
describe.skipIf(process.env.AUDIT_LIVE_DEMO !== "1")("validation réelle de la découverte", () => {
  it("mega-coloring.com : estimé vs réel", { timeout: 120_000 }, async () => {
    const service = createServiceClient();
    const queries = ["coloriage licorne", "coloriage chat", "coloriage dinosaure"];

    const wsQuery = service.from("workspaces").select("id").order("created_at").limit(1);
    const { data: ws } = process.env.AUDIT_DEMO_WORKSPACE_ID
      ? await service
          .from("workspaces")
          .select("id")
          .eq("id", process.env.AUDIT_DEMO_WORKSPACE_ID)
          .single()
      : await wsQuery.single();
    if (!ws) throw new Error("aucun workspace");

    let { data: site } = await service
      .from("sites")
      .select("id")
      .eq("workspace_id", ws.id)
      .eq("domain", "mega-coloring.com")
      .maybeSingle();
    if (!site) {
      const created = await service
        .from("sites")
        .insert({
          workspace_id: ws.id,
          domain: "mega-coloring.com",
          niche: "coloriages",
          country: "FR",
          language: "fr",
          priority_queries: queries,
        })
        .select("id")
        .single();
      if (created.error) throw new Error(created.error.message);
      site = created.data;
    }

    const limits = PLAN_LIMITS.gratuit;
    const estimate = estimateDiscovery(queries, limits);
    const ins = await service
      .from("audits")
      .insert({
        workspace_id: ws.id,
        site_id: site!.id,
        status: "en_attente",
        plan: "gratuit",
        queries,
        max_competitors: limits.maxCompetitors,
        cost_cap_usd: limits.costCapUsd,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const auditId = ins.data.id;
    await transitionAudit(service, auditId, "en_attente", "estime", {
      estimated_cost_usd: estimate.totalUsd,
      estimate_details: estimate as never,
      estimated_at: new Date().toISOString(),
    });
    await transitionAudit(service, auditId, "estime", "confirme", {
      confirmed_at: new Date().toISOString(),
    });

    const audit = await beginDiscovery(service, auditId);
    if (!audit) throw new Error("audit non exécutable");
    const dfs = createDataForSeoClientFromEnv({ budgetUsd: 1.5, maxCostPerCallUsd: 0.5 });
    for (const q of audit.queries) {
      console.log(JSON.stringify(await discoverQuery(service, dfs, audit, q)));
    }
    const result = await finalizeDiscovery(service, audit);
    console.log(JSON.stringify({ auditId, ...result }));
  });
});
