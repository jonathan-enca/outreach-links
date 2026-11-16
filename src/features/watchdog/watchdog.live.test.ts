import { describe, expect, it } from "vitest";
import { createServiceClient } from "@/lib/supabase/service";
import { runWatchdog } from "./run";

/**
 * Vérification RÉELLE du chien de garde (MU.0), sur la vraie base, dans l'espace du compte de test
 * uniquement : `pnpm demo:watchdog` (après `pnpm shots:seed`). Ignorée par défaut, donc jamais en CI.
 * Bloque deux étapes des audits de test, lance un passage, vérifie qu'aucune ne reste « en cours ».
 * Aucun appel payant. Le passage est celui de la production : il traiterait aussi toute autre étape
 * réellement bloquée ailleurs.
 */
describe.skipIf(process.env.WATCHDOG_LIVE !== "1")("chien de garde : vérification réelle", () => {
  it("un audit de test ne reste plus bloqué en cours", { timeout: 60_000 }, async () => {
    const service = createServiceClient();
    const { data: sites } = await service
      .from("sites")
      .select("domain, workspace_id, audits(id)")
      .in("domain", ["rando-demo.example", "coloriages-demo.example"]);
    const auditOf = (domain: string) => sites?.find((s) => s.domain === domain)?.audits[0]?.id;
    const stuck = auditOf("rando-demo.example");
    const finished = auditOf("coloriages-demo.example");
    const workspaceId = sites?.[0]?.workspace_id;
    if (!stuck || !finished || !workspaceId) throw new Error("lancer d'abord « pnpm shots:seed »");

    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    // 1. Job tué en plein travail : « en cours » depuis deux heures, aucun événement de fin.
    await service
      .from("audits")
      .update({ backlinks_status: "en_cours", backlinks_started_at: twoHoursAgo })
      .eq("id", stuck);
    // 2. Le défaut du diagnostic : statut resté « en cours » alors que le journal dit « fini ».
    await service
      .from("audits")
      .update({ opportunities_status: "en_cours", opportunities_started_at: twoHoursAgo })
      .eq("id", finished);
    await service.from("events").insert({
      workspace_id: workspaceId,
      actor_id: null,
      type: "audit.opportunities_done",
      payload: { audit_id: finished, total: 3, cost_usd: 0.016 },
    });

    const report = await runWatchdog(service);
    const mine = report.actions.filter((a) => a.id === stuck || a.id === finished);
    console.log(JSON.stringify({ examined: report.examined, actions: report.actions }));
    expect(mine.map((a) => `${a.step}:${a.action}`).sort()).toEqual([
      "audit.backlinks:echoue",
      "audit.opportunities:repare",
    ]);
    const { data: after } = await service
      .from("audits")
      .select("id, backlinks_status, backlinks_error, opportunities_status")
      .in("id", [stuck, finished]);
    expect(after?.find((a) => a.id === stuck)).toMatchObject({ backlinks_status: "echoue" });
    expect(after?.find((a) => a.id === finished)).toMatchObject({
      opportunities_status: "termine",
    });
  });
});
