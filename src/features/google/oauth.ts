import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, type KeyRing } from "@/features/mailboxes/crypto";

/** Envoi seul (sensible, pas d'audit CASA). Les réponses arrivent dans la boîte perso de l'utilisateur. */
export const GOOGLE_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
/** Identité du compte connecté (non sensibles) : pour récupérer l'adresse Gmail. */
export const GOOGLE_EMAIL_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
export const GOOGLE_SCOPES = [GOOGLE_SEND_SCOPE, ...GOOGLE_EMAIL_SCOPES] as const;
/** MQ.2 : lecture seule des données de la Search Console (requêtes, pages, positions). Demandé à part. */
export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const SEARCH_CONSOLE_SCOPES = [SEARCH_CONSOLE_SCOPE, ...GOOGLE_EMAIL_SCOPES] as const;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
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
  /** Ce que l'autorisation sert : la boîte d'envoi (défaut, G1) ou la Search Console (MQ.2). */
  purpose?: "gmail" | "search_console";
  /** Search Console connectée depuis l'étape 1 d'une campagne : le retour se fait sur cet écran. */
  back?: "demarrer";
  /** Langue choisie dans le formulaire de l'étape 1, à remettre au retour. */
  lang?: "auto" | "fr" | "en";
}

export const newNonce = () => randomBytes(16).toString("base64url");

/**
 * Le paramètre `state` est chiffré et authentifié (AES-GCM, même anneau de clés que les boîtes) :
 * personne ne peut le fabriquer ni le modifier. Il porte le site, la personne, un nonce (aussi posé
 * en cookie httpOnly : l'autorisation ne vaut que dans le navigateur qui l'a demandée) et une expiration.
 */
export function signState(
  p: Omit<OAuthState, "exp" | "purpose"> & { purpose?: OAuthState["purpose"] },
  ring: KeyRing,
  now: number = Date.now(),
): string {
  const purpose = p.purpose ?? "gmail";
  return encryptSecret(JSON.stringify({ ...p, purpose, exp: now + STATE_TTL_MS }), ring).value;
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
    const purpose = s.purpose === "search_console" ? "search_console" : "gmail";
    const back = s.back === "demarrer" ? { back: s.back } : {};
    const lang = s.lang === "auto" || s.lang === "fr" || s.lang === "en" ? { lang: s.lang } : {};
    return {
      siteId: s.siteId,
      userId: s.userId,
      nonce: s.nonce,
      exp: s.exp,
      purpose,
      ...back,
      ...lang,
    };
  } catch {
    return null;
  }
}

/** Adresse de consentement Google. `access_type=offline` + `prompt=consent` : on reçoit toujours un jeton de renouvellement. */
export function buildAuthUrl(
  cfg: OAuthConfig,
  state: string,
  loginHint?: string,
  scopes: readonly string[] = GOOGLE_SCOPES,
): string {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", cfg.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scopes.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "false");
  u.searchParams.set("state", state);
  if (loginHint) u.searchParams.set("login_hint", loginHint);
  return u.toString();
}

/** Vrai si la personne a laissé cochées les deux autorisations (elle peut en décocher une sur l'écran Google). */
export function hasRequiredScopes(
  granted: string | undefined | null,
  required: readonly string[] = GOOGLE_SCOPES,
): boolean {
  const have = new Set((granted ?? "").split(/\s+/));
  return required.every((s) => have.has(s));
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

/** Adresse du compte qui vient d'autoriser (OpenID userinfo, couvert par le scope userinfo.email). */
export async function fetchGmailAddress(
  accessToken: string,
  fetchFn: Fetch = fetch,
): Promise<string | null> {
  const res = await fetchFn(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { email?: string };
  return j.email ? j.email.trim().toLowerCase() : null;
}

/** Jeton d'accès à partir du jeton de renouvellement (MQ.2 : la Search Console). Null si Google refuse. */
export async function refreshAccess(
  cfg: OAuthConfig,
  refreshToken: string,
  fetchFn: Fetch = fetch,
): Promise<string | null> {
  const res = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string };
  return j.access_token ?? null;
}
