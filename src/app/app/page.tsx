import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

async function Workspace() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  // La RLS limite le résultat aux workspaces dont l'utilisateur est membre.
  const { data: workspaces } = await supabase.from("workspaces").select("id, name");
  return (
    <Card className="flex flex-col gap-4 p-6">
      <p>
        {t.workspace.signedInAs} <strong>{auth.user.email}</strong>
      </p>
      <p>
        {t.workspace.workspace} : <strong>{workspaces?.[0]?.name ?? "—"}</strong>
      </p>
      <p className="text-muted-foreground">{t.workspace.intro}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/app/site">{t.workspace.setupSite}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/audit">{t.workspace.startAudit}</Link>
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            {t.auth.signOut}
          </Button>
        </form>
      </div>
    </Card>
  );
}

export default function AppPage() {
  return (
    <>
      <PageHeader title={t.workspace.title} description={t.app.description} />
      <Suspense>
        <Workspace />
      </Suspense>
    </>
  );
}
