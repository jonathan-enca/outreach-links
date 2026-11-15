import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AuthPanel } from "@/components/auth-panel";
import { t } from "@/lib/messages";

/** Mise en page des pages d'accès : formulaire à gauche (logo, retour au site, liens légaux), bande produit à droite. */
export function AuthShell({ children }: { children: React.ReactNode }) {
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
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
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
