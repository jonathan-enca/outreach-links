import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, type KeyRing } from "@/features/mailboxes/crypto";

/** Envoi (sensible) et lecture des réponses (restreint) : les deux autorisations demandées en G1. */
export const GOOGLE_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GOOGLE_READ_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const GOOGLE_SCOPES = [GOOGLE_SEND_SCOPE, GOOGLE_READ_SCOPE] as const;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
const STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthState {
  siteId: string;
  userId: string;
  nonce: string;
  exp: number;
}

export const newNonce = () => randomBytes(16).toString("base64url");

/**
 * Le paramètre `state` est chiffré et authentifié (AES-GCM, même anneau de clés que les boîtes) :
 * personne ne peut le fabriquer ni le modifier. Il porte le site, la personne, un nonce (aussi posé
 * en cookie httpOnly : l'autorisation ne vaut que dans le navigateur qui l'a demandée) et une expiration.
 */
export function signState(
  p: Omit<OAuthState, "exp">,
  ring: KeyRing,
  now: number = Date.now(),
): string {
  return encryptSecret(JSON.stringify({ ...p, exp: now + STATE_TTL_MS }), ring).value;
}

export function readState(
  token: string | null | undefined,
  ring: KeyRing,
  now: number = Date.now(),
): OAuthState | null {
  if (!token) return null;
  try {
    const s = JSON.parse(decryptSecret(token, ring)) as Partial<OAuthState>;
    if (
      typeof s.siteId !== "string" ||
      typeof s.userId !== "string" ||
      typeof s.nonce !== "string" ||
      typeof s.exp !== "number" ||
      s.exp < now
    )
      return null;
    return { siteId: s.siteId, userId: s.userId, nonce: s.nonce, exp: s.exp };
  } catch {
    return null;
  }
}

/** Adresse de consentement Google. `access_type=offline` + `prompt=consent` : on reçoit toujours un jeton de renouvellement. */
export function buildAuthUrl(cfg: OAuthConfig, state: string, loginHint?: string): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "false");
  u.searchParams.set("state", state);
  if (loginHint) u.searchParams.set("login_hint", loginHint);
  return u.toString();
}

/** Vrai si la personne a laissé cochées les deux autorisations (elle peut en décocher une sur l'écran Google). */
export function hasRequiredScopes(granted: string | undefined | null): boolean {
  const have = new Set((granted ?? "").split(/\s+/));
  return GOOGLE_SCOPES.every((s) => have.has(s));
}

type Fetch = typeof fetch;
export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
}

export async function exchangeCode(
  cfg: OAuthConfig,
  code: string,
  fetchFn: Fetch = fetch,
): Promise<TokenSet | null> {
  const res = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
  };
  if (!j.access_token) return null;
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? null,
    scope: j.scope ?? "",
  };
}

/** Adresse du compte qui vient d'autoriser (Gmail `users.me.profile`, couvert par gmail.readonly). */
export async function fetchGmailAddress(
  accessToken: string,
  fetchFn: Fetch = fetch,
): Promise<string | null> {
  const res = await fetchFn(PROFILE_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { emailAddress?: string };
  return j.emailAddress ? j.emailAddress.trim().toLowerCase() : null;
}
