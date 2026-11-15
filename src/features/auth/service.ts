import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { t } from "@/lib/messages";

/**
 * Authentification par email et mot de passe (Supabase Auth). Fonctions pures vis-à-vis de Next :
 * le client Supabase et l'URL de l'application sont passés en paramètres (testables).
 * Aucune réponse ne révèle si une adresse a déjà un compte.
 */

export const PASSWORD_MIN_LENGTH = 8;
const A = t.auth;

export interface AuthState {
  status: "idle" | "error" | "ok" | "confirm";
  message?: string;
  /** Page où aller après un succès (déjà connecté). */
  redirectTo?: string;
}

const email = z.email({ message: A.errors.email });
const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, A.errors.passwordShort)
  .max(72, A.errors.passwordLong);
const name = z.string().trim().min(1, A.errors.name).max(80, A.errors.name);

const first = (r: { error: z.ZodError }) => r.error.issues[0]?.message ?? A.errors.generic;

export async function signUp(
  supabase: SupabaseClient,
  input: { name: string; email: string; password: string },
  appUrl: string,
): Promise<AuthState> {
  const parsed = z.object({ name, email, password }).safeParse({
    name: input.name,
    email: input.email.trim(),
    password: input.password,
  });
  if (!parsed.success) return { status: "error", message: first(parsed) };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { status: "error", message: A.errors.passwordShort };
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { status: "error", message: A.errors.rateLimit };
    }
    return { status: "error", message: A.errors.generic };
  }
  // Session immédiate (confirmation d'email désactivée) : on entre dans l'espace.
  if (data.session) return { status: "ok", redirectTo: "/app/demarrer" };
  // Sinon un email de confirmation part ; même message si l'adresse existe déjà.
  return { status: "confirm", message: A.signupConfirm };
}

export async function signIn(
  supabase: SupabaseClient,
  input: { email: string; password: string },
): Promise<AuthState> {
  const parsed = z
    .object({ email, password: z.string().min(1, A.errors.passwordRequired) })
    .safeParse({ email: input.email.trim(), password: input.password });
  if (!parsed.success) return { status: "error", message: first(parsed) };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", message: A.errors.notConfirmed };
    }
    if (error.status === 429) return { status: "error", message: A.errors.rateLimit };
    return { status: "error", message: A.errors.invalidCredentials };
  }
  return { status: "ok", redirectTo: "/app" };
}

export async function requestPasswordReset(
  supabase: SupabaseClient,
  rawEmail: string,
  appUrl: string,
): Promise<AuthState> {
  const parsed = email.safeParse(rawEmail.trim());
  if (!parsed.success) return { status: "error", message: A.errors.email };
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${appUrl}/auth/recuperation`,
  });
  if (error?.status === 429) return { status: "error", message: A.errors.rateLimit };
  // Même réponse que l'adresse existe ou non.
  return { status: "ok", message: A.forgot.sent };
}

export async function setNewPassword(
  supabase: SupabaseClient,
  newPassword: string,
): Promise<AuthState> {
  const parsed = password.safeParse(newPassword);
  if (!parsed.success) return { status: "error", message: first(parsed) };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: "error", message: A.errors.sessionExpired };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "weak_password") return { status: "error", message: A.errors.passwordShort };
    return { status: "error", message: A.errors.generic };
  }
  return { status: "ok", redirectTo: "/app" };
}
