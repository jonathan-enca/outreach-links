import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { backlinksToCsv, type CsvBacklink } from "./csv";

type Client = SupabaseClient<Database>;
const PAGE = 1000;

export type ExportScope = "propres" | "tout";

export function parseScope(v: string | null): ExportScope {
  return v === "tout" ? "tout" : "propres";
}

/**
 * Lit les backlinks d'un audit avec le client de l'UTILISATEUR (la RLS limite aux
 * membres du workspace) et construit le CSV. Retourne null si l'audit est introuvable.
 */
export async function buildBacklinksCsv(
  supabase: Client,
  auditId: string,
  scope: ExportScope,
): Promise<{ csv: string; domain: string } | null> {
  const { data: audit } = await supabase
    .from("audits")
    .select("id, sites(domain)")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return null;
  const domain = (audit.sites as unknown as { domain: string } | null)?.domain ?? "audit";

  const { data: comps } = await supabase
    .from("competitors")
    .select("id, domain")
    .eq("audit_id", auditId);
  const names = new Map((comps ?? []).map((c) => [c.id, c.domain]));

  const rows: CsvBacklink[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("competitor_backlinks")
      .select("*")
      .eq("audit_id", auditId)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (scope === "propres") q = q.eq("clean_status", "garde");
    const { data, error } = await q;
    if (error) throw new Error(`export : ${error.message}`);
    for (const r of data ?? []) {
      rows.push({
        competitorDomain: names.get(r.competitor_id) ?? "",
        sourceDomain: r.source_domain,
        sourceUrl: r.source_url,
        targetUrl: r.target_url,
        anchor: r.anchor,
        itemType: r.item_type,
        dofollow: r.dofollow,
        isBroken: r.is_broken,
        spamScore: r.spam_score,
        sourceRank: r.source_rank,
        lastSeen: r.last_seen,
        cleanStatus: r.clean_status,
        reasons: r.exclusion_reasons,
      });
    }
    if (!data || data.length < PAGE) break;
  }
  return { csv: backlinksToCsv(rows), domain };
}
