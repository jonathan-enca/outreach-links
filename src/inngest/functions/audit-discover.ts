import { z } from "zod";
import { inngest } from "@/inngest/client";
import { advanceChain } from "@/features/audits/chain";
import {
  beginDiscovery,
  discoverQuery,
  failDiscovery,
  finalizeDiscovery,
} from "@/features/audits/run";
import { DISCOVER_EVENT } from "@/features/audits/service";
import { queryDeps } from "@/features/onboarding/deps";
import { ensureQueryUniverse } from "@/features/queries/service";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const discoverEventSchema = z.object({
  auditId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

/**
 * Job `audit.discover` (M1.3) : top 30 de la SERP pour chaque requête prioritaire,
 * agrégation des domaines, exclusion des plateformes génériques, sélection selon le
 * plan. Déclenché par l'événement "audit/discover.requested", envoyé UNIQUEMENT
 * après la confirmation du coût par l'utilisateur. Chaque requête est une étape
 * (reprise sans repayer : cache DataForSEO + étapes mémorisées).
 */
export const auditDiscover = inngest.createFunction(
  {
    id: "audit-discover",
    triggers: [{ event: DISCOVER_EVENT }],
    retries: 2,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      // L'événement d'origine est dans event.data.event.data (enveloppe d'échec Inngest).
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = discoverEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failDiscovery(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = discoverEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-discover", auditId });

    const audit = await step.run("begin", async () =>
      beginDiscovery(createServiceClient(), auditId),
    );
    if (!audit) {
      log.warn("audit non exécutable (non confirmé ou déjà terminé)");
      return { skipped: true };
    }

    // MU.0 : les requêtes par type d'éditeur sont garanties ici, quel que soit l'écran d'où l'audit a
    // été lancé (un appel LLM court au plus, aucun si elles existent déjà). N'arrête jamais l'audit.
    await step.run("query-universe", async () => {
      const service = createServiceClient();
      const { data } = await service
        .from("audits")
        .select("site_id, created_by")
        .eq("id", auditId)
        .maybeSingle();
      if (!data) return { status: "impossible", reason: "audit_introuvable" };
      const out = await ensureQueryUniverse(
        service,
        { siteId: data.site_id, userId: data.created_by },
        queryDeps,
      );
      return out.status === "impossible"
        ? { status: out.status, reason: out.reason }
        : { status: out.status, queries: out.universe.queries.length };
    });

    const perQuery = [];
    for (const [i, query] of audit.queries.entries()) {
      perQuery.push(
        await step.run(`serp-${i + 1}`, async () =>
          discoverQuery(createServiceClient(), createDataForSeoClientFromEnv(), audit, query),
        ),
      );
    }

    const result = await step.run("finalize", async () =>
      finalizeDiscovery(createServiceClient(), audit),
    );
    log.info("découverte terminée", { ...result });

    // MA.6 : parcours unique, lance l'étape suivante si l'audit est en enchaînement automatique.
    // Un échec ici ne doit jamais faire échouer l'étape déjà payée et terminée.
    await step.run("chain-next", async () => {
      try {
        return await advanceChain(createServiceClient(), auditId, (e) => inngest.send(e));
      } catch (error) {
        log.warn("enchaînement impossible", { error: (error as Error).message });
        return { started: null };
      }
    });
    return { skipped: false, perQuery, ...result };
  },
);
