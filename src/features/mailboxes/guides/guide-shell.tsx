import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/features/home/site-footer";
import { t } from "@/lib/messages";
import { GUIDES_BASE } from "../providers";

const focus =
  "rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Cadre commun des pages d'aide : en-tête léger (logo, retour aux guides), contenu en colonne lisible, pied de page. */
export function GuideShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between gap-4 px-4 sm:px-7">
          <Link href="/" aria-label={t.app.name} className={focus}>
            <Logo />
          </Link>
          <Link
            href={GUIDES_BASE}
            className={`${focus} text-[15px] text-muted-foreground hover:text-foreground`}
          >
            {t.mailboxGuides.ui.guide.all}
          </Link>
        </div>
      </header>
      <main
        id="contenu"
        className={`mx-auto w-full flex-1 px-4 py-10 sm:px-7 sm:py-14 ${wide ? "max-w-5xl" : "max-w-3xl"}`}
      >
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
