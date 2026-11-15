import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { MobileMenu } from "./mobile-menu";
import { HOME_SECTIONS } from "./sections";

export function homeNavLinks() {
  const n = t.home.nav;
  return [
    { href: `#${HOME_SECTIONS.features}`, label: n.features },
    { href: `#${HOME_SECTIONS.pricing}`, label: n.pricing },
    { href: `#${HOME_SECTIONS.faq}`, label: n.faq },
  ];
}

/** En-tête collant de la home (68 px). Sur mobile, les liens passent dans un panneau latéral. */
export function SiteHeader() {
  const links = homeNavLinks();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-7">
        <Link
          href="/"
          aria-label={t.app.name}
          className="rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo />
        </Link>
        <nav
          aria-label={t.home.nav.label}
          className="hidden items-center gap-6 text-[15px] text-muted-foreground lg:flex"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-control px-1 py-2.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/connexion"
            className="rounded-control px-1 py-2.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t.home.signIn}
          </Link>
          <Button asChild>
            <Link href="/inscription">{t.home.nav.cta}</Link>
          </Button>
        </nav>
        <MobileMenu links={links} signIn={t.home.signIn} cta={t.home.nav.cta} />
      </div>
    </header>
  );
}
