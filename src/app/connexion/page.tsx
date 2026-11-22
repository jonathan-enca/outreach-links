import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/features/auth/forms";
import { t } from "@/lib/messages";

export const metadata: Metadata = { title: t.auth.title, robots: { index: false } };

async function Form({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return <LoginForm initialError={erreur ? t.auth.errorCallback : undefined} />;
}

/** Connexion : email et mot de passe (avec l'œil). */
export default function ConnexionPage(props: { searchParams: Promise<{ erreur?: string }> }) {
  return (
    <AuthShell>
      <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
        {t.auth.welcome}
      </h1>
      <p className="mb-8 mt-3 text-lg text-muted-foreground">{t.auth.welcomeIntro}</p>
      <Suspense>
        <Form searchParams={props.searchParams} />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/inscription" className="font-medium text-primary underline underline-offset-4">
          {t.auth.createOne}
        </Link>
      </p>
    </AuthShell>
  );
}
