import type { SupabaseClient } from "@supabase/supabase-js";
import { env as appEnv } from "@/env";
import { googleConfig } from "@/features/google/config";
import { refreshAccess, type OAuthConfig } from "@/features/google/oauth";
import { decryptSecret, type KeyRing } from "@/features/mailboxes/crypto";
import type { Database } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";
import { queryRows, SEARCH_CONSOLE_DAYS, type SearchRow } from "./api";

type Client = SupabaseClient<Database>;

/** Ce que l'audit garde de la Search Console : requêtes et pages les plus vues (lecture seule). */
export interface SearchConsoleSnapshot {
  measuredAt: string;
  property: string;
  days: number;
  queries: SearchRow[];
  pages: SearchRow[];
}

/** Statut affiché sur la page du site. Aucun jeton : la lecture ne sert qu'à l'affichage. */
export interface SearchConsoleStatus {
  property: string;
  googleEmail: string;
  connectedAt: string;
}

/** Statut de la connexion d'un site (null si non connectée). Lu avec le client serveur. */
export async function readSearchConsoleStatus(
  db: Client,
  siteId: string,
): Promise<SearchConsoleStatus | null> {
  const { data } = await db
    .from("search_console_connections")
    .select("property, google_email, connected_at")
    .eq("site_id", siteId)
    .maybeSingle();
  if (!data) return null;
  return {
    property: data.property,
    googleEmail: data.google_email,
    connectedAt: data.connected_at,
  };
}

export interface SearchConsoleReadDeps {
  db: Client;
  config: OAuthConfig | null;
  keyRing: () => KeyRing;
  fetchFn?: typeof fetch;
  now?: Date;
}

/**
 * Requêtes et pages réelles d'un site, pour l'audit. Ne lève JAMAIS : flag coupé, site non connecté,
 * jeton refusé ou panne de Google donnent `null`, et l'audit continue comme avant.
 */
export async function loadSearchConsoleSnapshot(
  siteId: string,
  deps: SearchConsoleReadDeps,
): Promise<SearchConsoleSnapshot | null> {
  try {
    if (!deps.config) return null;
    const { data } = await deps.db
      .from("search_console_connections")
      .select("property, refresh_token_enc")
      .eq("site_id", siteId)
      .maybeSingle();
    if (!data) return null;
    const refresh = decryptSecret(data.refresh_token_enc, deps.keyRing());
    const access = await refreshAccess(deps.config, refresh, deps.fetchFn);
    if (!access) return null;
    const [queries, pages] = await Promise.all([
      queryRows(access, data.property, "query", deps.now, deps.fetchFn),
      queryRows(access, data.property, "page", deps.now, deps.fetchFn),
    ]);
    if (!queries || !pages) return null;
    return {
      measuredAt: (deps.now ?? new Date()).toISOString(),
      property: data.property,
      days: SEARCH_CONSOLE_DAYS,
      queries,
      pages,
    };
  } catch (e) {
    logger.warn("search console non lue, audit sans elle", {
      siteId,
      error: (e as Error).message.slice(0, 200),
    });
    return null;
  }
}

/** Activée seulement si SEARCH_CONSOLE_ENABLED et Google OAuth configuré (G4 non faite : désactivée). */
export function searchConsoleEnabled(): boolean {
  return appEnv.SEARCH_CONSOLE_ENABLED && googleConfig() !== null;
}
