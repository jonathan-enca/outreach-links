import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";

const link =
  "rounded-control hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function SiteFooter() {
  const f = t.home.footer;
  const n = t.home.nav;
  return (
    <footer
      aria-label={f.label}
      className="surface-night border-t border-border px-4 py-12 sm:px-7"
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-[34ch] text-sm text-muted-foreground">{f.tagline}</p>
        </div>
        <nav aria-label={f.productTitle}>
          <h2 className="mb-3 text-sm font-semibold">{f.productTitle}</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>
              <Link className={link} href="/#audit">
                {f.freeAudit}
              </Link>
            </li>
            <li>
              <Link className={link} href={`/#${HOME_SECTIONS.howItWorks}`}>
                {n.howItWorks}
              </Link>
            </li>
            <li>
              <Link className={link} href={`/#${HOME_SECTIONS.pricing}`}>
                {n.pricing}
              </Link>
            </li>
            <li>
              <Link className={link} href={`/#${HOME_SECTIONS.faq}`}>
                {n.faq}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={f.accountTitle}>
          <h2 className="mb-3 text-sm font-semibold">{f.accountTitle}</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>
              <Link className={link} href="/connexion">
                {f.signIn}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={f.legalTitle}>
          <h2 className="mb-3 text-sm font-semibold">{f.legalTitle}</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            {f.legalLinks.map((l) => (
              <li key={l.href}>
                <Link className={link} href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-border pt-5 text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t.app.name}. {f.rights}
      </p>
    </footer>
  );
}
