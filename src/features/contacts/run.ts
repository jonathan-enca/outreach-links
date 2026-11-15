import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { CONTACT_LIMITS } from "./limits";
import type { ContactItem, ContactResult } from "./types";

type Client = SupabaseClient<Database>;

export const CONTACTS_EVENT = "plan/contacts.requested";

export interface ContactRun {
  planId: string;
  workspaceId: string;
  auditId: string;
}

/** en_cours -> null si l'enquête ne doit pas tourner (idempotent). */
export async function beginContacts(service: Client, planId: string): Promise<ContactRun | null> {
  const { data: run, error } = await service
    .from("contact_runs")
    .select("plan_id, workspace_id, status")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw new Error(`beginContacts : ${error.message}`);
  if (!run || run.status !== "en_cours") return null;
  const { data: plan } = await service
    .from("link_plans")
    .select("audit_id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return null;
  return { planId, workspaceId: run.workspace_id, auditId: plan.audit_id };
}

export interface SuppressionList {
  emails: string[];
  domains: string[];
}

/** Cibles « ok » du tri (page lue en HTTP 200) et liste de suppression du workspace + globale. */
export async function loadContactInput(
  service: Client,
  run: ContactRun,
): Promise<{ items: ContactItem[]; skipped: number; suppressions: SuppressionList }> {
  const [triageRes, supRes] = await Promise.all([
    service
      .from("link_target_triage")
      .select("plan_item_id, resolved_url, link_plan_items(source_domain, position)")
      .eq("plan_id", run.planId)
      .eq("verdict", "ok")
      .limit(500),
    service
      .from("suppressions")
      .select("email, domain, workspace_id")
      .or(`workspace_id.eq.${run.workspaceId},workspace_id.is.null`)
      .limit(5000),
  ]);
  if (triageRes.error) throw new Error(`loadContactInput : ${triageRes.error.message}`);
  const rows = (triageRes.data ?? [])
    .map((r) => {
      const it = r.link_plan_items as unknown as { source_domain: string; position: number } | null;
      return it && r.resolved_url
        ? {
            id: r.plan_item_id,
            domain: it.source_domain,
            resolvedUrl: r.resolved_url,
            pos: it.position,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.pos - b.pos);
  const items = rows
    .slice(0, CONTACT_LIMITS.maxItems)
    .map(({ id, domain, resolvedUrl }) => ({ id, domain, resolvedUrl }));
  const sup = supRes.data ?? [];
  return {
    items,
    skipped: Math.max(0, rows.length - items.length),
    suppressions: {
      emails: sup.flatMap((s) => (s.email ? [s.email.toLowerCase()] : [])),
      domains: sup.flatMap((s) => (s.domain ? [s.domain.toLowerCase().replace(/^www\./, "")] : [])),
    },
  };
}

export function makeSuppressionCheck(list: SuppressionList) {
  const emails = new Set(list.emails);
  const domains = new Set(list.domains);
  return (email: string | null, domain: string): boolean => {
    const d = domain.toLowerCase().replace(/^www\./, "");
    if (domains.has(d)) return true;
    if (!email) return false;
    const e = email.toLowerCase();
    return emails.has(e) || domains.has(e.split("@")[1] ?? "");
  };
}

/** Écrit (ou remplace) le contact d'une cible ; crée la tâche manuelle d'un formulaire. */
export async function saveContact(service: Client, run: ContactRun, r: ContactResult) {
  const { error } = await service.from("target_contacts").upsert(
    {
      plan_item_id: r.itemId,
      plan_id: run.planId,
      workspace_id: run.workspaceId,
      status: r.status,
      email: r.email,
      email_source: r.emailSource,
      verification: r.verification,
      verifier: r.verifier,
      contact_url: r.contactUrl,
      form_url: r.formUrl,
      reason: r.reason,
      sendable: r.sendable,
      assessed_at: new Date().toISOString(),
    },
    { onConflict: "plan_item_id" },
  );
  if (error) throw new Error(`saveContact : ${error.message}`);
  if (r.status === "formulaire" && r.formUrl) {
    // Idempotent : une tâche existante (même « fait ») n'est jamais écrasée.
    const { error: te } = await service.from("manual_tasks").upsert(
      {
        plan_item_id: r.itemId,
        plan_id: run.planId,
        workspace_id: run.workspaceId,
        type: "formulaire",
        form_url: r.formUrl,
      },
      { onConflict: "plan_item_id", ignoreDuplicates: true },
    );
    if (te) throw new Error(`saveContact (tâche) : ${te.message}`);
  }
}

export interface ContactStats {
  processed: number;
  skipped: number;
  byStatus: Record<string, number>;
  sendable: number;
  paidCalls: number;
  /** Cibles avec un moyen de contact (email ou formulaire) / cibles traitées. */
  contactRate: number;
}

export function summarize(results: ContactResult[], skipped: number): ContactStats {
  const byStatus: Record<string, number> = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const reachable = results.filter((r) => r.status === "formulaire" || r.email !== null).length;
  return {
    processed: results.length,
    skipped,
    byStatus,
    sendable: results.filter((r) => r.sendable).length,
    paidCalls: results.reduce((s, r) => s + r.paidCalls, 0),
    contactRate: results.length ? Math.round((reachable / results.length) * 100) / 100 : 0,
  };
}

export async function finalizeContacts(service: Client, run: ContactRun, stats: ContactStats) {
  const { error } = await service
    .from("contact_runs")
    .update({
      status: "termine",
      finished_at: new Date().toISOString(),
      stats: stats as unknown as Json,
      error_message: null,
    })
    .eq("plan_id", run.planId)
    .eq("status", "en_cours");
  if (error) throw new Error(`finalizeContacts : ${error.message}`);
}

export async function failContacts(service: Client, planId: string, message: string) {
  await service
    .from("contact_runs")
    .update({
      status: "echoue",
      finished_at: new Date().toISOString(),
      error_message: message.slice(0, 300),
    })
    .eq("plan_id", planId)
    .eq("status", "en_cours");
}
