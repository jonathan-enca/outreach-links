import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/** Une question ; `link` mène à une page d'aide quand la réponse ne peut pas tout dire. */
export interface FaqItem {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

/** FAQ en accordéon natif (`details` / `summary`) : fonctionne sans JavaScript, clavier et lecteurs d'écran compris. */
export function Faq() {
  const s = t.home.faq;
  const items: readonly FaqItem[] = s.items;
  const headingId = `${HOME_SECTIONS.faq}-titre`;
  return (
    <section
      id={HOME_SECTIONS.faq}
      aria-labelledby={headingId}
      className="scroll-mt-20 bg-muted px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} />
        <div className="mx-auto max-w-3xl divide-y divide-border rounded-panel border border-border bg-card">
          {items.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-control font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-muted-foreground">{item.a}</p>
              {item.link ? (
                <p className="mt-2">
                  <Link
                    href={item.link.href}
                    className="inline-flex items-center gap-1 rounded-control text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                  >
                    {item.link.label}
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </p>
              ) : null}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
