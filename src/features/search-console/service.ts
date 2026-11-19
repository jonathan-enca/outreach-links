import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { encryptSecret, type KeyRing } from "@/features/mailboxes/crypto";
import {
  exchangeCode,
  fetchGmailAddress,
  hasRequiredScopes,
  SEARCH_CONSOLE_SCOPES,
  type OAuthConfig,
  type OAuthState,
} from "@/features/google/oauth";
import { listProperties, pickProperty } from "./api";

type Client = SupabaseClient<Database>;

export type SearchConsoleConnectResult =
  | { ok: true; email: string; property: string; reconnected: boolean }
  | {
      ok: false;
      reason: "user" | "site" | "token" | "scopes" | "no_refresh" | "profile" | "property" | "save";
    };

export interface SearchConsoleDeps {
  config: OAuthConfig;
  keyRing: () => KeyRing;
  getServiceClient: () => Client;
  fetchFn?: typeof fetch;
}

/**
 * Fin de l'autorisation Search Console (MQ.2) : échange le code, vérifie la lecture seule, retrouve
 * la propriété du site et enregistre la connexion (jeton de renouvellement chiffré). Le site doit
 * appartenir à la personne du `state` (vérifié avec son propre client, RLS).
 */
export async function completeSearchConsoleConnect(
  supabase: Client,
  state: OAuthState,
  code: string,
  deps: SearchConsoleDeps,
): Promise<SearchConsoleConnectResult> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== state.userId) return { ok: false, reason: "user" };
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id, domain")
    .eq("id", state.siteId)
    .maybeSingle();
  if (!site) return { ok: false, reason: "site" };

  const tokens = await exchangeCode(deps.config, code, deps.fetchFn);
  if (!tokens) return { ok: false, reason: "token" };
  if (!hasRequiredScopes(tokens.scope, SEARCH_CONSOLE_SCOPES))
    return { ok: false, reason: "scopes" };
  if (!tokens.refreshToken) return { ok: false, reason: "no_refresh" };
  const email = await fetchGmailAddress(tokens.accessToken, deps.fetchFn);
  if (!email) return { ok: false, reason: "profile" };
  const properties = await listProperties(tokens.accessToken, deps.fetchFn);
  if (!properties) return { ok: false, reason: "profile" };
  const property = pickProperty(site.domain, properties);
  if (!property) return { ok: false, reason: "property" };

  let enc: { value: string; version: string };
  try {
    enc = encryptSecret(tokens.refreshToken, deps.keyRing());
  } catch {
    return { ok: false, reason: "save" };
  }
  const db = deps.getServiceClient();
  const { data: existing } = await db
    .from("search_console_connections")
    .select("site_id")
    .eq("site_id", site.id)
    .maybeSingle();
  const { error } = await db.from("search_console_connections").upsert(
    {
      site_id: site.id,
      workspace_id: site.workspace_id,
      google_email: email,
      property,
      refresh_token_enc: enc.value,
      key_version: enc.version,
      scopes: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "site_id" },
  );
  if (error) return { ok: false, reason: "save" };
  return { ok: true, email, property, reconnected: Boolean(existing) };
}
