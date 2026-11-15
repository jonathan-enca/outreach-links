import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth-panel";
import { Logo } from "@/components/brand/logo";
import { t } from "@/lib/messages";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: t.auth.title };

async function Form({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <LoginForm
      initialError={erreur ? t.auth.errorCallback : undefined}
      placeholder={t.signup.emailPlaceholder}
      large
    />
  );
}

/** Connexion : même mise en page que l'inscription (formulaire à gauche, bande produit à droite). */
export default function ConnexionPage(props: { searchParams: Promise<{ erreur?: string }> }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <header className="mx-auto flex w-full max-w-md items-center justify-between">
          <Link href="/" aria-label={t.app.name}>
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {t.auth.backToSite}
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
            {t.auth.welcome}
          </h1>
          <p className="mb-8 mt-3 text-lg text-muted-foreground">{t.auth.welcomeIntro}</p>
          <Suspense>
            <Form searchParams={props.searchParams} />
          </Suspense>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t.auth.noAccount}{" "}
            <Link
              href="/inscription"
              className="font-medium text-primary underline underline-offset-4"
            >
              {t.auth.createOne}
            </Link>
          </p>
        </main>
        <footer className="flex justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/conditions" className="hover:text-foreground">
            {t.auth.terms}
          </Link>
          <Link href="/confidentialite" className="hover:text-foreground">
            {t.auth.privacy}
          </Link>
        </footer>
      </div>
      <AuthPanel />
    </div>
  );
}
