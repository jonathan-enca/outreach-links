import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/features/auth/forms";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.auth.reset.title };

async function Guard() {
  // La session de récupération est ouverte par /auth/recuperation ; sans elle, retour à la connexion.
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) redirect("/connexion?erreur=1");
  return <ResetForm />;
}

export default function ReinitialiserPage() {
  const r = t.auth.reset;
  return (
    <AuthShell>
      <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">{r.title}</h1>
      <p className="mb-8 mt-3 text-lg text-muted-foreground">{r.intro}</p>
      <Suspense>
        <Guard />
      </Suspense>
    </AuthShell>
  );
}
