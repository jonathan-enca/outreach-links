import { z } from "zod";
import { inngest } from "@/inngest/client";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { investigateItem } from "@/features/contacts/investigate";
import { CONTACT_LIMITS } from "@/features/contacts/limits";
import { createMxVerifier, createProviderFromEnv } from "@/features/contacts/provider";
import {
  beginContacts,
  CONTACTS_EVENT,
  failContacts,
  finalizeContacts,
  loadContactInput,
  makeSuppressionCheck,
  saveContact,
  summarize,
} from "@/features/contacts/run";
import type { ContactResult } from "@/features/contacts/types";
import { createSafeFetcher } from "@/features/sites/verify";
import { createJinaFallback } from "@/features/triage/page-reader";
import { env } from "@/env";
import { recordCost } from "@/lib/costs";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const contactsEventSchema = z.object({
  planId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Job `plan.contacts` (M3.2) : cherche le contact des cibles « ok » du tri (email visible,
 * finder s'il est configuré, sinon formulaire). Un step par cible. Aucun envoi, aucun formulaire
 * rempli : les formulaires deviennent des tâches manuelles.
 */
export const planContacts = inngest.createFunction(
  {
    id: "plan-contacts",
    triggers: [{ event: CONTACTS_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = contactsEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failContacts(createServiceClient(), parsed.data.planId, error.message);
    },
  },
  async ({ event, step }) => {
    const { planId } = contactsEventSchema.parse(event.data);
    const log = logger.child({ fn: "plan-contacts", planId });

    const run = await step.run("begin", async () => beginContacts(createServiceClient(), planId));
    if (!run) {
      log.warn("recherche non exécutable (plan introuvable ou étape non lancée)");
      return { skipped: true };
    }
    const input = await step.run("load", async () => loadContactInput(createServiceClient(), run));
    const isSuppressed = makeSuppressionCheck(input.suppressions);
    const provider = createProviderFromEnv(env);

    const results: ContactResult[] = [];
    for (const [i, item] of input.items.entries()) {
      const used = results.reduce((s, r) => s + r.paidCalls, 0);
      const r = await step.run(`target-${i + 1}`, async () => {
        const service = createServiceClient();
        const res = await investigateItem(item, {
          fetch: createSafeFetcher({
            userAgent: BOT_USER_AGENT,
            maxBytes: 256 * 1024,
            accept: "text/html,*/*;q=0.5",
          }),
          sleep,
          now: () => Date.now(),
          fallback: env.PAGE_READER_FALLBACK === "jina" ? createJinaFallback() : null,
          provider,
          freeVerifier: env.EMAIL_FREE_VERIFY === "mx" ? createMxVerifier() : null,
          isSuppressed,
          paidCallsLeft: Math.max(0, CONTACT_LIMITS.maxPaidCallsPerRun - used),
        });
        await saveContact(service, run, res);
        if (res.paidCalls > 0 && provider) {
          // Crédits du fournisseur (pas des USD) : on journalise les unités, coût à 0 estimé.
          await recordCost(service, {
            workspaceId: run.workspaceId,
            auditId: run.auditId,
            provider: provider.name,
            operation: "contacts.find_verify",
            units: res.paidCalls,
            estimatedCostUsd: 0,
            metadata: { planItemId: item.id },
          });
        }
        return res;
      });
      results.push(r);
    }

    const stats = summarize(results, input.skipped);
    await step.run("finalize", async () => finalizeContacts(createServiceClient(), run, stats));
    log.info("recherche de contacts terminée", { ...stats });
    return stats;
  },
);
