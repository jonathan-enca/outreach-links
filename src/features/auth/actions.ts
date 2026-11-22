"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATTRIBUTION_COOKIE, parseAttribution } from "@/features/analytics/attribution";
import { trackServer } from "@/features/analytics/track-server";
import { env } from "@/env";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { cleanAppUrl } from "./destination";
import { PENDING_SITE_COOKIE, PENDING_SITE_MAX_AGE, pendingSite } from "./pending-site";
import {
  requestPasswordReset,
  resendSignupLink,
  setNewPassword,
  signIn,
  signUp,
  type AuthState,
} from "./service";

const field = (fd: FormData, k: string) =>
  typeof fd.get(k) === "string" ? (fd.get(k) as string) : "";

function done(state: AuthState): AuthState {
  if (state.status === "ok" && state.redirectTo) redirect(state.redirectTo);
  return state;
}

export async function signUpAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const attribution = parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  // Site tapé dans un article avant l'inscription : retenu pour préremplir l'écran de démarrage.
  const site = pendingSite(field(fd, "site"));
  if (site) {
    (await cookies()).set(PENDING_SITE_COOKIE, site, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: PENDING_SITE_MAX_AGE,
      path: "/",
    });
  }
  const state = await signUp(
    await createClient(),
    { name: field(fd, "name"), email: field(fd, "email"), password: field(fd, "password") },
    cleanAppUrl(env.NEXT_PUBLIC_APP_URL),
    attribution,
  );
  if (state.status === "confirm" || state.status === "ok") {
    await trackServer("signup_completed", {
      confirmation: state.status === "ok" ? "immediate" : "email",
    });
  }
  return done(state);
}

export async function signInAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  return done(
    await signIn(await createClient(), {
      email: field(fd, "email"),
      password: field(fd, "password"),
    }),
  );
}

export async function forgotPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  return requestPasswordReset(
    await createClient(),
    field(fd, "email"),
    cleanAppUrl(env.NEXT_PUBLIC_APP_URL),
  );
}

export async function resetPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  return done(await setNewPassword(await createClient(), field(fd, "password")));
}

/** Bouton « Renvoyer le lien » de l'écran qui suit l'inscription ou la demande de mot de passe. */
export async function resendLinkAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const appUrl = cleanAppUrl(env.NEXT_PUBLIC_APP_URL);
  const state =
    field(fd, "kind") === "reset"
      ? await requestPasswordReset(supabase, field(fd, "email"), appUrl)
      : await resendSignupLink(supabase, field(fd, "email"), appUrl);
  return state.status === "ok" ? { ...state, message: t.auth.checkInbox.resent } : state;
}
