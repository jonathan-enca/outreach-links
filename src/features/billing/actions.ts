"use server";

import { redirect } from "next/navigation";
import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";
import { openPortal, startCheckout } from "./service";
import { getBillingProvider } from "./stripe";

export async function checkoutAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const r = await startCheckout(
    supabase,
    getBillingProvider(env),
    env.NEXT_PUBLIC_APP_URL,
    formData.get("plan"),
    auth.user.email ?? null,
    formData.get("period") ?? "month",
  );
  redirect(r.ok ? r.url : `/app/facturation?erreur=${encodeURIComponent(r.error)}`);
}

export async function portalAction(): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const r = await openPortal(supabase, getBillingProvider(env), env.NEXT_PUBLIC_APP_URL);
  redirect(r.ok ? r.url : `/app/facturation?erreur=${encodeURIComponent(r.error)}`);
}
