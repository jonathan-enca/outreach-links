import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { betaEnabled } from "@/features/audits/beta";
import { loadEntitlements } from "@/features/billing/entitlements";
import { encryptSecret, type KeyRing } from "@/features/mailboxes/crypto";
import {
  exchangeCode,
  fetchGmailAddress,
  hasRequiredScopes,
  type OAuthConfig,
  type OAuthState,
} from "./oauth";

type Client = SupabaseClient<Database>;

export type GoogleConnectResult =
  | { ok: true; email: string; reconnected: boolean }
  | {
      ok: false;
      reason: "scopes" | "no_refresh" | "token" | "profile" | "site" | "save" | "user" | "plan";
    };

export interface GoogleDeps {
  config: OAuthConfig;
  keyRing: () => KeyRing;
  getServiceClient: () => Client;
  fetchFn?: typeof fetch;
}

/**
 * Fin de l'autorisation : échange le code, vérifie les autorisations, enregistre la boîte et ses jetons
 * (chiffrés). La boîte est « verifiee » : le moteur l'utilise (envoi et lecture par l'API Gmail, voir gmail.ts).
 * `supabase` est le client de la personne (RLS) : elle doit voir le site et être celle du `state`.
 */
export async function completeGoogleConnect(
  supabase: Client,
  state: OAuthState,
  code: string,
  deps: GoogleDeps,
): Promise<GoogleConnectResult> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== state.userId) return { ok: false, reason: "user" };
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id")
    .eq("id", state.siteId)
    .maybeSingle();
  if (!site) return { ok: false, reason: "site" };

  const tokens = await exchangeCode(deps.config, code, deps.fetchFn);
  if (!tokens) return { ok: false, reason: "token" };
  if (!hasRequiredScopes(tokens.scope)) return { ok: false, reason: "scopes" };
  if (!tokens.refreshToken) return { ok: false, reason: "no_refresh" };
  const email = await fetchGmailAddress(tokens.accessToken, deps.fetchFn);
  if (!email) return { ok: false, reason: "profile" };

  let enc: { value: string; version: string };
  try {
    enc = encryptSecret(tokens.refreshToken, deps.keyRing());
  } catch {
    return { ok: false, reason: "save" };
  }
  const db = deps.getServiceClient();

  const { data: existing } = await db
    .from("mailboxes")
    .select("id")
    .eq("workspace_id", site.workspace_id)
    .eq("email", email)
    .maybeSingle();
  let mailboxId = existing?.id;
  const reconnected = Boolean(existing);
  if (existing) {
    await db
      .from("mailboxes")
      .update({
        provider: "google",
        status: "verifiee",
        smtp_ok: true,
        imap_ok: true,
        last_error: null,
        last_test_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  }
  if (!mailboxId) {
    // Plafond de boîtes d'envoi du forfait (gratuit : aucune) : refus avant toute création.
    const ent = await loadEntitlements(db, site.workspace_id, new Date(), betaEnabled());
    const { data: boxes } = await db
      .from("mailboxes")
      .select("id")
      .eq("workspace_id", site.workspace_id);
    if ((boxes?.length ?? 0) >= ent.maxMailboxes) return { ok: false, reason: "plan" };
    const { data: created, error } = await db
      .from("mailboxes")
      .insert({
        workspace_id: site.workspace_id,
        site_id: site.id,
        email,
        from_name: email.split("@")[0].slice(0, 80),
        // Colonnes SMTP/IMAP obligatoires : valeurs de Gmail, sans mot de passe (jamais utilisées pour une boîte Google).
        username: email,
        password_enc: "-",
        key_version: "-",
        smtp_host: "smtp.gmail.com",
        smtp_port: 465,
        imap_host: "imap.gmail.com",
        imap_port: 993,
        provider: "google",
        // Les jetons viennent d'être obtenus et l'adresse lue : la boîte est prête (envoi et lecture par Gmail).
        status: "verifiee",
        smtp_ok: true,
        imap_ok: true,
        last_test_at: new Date().toISOString(),
        created_by: state.userId,
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, reason: "save" };
    mailboxId = created.id;
    const { error: linkError } = await db
      .from("mailbox_sites")
      .insert({ mailbox_id: mailboxId, site_id: site.id, workspace_id: site.workspace_id });
    if (linkError) {
      await db.from("mailboxes").delete().eq("id", mailboxId);
      return { ok: false, reason: "save" };
    }
  }
  const { error: tokenError } = await db.from("mailbox_google_tokens").upsert({
    mailbox_id: mailboxId,
    workspace_id: site.workspace_id,
    refresh_token_enc: enc.value,
    key_version: enc.version,
    scopes: tokens.scope,
    updated_at: new Date().toISOString(),
  });
  if (tokenError) {
    if (!reconnected) await db.from("mailboxes").delete().eq("id", mailboxId);
    return { ok: false, reason: "save" };
  }
  return { ok: true, email, reconnected };
}
