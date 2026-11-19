import { env as appEnv } from "@/env";
import type { OAuthConfig } from "./oauth";

type GoogleEnv = Pick<
  typeof appEnv,
  | "GOOGLE_OAUTH_ENABLED"
  | "GOOGLE_OAUTH_CLIENT_ID"
  | "GOOGLE_OAUTH_CLIENT_SECRET"
  | "NEXT_PUBLIC_APP_URL"
>;

/** Configuration OAuth, ou null si le drapeau est coupé ou le client Google non renseigné. */
export function googleConfig(env: GoogleEnv = appEnv): OAuthConfig | null {
  if (!env.GOOGLE_OAUTH_ENABLED) return null;
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) return null;
  return {
    clientId: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/google/callback`,
  };
}
