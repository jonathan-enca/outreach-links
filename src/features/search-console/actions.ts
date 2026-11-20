"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/env";
import { googleConfig } from "@/features/google/config";
import { parseKeyRing } from "@/features/mailboxes/crypto";
import { searchConsoleEnabled } from "./load";
import { findSearchConsoleMatch, linkSearchConsole } from "./match";

/**
 * Déconnecte la Search Console d'un site : supprime la connexion et son jeton chiffré. Le site doit
 * appartenir à la personne (vérifié avec son propre client, RLS). Rien n'est retiré côté Google : la
 * personne peut aussi révoquer l'accès depuis son compte Google.
 */
export async function disconnectSearchConsoleAction(siteId: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) return;
  await createServiceClient().from("search_console_connections").delete().eq("site_id", site.id);
  revalidatePath("/app/reglages/search-console");
  revalidatePath(`/app/site/${siteId}`);
}

/** Ce que l'étape 1 affiche pour l'adresse saisie (jamais de jeton ni d'identifiant de site). */
export type SearchConsoleLookup =
  | { status: "none" }
  | { status: "missing"; email: string }
  | { status: "found"; email: string; property: string };

function matchDeps() {
  return {
    db: createServiceClient(),
    config: googleConfig(),
    keyRing: () => parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS),
  };
}

/**
 * Étape 1 : l'adresse tapée est-elle dans une Search Console déjà connectée par l'espace ?
 * Lecture seule, rien n'est enregistré.
 */
export async function lookupSearchConsoleAction(rawUrl: string): Promise<SearchConsoleLookup> {
  if (!searchConsoleEnabled()) return { status: "none" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "none" };
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return { status: "none" };
  const match = await findSearchConsoleMatch(ws.id, String(rawUrl).slice(0, 253), matchDeps());
  return match.status === "found"
    ? { status: "found", email: match.email, property: match.property }
    : match;
}

/** Après la création de la campagne : la relie à la Search Console qui a ce site, s'il y en a une. */
export async function linkSearchConsoleAction(siteId: string): Promise<boolean> {
  if (!searchConsoleEnabled()) return false;
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id, domain")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return false;
  const linked = await linkSearchConsole(
    { id: site.id, workspaceId: site.workspace_id, domain: site.domain },
    matchDeps(),
  );
  if (linked) revalidatePath("/app", "layout");
  return linked;
}
