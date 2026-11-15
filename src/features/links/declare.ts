import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { nextCheckAt } from "./service";

type Client = SupabaseClient<Database>;
const M = t.links.messages;

/** Au plus 200 liens suivis par site : borne le volume de pages relues. */
export const MAX_LINKS_PER_SITE = 200;

const host = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");

function parseHttp(raw: unknown): URL | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

/**
 * Déclare un lien posé (page source -> page du site) : la vérification démarre à J+7. La page du
 * site est limitée au domaine du site choisi ; la page source doit être un autre domaine. La
 * lecture du site passe par la RLS (l'utilisateur doit en être membre), l'écriture par le service.
 */
export async function declareLink(
  supabase: Client,
  serviceClient: () => Client,
  input: { siteId: unknown; sourceUrl: unknown; targetUrl: unknown; anchor?: unknown },
  now: () => Date = () => new Date(),
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.unauthenticated };
  if (typeof input.siteId !== "string") return { status: "error", message: M.siteUnknown };
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id, domain")
    .eq("id", input.siteId)
    .maybeSingle();
  if (!site) return { status: "error", message: M.siteUnknown };
  const source = parseHttp(input.sourceUrl);
  const target = parseHttp(input.targetUrl);
  if (!source) return { status: "error", message: M.sourceInvalid };
  if (!target) return { status: "error", message: M.targetInvalid };
  const siteHost = site.domain.toLowerCase().replace(/^www\./, "");
  if (host(target) !== siteHost) return { status: "error", message: M.targetNotOwned };
  if (host(source) === siteHost) return { status: "error", message: M.sourceSameSite };
  const anchor =
    typeof input.anchor === "string" && input.anchor.trim()
      ? input.anchor.trim().slice(0, 200)
      : null;

  const svc = serviceClient();
  const { count } = await svc
    .from("links")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site.id);
  if ((count ?? 0) >= MAX_LINKS_PER_SITE) return { status: "error", message: M.limit };

  const declaredAt = now().toISOString();
  const { error } = await svc.from("links").insert({
    workspace_id: site.workspace_id,
    site_id: site.id,
    source_url: source.toString(),
    source_domain: host(source),
    target_url: target.toString(),
    expected_anchor: anchor,
    origin: "manuel",
    declared_at: declaredAt,
    next_check_at: nextCheckAt(declaredAt, 0),
  });
  if (error) {
    return { status: "error", message: error.code === "23505" ? M.duplicate : M.failed };
  }
  return { status: "ok", message: M.declared };
}
