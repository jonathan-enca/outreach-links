import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { blogNavLink } from "@/features/content/listing";
import { t } from "@/lib/messages";
import { MobileMenu } from "./mobile-menu";
import { HOME_SECTIONS } from "./sections";

/** `base` : "" sur la home (ancres locales), "/" sur les pages légales (ancres vers la home). */
export function homeNavLinks(base = "") {
  const n = t.home.nav;
  return [
    { href: `${base}#${HOME_SECTIONS.tactics}`, label: n.tactics },
    { href: `${base}#${HOME_SECTIONS.howItWorks}`, label: n.how },
    { href: `${base}#${HOME_SECTIONS.pricing}`, label: n.pricing },
    { href: `${base}#${HOME_SECTIONS.faq}`, label: n.faq },
  ];
}

/**
 * En-tête collant de la home (68 px). Sur mobile, les liens passent dans un panneau latéral ; « Essai gratuit » reste visible.
 * Le lien « Blog » n'apparaît que lorsqu'un article est en ligne ; `current="blog"` le marque sur les pages de contenu.
 */
export function SiteHeader({ base = "", current }: { base?: string; current?: "blog" }) {
  const blog = blogNavLink();
  const links = [...homeNavLinks(base), ...(blog ? [blog] : [])];
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
              aria-current={current === "blog" && l.href === blog?.href ? "page" : undefined}
              className="rounded-control px-1 py-2.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current]:font-semibold aria-[current]:text-foreground"
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
        <div className="flex items-center gap-2 lg:hidden">
          <Button asChild size="sm" className="font-semibold">
            <Link href="/inscription">{t.home.nav.mobileCta}</Link>
          </Button>
          <MobileMenu links={links} signIn={t.home.signIn} cta={t.home.nav.cta} />
        </div>
      </div>
    </header>
  );
}
