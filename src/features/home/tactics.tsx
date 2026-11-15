import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/** Tactiques : trois façons d'obtenir des liens, chacune dépliable (étapes). Les deux boutons suivent le hero. */
export function Tactics() {
  const s = t.home.tactics;
  const headingId = `${HOME_SECTIONS.tactics}-titre`;
  return (
    <section
      id={HOME_SECTIONS.tactics}
      aria-labelledby={headingId}
      className="scroll-mt-20 bg-muted px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <div className="mb-10 flex flex-col items-start gap-3">
          <div className="flex flex-wrap gap-3">
            <Button asChild className="h-11 px-5">
              <Link href="/inscription">
                {s.primary}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <a href={`#${HOME_SECTIONS.features}`}>{s.secondary}</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{s.hint}</p>
        </div>
        <ul className="grid items-start gap-5 lg:grid-cols-3">
          {s.items.map((item) => (
            <li
              key={item.title}
              className="flex flex-col rounded-card border border-border bg-card p-6 shadow-card"
            >
              <h3 className="text-[19px] font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 text-[15px] text-muted-foreground">{item.text}</p>
              <details className="group mt-5 border-t border-border pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  {s.howLabel}
                  <ChevronDown
                    aria-hidden
                    className="size-4 transition-transform group-open:rotate-180"
                  />
                </summary>
                <ol className="mt-4 flex flex-col gap-3">
                  {item.steps.map((step, i) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 text-[15px] text-muted-foreground"
                    >
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
              </details>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">{s.closing}</p>
      </div>
    </section>
  );
}
