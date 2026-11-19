import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { LinkRowView } from "./view";

type Client = SupabaseClient<Database>;

/** Liens de l'utilisateur (la RLS limite à ses espaces), alertes d'abord, puis les plus récents. */
export async function listLinks(
  supabase: Client,
  siteId: string | null = null,
): Promise<{ rows: LinkRowView[]; sites: { id: string; domain: string }[] }> {
  const [{ data: links }, { data: sites }] = await Promise.all([
    supabase
      .from("links")
      .select(
        "id, site_id, source_url, source_domain, target_url, status, rel, contextual, indexable, exact_page, anchor_found, checks_done, next_check_at, first_live_at, alert",
      )
      .order("created_at", { ascending: false })
      .limit(300)
      .then((r) => ({
        ...r,
        data: siteId ? (r.data ?? []).filter((l) => l.site_id === siteId) : r.data,
      })),
    supabase.from("sites").select("id, domain").order("domain"),
  ]);
  const rows: LinkRowView[] = (links ?? []).map((l) => ({
    id: l.id,
    sourceUrl: l.source_url,
    sourceDomain: l.source_domain,
    targetUrl: l.target_url,
    status: l.status,
    rel: l.rel,
    contextual: l.contextual,
    indexable: l.indexable,
    exactPage: l.exact_page,
    anchorFound: l.anchor_found,
    checksDone: l.checks_done,
    nextCheckAt: l.next_check_at,
    firstLiveAt: l.first_live_at,
    alert: l.alert,
  }));
  rows.sort((a, b) => Number(!!b.alert) - Number(!!a.alert));
  return { rows, sites: sites ?? [] };
}
