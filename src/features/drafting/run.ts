import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { CataloguePage } from "./catalogue";
import type { CatalogueEntry } from "./shortlist";
import { DRAFT_LIMITS } from "./limits";
import type { DraftBrief, DraftContext, DraftDecline, DraftItem, DraftResult } from "./types";

type Client = SupabaseClient<Database>;

export const DRAFTS_EVENT = "plan/drafts.requested";

export interface DraftRun {
  planId: string;
  workspaceId: string;
  auditId: string;
}

export async function beginDrafts(service: Client, planId: string): Promise<DraftRun | null> {
  const { data: run, error } = await service
    .from("draft_runs")
    .select("plan_id, workspace_id, status")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw new Error(`beginDrafts : ${error.message}`);
  if (!run || run.status !== "en_cours") return null;
  const { data: plan } = await service
    .from("link_plans")
    .select("audit_id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return null;
  return { planId, workspaceId: run.workspace_id, auditId: plan.audit_id };
}

/**
 * Cibles contactables (email trouvé, même à vérifier, ou formulaire) dont la page a été lue au tri.
 * Une cible qui a déjà son message, ou qui a été écartée faute d'angle, n'est pas reprise : relancer
 * la rédaction ne traite que les cibles restantes.
 */
export async function loadDraftInput(
  service: Client,
  run: DraftRun,
): Promise<{
  items: DraftItem[];
  skipped: number;
  ctx: DraftContext | null;
  siteId: string;
}> {
  const [contactsRes, triageRes, itemsRes, siteRes, briefsRes, writtenRes, declinedRes] =
    await Promise.all([
      service
        .from("target_contacts")
        .select("plan_item_id, status")
        .eq("plan_id", run.planId)
        .in("status", ["email_verifie", "email_a_verifier", "formulaire"])
        .limit(500),
      service
        .from("link_target_triage")
        .select("plan_item_id, hook, page_title, resolved_url")
        .eq("plan_id", run.planId)
        .eq("verdict", "ok")
        .limit(500),
      service.from("link_plan_items").select("*").eq("plan_id", run.planId).limit(500),
      service
        .from("audits")
        .select("sites(id, domain, niche, language, offered_asset, signature_first_name)")
        .eq("id", run.auditId)
        .maybeSingle(),
      service
        .from("plan_item_briefs")
        .select("plan_item_id, brief")
        .eq("plan_id", run.planId)
        .limit(500),
      // Messages déjà écrits : jamais réécrits (un message modifié ou validé par la personne est gardé).
      service.from("target_drafts").select("plan_item_id").eq("plan_id", run.planId).limit(1000),
      service
        .from("draft_declines")
        .select("plan_item_id, retry_requested")
        .eq("plan_id", run.planId)
        .limit(1000),
    ]);
  if (contactsRes.error) throw new Error(`loadDraftInput : ${contactsRes.error.message}`);
  if (declinedRes.error) throw new Error(`loadDraftInput : ${declinedRes.error.message}`);
  // Déjà traitées : message écrit, ou cible écartée (sauf si la personne a demandé « rédiger quand même »).
  const forced = new Set(
    (declinedRes.data ?? []).filter((d) => d.retry_requested).map((d) => d.plan_item_id),
  );
  const written = new Set(
    [...(writtenRes.data ?? []), ...(declinedRes.data ?? []).filter((d) => !d.retry_requested)].map(
      (d) => d.plan_item_id,
    ),
  );
  if (briefsRes.error) throw new Error(`loadDraftInput : ${briefsRes.error.message}`);
  const briefs = new Map(
    (briefsRes.data ?? []).map((b) => [b.plan_item_id, b.brief as unknown as DraftBrief]),
  );
  const site = siteRes.data?.sites as unknown as {
    id: string;
    domain: string;
    niche: string | null;
    language: string;
    offered_asset: string | null;
    signature_first_name: string | null;
  } | null;
  if (!site) throw new Error("loadDraftInput : site introuvable");
  const ctx: DraftContext | null = site.signature_first_name?.trim()
    ? {
        siteDomain: site.domain,
        niche: site.niche,
        language: site.language,
        offeredAsset: site.offered_asset,
        signatureFirstName: site.signature_first_name.trim(),
      }
    : null;
  const triage = new Map((triageRes.data ?? []).map((r) => [r.plan_item_id, r]));
  const planItems = new Map((itemsRes.data ?? []).map((r) => [r.id, r]));
  const all: (DraftItem & { pos: number })[] = [];
  for (const c of contactsRes.data ?? []) {
    const tr = triage.get(c.plan_item_id);
    const it = planItems.get(c.plan_item_id);
    if (!tr || !it || !tr.resolved_url || written.has(c.plan_item_id)) continue;
    const brief = briefs.get(c.plan_item_id) ?? null;
    const hook = tr.hook?.trim() || tr.page_title?.trim() || "";
    all.push({
      id: it.id,
      domain: it.source_domain,
      type: it.type,
      expectedLinkType: it.expected_link_type,
      offer: it.offer,
      rationale: it.rationale,
      targetPageUrl: it.target_page_url,
      anchorText: it.anchor_text,
      brokenUrl: it.broken_url,
      channel: c.status === "formulaire" ? "formulaire" : "email",
      pageUrl: tr.resolved_url,
      pageTitle: tr.page_title,
      hook,
      brief,
      force: forced.has(it.id) || undefined,
      pos: it.position,
    });
  }
  all.sort((a, b) => Number(!!b.force) - Number(!!a.force) || a.pos - b.pos);
  const items = all.slice(0, DRAFT_LIMITS.maxItems).map((x) => {
    const rest: DraftItem & { pos?: number } = { ...x };
    delete rest.pos;
    return rest as DraftItem;
  });
  return { items, skipped: Math.max(0, all.length - items.length), ctx, siteId: site.id };
}

/**
 * Catalogue COMPLET du site (MC.6e) : tout le sitemap plus les pages visitées (titre, titre principal,
 * description), sans le texte. Null s'il est absent ou trop vieux : il faut alors le (re)construire.
 */
export async function loadCatalogueEntries(
  service: Client,
  siteId: string,
  now: Date = new Date(),
): Promise<CatalogueEntry[] | null> {
  const { data, error } = await service
    .from("site_catalogue")
    .select("url, title, heading, description, read_at")
    .eq("site_id", siteId)
    .order("url")
    .limit(1_000);
  if (error) throw new Error(`loadCatalogueEntries : ${error.message}`);
  if (!data || data.length === 0) return null;
  const oldest = Math.min(...data.map((r) => new Date(r.read_at).getTime()));
  if (now.getTime() - oldest > DRAFT_LIMITS.catalogueMaxAgeDays * 86_400_000) return null;
  return data.map((r) => ({
    url: r.url,
    title: r.title,
    heading: r.heading || undefined,
    description: r.description,
  }));
}

/** Texte des pages du site déjà lues (le rédacteur lit en entier les 1 à 3 pages candidates). */
export async function loadSitePages(
  service: Client,
  siteId: string,
  urls: readonly string[],
): Promise<CataloguePage[]> {
  if (urls.length === 0) return [];
  const { data, error } = await service
    .from("site_pages")
    .select("url, title, description, content")
    .eq("site_id", siteId)
    .in("url", [...urls]);
  if (error) throw new Error(`loadSitePages : ${error.message}`);
  return (data ?? []).map((r) => ({
    url: r.url,
    title: r.title,
    description: r.description,
    text: r.content,
  }));
}

/** Vide le catalogue avant une reconstruction (les pages disparues du site n'y restent pas). */
export async function clearCatalogue(service: Client, siteId: string) {
  for (const table of ["site_pages", "site_catalogue"] as const) {
    const { error } = await service.from(table).delete().eq("site_id", siteId);
    if (error) throw new Error(`clearCatalogue : ${error.message}`);
  }
}

/** Enregistre les adresses du sitemap (sans titre) : le catalogue complet, avant toute lecture. */
export async function saveCatalogueUrls(
  service: Client,
  siteId: string,
  workspaceId: string,
  urls: readonly string[],
) {
  const now = new Date().toISOString();
  for (let i = 0; i < urls.length; i += 500) {
    const { error } = await service.from("site_catalogue").upsert(
      urls.slice(i, i + 500).map((url) => ({
        site_id: siteId,
        workspace_id: workspaceId,
        url,
        source: "sitemap",
        read_at: now,
      })),
      { onConflict: "site_id,url", ignoreDuplicates: true },
    );
    if (error) throw new Error(`saveCatalogueUrls : ${error.message}`);
  }
}

/** Pages visitées : texte pour le rédacteur, et titre, titre principal et description au catalogue. */
export async function saveCataloguePages(
  service: Client,
  siteId: string,
  workspaceId: string,
  pages: readonly CataloguePage[],
) {
  if (pages.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await service.from("site_pages").upsert(
    pages.map((p) => ({
      site_id: siteId,
      workspace_id: workspaceId,
      url: p.url,
      title: p.title,
      description: p.description,
      content: p.text,
      read_at: now,
    })),
    { onConflict: "site_id,url" },
  );
  if (error) throw new Error(`saveCataloguePages : ${error.message}`);
  const { error: ce } = await service.from("site_catalogue").upsert(
    pages.map((p) => ({
      site_id: siteId,
      workspace_id: workspaceId,
      url: p.url,
      title: p.title,
      heading: p.heading ?? "",
      description: p.description,
      source: "lue",
      read_at: now,
    })),
    { onConflict: "site_id,url" },
  );
  if (ce) throw new Error(`saveCataloguePages (catalogue) : ${ce.message}`);
}

/** Garde la décision « pas d'angle » : la cible ne sera pas rejouée, et l'utilisateur voit le motif. */
export async function saveDecline(
  service: Client,
  run: DraftRun,
  d: DraftDecline,
  pageUrl: string,
) {
  const { error } = await service.from("draft_declines").upsert(
    {
      plan_item_id: d.itemId,
      plan_id: run.planId,
      workspace_id: run.workspaceId,
      reason: d.reason.slice(0, 1000),
      declined_by: d.by,
      page_url: pageUrl,
      cost_usd: d.costUsd,
      retry_requested: false,
    },
    { onConflict: "plan_item_id" },
  );
  if (error) throw new Error(`saveDecline : ${error.message}`);
}

/** Messages déjà écrits du plan (pour le contrôle des doublons à la reprise d'un step). */
export async function loadWrittenBodies(
  service: Client,
  planId: string,
  exceptItemId: string,
): Promise<string[]> {
  const { data } = await service
    .from("target_drafts")
    .select("plan_item_id, body")
    .eq("plan_id", planId)
    .limit(500);
  return (data ?? []).filter((d) => d.plan_item_id !== exceptItemId).map((d) => d.body);
}

/** Écrit (ou remplace) le brouillon ; renseigne le message pré-rédigé d'une tâche manuelle. */
export async function saveDraft(service: Client, run: DraftRun, r: DraftResult) {
  const { error } = await service.from("target_drafts").upsert(
    {
      plan_item_id: r.itemId,
      plan_id: run.planId,
      workspace_id: run.workspaceId,
      channel: r.channel,
      subject: r.subject,
      body: r.body,
      hook: r.hook,
      targeting_reason: r.targetingReason,
      proposed_url: r.proposedUrl,
      url_status: r.urlStatus,
      url_checked_at: new Date().toISOString(),
      lint_issues: r.issues as unknown as Json,
      ready: r.ready,
      review_note: r.reviewNote,
      cost_usd: r.costUsd,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "plan_item_id" },
  );
  if (error) throw new Error(`saveDraft : ${error.message}`);
  // Une cible écartée puis rédigée « quand même » n'est plus écartée.
  const { error: de } = await service.from("draft_declines").delete().eq("plan_item_id", r.itemId);
  if (de) throw new Error(`saveDraft (écartée) : ${de.message}`);
  if (r.channel === "formulaire") {
    // Seule une tâche encore « à faire » reçoit le message : une tâche faite n'est pas touchée.
    const { error: te } = await service
      .from("manual_tasks")
      .update({ message: r.body })
      .eq("plan_item_id", r.itemId)
      .eq("status", "a_faire");
    if (te) throw new Error(`saveDraft (tâche) : ${te.message}`);
  }
}

export interface DraftStats {
  drafted: number;
  /** Cibles écartées : aucune raison honnête de demander un lien. */
  declined: number;
  skipped: number;
  notDrafted: number;
  ready: number;
  withIssues: number;
  email: number;
  formulaire: number;
}

export function summarize(
  results: DraftResult[],
  notDrafted: number,
  skipped: number,
  declined = 0,
): DraftStats {
  return {
    drafted: results.length,
    declined,
    skipped,
    notDrafted,
    ready: results.filter((r) => r.ready).length,
    withIssues: results.filter((r) => !r.ready).length,
    email: results.filter((r) => r.channel === "email").length,
    formulaire: results.filter((r) => r.channel === "formulaire").length,
  };
}

export async function finalizeDrafts(
  service: Client,
  run: DraftRun,
  stats: DraftStats,
  costUsd: number,
) {
  const { error } = await service
    .from("draft_runs")
    .update({
      status: "termine",
      finished_at: new Date().toISOString(),
      stats: stats as unknown as Json,
      cost_usd: costUsd,
      error_message: null,
    })
    .eq("plan_id", run.planId)
    .eq("status", "en_cours");
  if (error) throw new Error(`finalizeDrafts : ${error.message}`);
}

export async function failDrafts(service: Client, planId: string, message: string) {
  await service
    .from("draft_runs")
    .update({
      status: "echoue",
      finished_at: new Date().toISOString(),
      error_message: message.slice(0, 300),
    })
    .eq("plan_id", planId)
    .eq("status", "en_cours");
}
