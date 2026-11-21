import { buildBacklinksCsv, parseScope } from "@/features/backlinks/export";
import { betaEnabled } from "@/features/audits/beta";
import { exportLockedMessage, loadEntitlements } from "@/features/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Export CSV des backlinks d'un audit : ?portee=propres (défaut) ou ?portee=tout. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Introuvable", { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non connecté", { status: 401 });

  // L'export est un droit de l'offre (gratuit : refusé, avec l'offre qui le débloque).
  const { data: audit } = await supabase
    .from("audits")
    .select("workspace_id")
    .eq("id", id)
    .maybeSingle();
  if (!audit) return new Response("Introuvable", { status: 404 });
  const ent = await loadEntitlements(supabase, audit.workspace_id, new Date(), betaEnabled());
  if (!ent.exportCsv) return new Response(exportLockedMessage(), { status: 403 });

  const scope = parseScope(new URL(request.url).searchParams.get("portee"));
  const out = await buildBacklinksCsv(supabase, id, scope);
  if (!out) return new Response("Introuvable", { status: 404 });

  const safe = out.domain.replace(/[^a-z0-9.-]/gi, "_");
  return new Response(out.csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="backlinks-${safe}-${scope}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
