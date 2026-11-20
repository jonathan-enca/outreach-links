"use server";

import { redirect } from "next/navigation";
import { env } from "@/env";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { cleanAppUrl } from "./destination";
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
  return done(
    await signUp(
      await createClient(),
      { name: field(fd, "name"), email: field(fd, "email"), password: field(fd, "password") },
      cleanAppUrl(env.NEXT_PUBLIC_APP_URL),
    ),
  );
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
