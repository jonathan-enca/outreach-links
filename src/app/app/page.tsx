import { redirect } from "next/navigation";
import { Suspense } from "react";
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
    <>
      <p>
        {t.workspace.signedInAs} <strong>{auth.user.email}</strong>
      </p>
      <p>
        {t.workspace.workspace} : <strong>{workspaces?.[0]?.name ?? "—"}</strong>
      </p>
      <form action={signOut}>
        <button type="submit" className="rounded border border-zinc-300 px-3 py-2">
          {t.auth.signOut}
        </button>
      </form>
    </>
  );
}

export default function AppPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">{t.workspace.title}</h1>
      <Suspense>
        <Workspace />
      </Suspense>
    </main>
  );
}
