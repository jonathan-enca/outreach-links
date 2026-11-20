import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccess, type OAuthConfig } from "@/features/google/oauth";
import { decryptSecret, type KeyRing } from "@/features/mailboxes/crypto";
import type { Database } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";
import { listProperties, normalizeDomain, pickProperty } from "./api";

type Client = SupabaseClient<Database>;

/**
 * Search Console déjà connectée ailleurs (accueil, autre campagne) : on cherche l'adresse saisie à
 * l'étape 1 parmi les sites des comptes Google de l'espace, sans repasser par Google.
 * - `found` : le compte a ce site (encadré vert) ;
 * - `missing` : un compte est connecté, mais aucun n'a ce site (encadré orange) ;
 * - `none` : aucun compte utilisable (encadré bleu « Connecter »).
 */
export type SearchConsoleMatch =
  | { status: "none" }
  | { status: "missing"; email: string }
  | { status: "found"; email: string; property: string; fromSiteId: string };

export interface SearchConsoleMatchDeps {
  /** Client de service : la table des connexions n'est lisible que par lui. */
  db: Client;
  config: OAuthConfig | null;
  keyRing: () => KeyRing;
  fetchFn?: typeof fetch;
}

/** Une connexion par compte Google (la plus récente), jamais le jeton en clair hors de cette fonction. */
export async function findSearchConsoleMatch(
  workspaceId: string,
  rawDomain: string,
  deps: SearchConsoleMatchDeps,
): Promise<SearchConsoleMatch> {
  const domain = normalizeDomain(rawDomain);
  if (!deps.config || !domain.includes(".")) return { status: "none" };
  const { data } = await deps.db
    .from("search_console_connections")
    .select("site_id, google_email, refresh_token_enc, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  const accounts = new Map<string, { siteId: string; token: string }>();
  for (const row of data ?? []) {
    const key = row.google_email.toLowerCase();
    if (!accounts.has(key))
      accounts.set(key, { siteId: row.site_id, token: row.refresh_token_enc });
  }
  let missing: string | null = null;
  for (const [email, account] of accounts) {
    try {
      const access = await refreshAccess(
        deps.config,
        decryptSecret(account.token, deps.keyRing()),
        deps.fetchFn,
      );
      if (!access) continue;
      const properties = await listProperties(access, deps.fetchFn);
      if (!properties) continue;
      const property = pickProperty(domain, properties);
      if (property) return { status: "found", email, property, fromSiteId: account.siteId };
      missing ??= email;
    } catch (e) {
      logger.warn("search console : compte connecté illisible", {
        error: (e as Error).message.slice(0, 200),
      });
    }
  }
  return missing ? { status: "missing", email: missing } : { status: "none" };
}

/**
 * Relie une campagne à la Search Console d'un compte déjà connecté qui a ce site : copie la connexion
 * (même jeton chiffré, même compte), avec la propriété du site. Ne touche pas une connexion existante.
 */
export async function linkSearchConsole(
  site: { id: string; workspaceId: string; domain: string },
  deps: SearchConsoleMatchDeps,
): Promise<boolean> {
  const { data: existing } = await deps.db
    .from("search_console_connections")
    .select("site_id")
    .eq("site_id", site.id)
    .maybeSingle();
  if (existing) return true;
  const match = await findSearchConsoleMatch(site.workspaceId, site.domain, deps);
  if (match.status !== "found") return false;
  const { data: source } = await deps.db
    .from("search_console_connections")
    .select("google_email, refresh_token_enc, key_version, scopes")
    .eq("site_id", match.fromSiteId)
    .maybeSingle();
  if (!source) return false;
  const { error } = await deps.db.from("search_console_connections").insert({
    site_id: site.id,
    workspace_id: site.workspaceId,
    google_email: source.google_email,
    property: match.property,
    refresh_token_enc: source.refresh_token_enc,
    key_version: source.key_version,
    scopes: source.scopes,
  });
  return !error;
}
