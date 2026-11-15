import { ChevronDown } from "lucide-react";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/** FAQ en accordéon natif (`details` / `summary`) : fonctionne sans JavaScript, clavier et lecteurs d'écran compris. */
export function Faq() {
  const s = t.home.faq;
  const headingId = `${HOME_SECTIONS.faq}-titre`;
  return (
    <section
      id={HOME_SECTIONS.faq}
      aria-labelledby={headingId}
      className="scroll-mt-20 bg-muted px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <div className="mx-auto max-w-3xl divide-y divide-border rounded-panel border border-border bg-card">
          {s.items.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-control font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
