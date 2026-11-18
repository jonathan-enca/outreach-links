"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ALL_SITES, SITE_COOKIE } from "@/features/shell/current-site";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retient le site choisi dans le menu (ou « tous les sites ») ; chaque écran s'y filtre. */
export async function selectSite(choice: string) {
  const value = UUID.test(choice) ? choice : ALL_SITES;
  (await cookies()).set(SITE_COOKIE, value, {
    path: "/app",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  revalidatePath("/app", "layout");
}
