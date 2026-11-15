"use server";

import { redirect } from "next/navigation";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";
import { requestPasswordReset, setNewPassword, signIn, signUp, type AuthState } from "./service";

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
      env.NEXT_PUBLIC_APP_URL,
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
  return requestPasswordReset(await createClient(), field(fd, "email"), env.NEXT_PUBLIC_APP_URL);
}

export async function resetPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  return done(await setNewPassword(await createClient(), field(fd, "password")));
}
