import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SettingsList } from "@/features/shell/settings-list";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

const S = t.shell.settingsHub;
export const metadata: Metadata = { title: S.title };

/** Toutes les pages de réglages au même endroit : c'est la porte d'entrée de l'onglet « Réglages » du téléphone. */
async function Hub() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{auth.user.email}</p>
      <SettingsList />
      <form action={signOut}>
        <Button type="submit" variant="outline">
          {t.auth.signOut}
        </Button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title={S.title} description={S.description} />
      <Suspense>
        <Hub />
      </Suspense>
    </>
  );
}
