import { ArrowLeft, Check } from "lucide-react";
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
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10 pt-4 lg:justify-center lg:py-10">
          {/* Mobile : le panneau de droite est masqué, sa promesse revient en encart. */}
          <div className="surface-night mb-6 rounded-card p-4 lg:hidden">
            <p className="text-xs font-semibold text-ring">{t.signup.panel.label}</p>
            <p className="mb-2.5 mt-1.5 text-[19px] font-bold leading-tight tracking-tight">
              {t.signup.panel.title}
            </p>
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              {t.signup.panel.points.map((pt) => (
                <li key={pt} className="flex gap-1.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ring" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
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
