import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { t } from "@/lib/messages";
import { AuthPanel } from "@/components/auth-panel";
import { LoginForm } from "../connexion/login-form";

export const metadata: Metadata = { title: t.signup.title };

/** Inscription : un seul champ (lien magique). À gauche le formulaire, à droite la bande produit. */
export default function InscriptionPage() {
  const s = t.signup;
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" aria-label={t.app.name} className="mb-10 inline-block">
            <Logo />
          </Link>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight">
            {s.title}
          </h1>
          <p className="mb-8 mt-3 text-lg text-muted-foreground">{s.intro}</p>
          <LoginForm submitLabel={s.submit} placeholder={s.emailPlaceholder} large />
          <p className="mt-3 text-sm text-muted-foreground">{s.hint}</p>
          <ol className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
            {s.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-[15px] text-muted-foreground">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-muted-foreground">
            {s.already}{" "}
            <Link
              href="/connexion"
              className="font-medium text-primary underline underline-offset-4"
            >
              {s.signIn}
            </Link>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {s.legal}{" "}
            <Link href="/conditions" className="underline underline-offset-4">
              {s.legalLink}
            </Link>
            .
          </p>
        </div>
      </main>

      <AuthPanel />
    </div>
  );
}
