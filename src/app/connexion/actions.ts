"use server";

import { z } from "zod";
import { env } from "@/env";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

const emailSchema = z.email();

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { status: "error", message: t.auth.errorInvalidEmail };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) return { status: "error", message: t.auth.errorSend };
  return { status: "sent", message: t.auth.sent };
}
