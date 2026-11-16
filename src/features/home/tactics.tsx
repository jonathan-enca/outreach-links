import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/**
 * Tactiques : les trois façons d'obtenir un lien, côte à côte dès le bureau. Chaque colonne donne le
 * principe, le déroulé en étapes, puis un exemple de demande aligné en pied de carte.
 */
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
        <ol className="grid gap-5 lg:grid-cols-3">
          {s.items.map((item, i) => (
            <li
              key={item.title}
              className="flex flex-col rounded-panel border border-border bg-card p-6 shadow-card"
            >
              <p className="flex items-center gap-3 text-sm font-semibold text-primary">
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                {s.kicker} {i + 1}
              </p>
              <h3 className="mt-4 text-balance text-[22px] font-bold leading-tight lg:min-h-[55px]">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground lg:min-h-[98px]">
                {item.text}
              </p>
              <ol className="mt-5 grid gap-3.5 border-t border-border pt-5">
                {item.steps.map((step, j) => (
                  <li key={step.title} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                    >
                      {j + 1}
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold leading-snug">{step.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {step.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-auto pt-6">
                <figure className="rounded-card border border-border bg-muted p-4">
                  <figcaption className="text-sm">
                    <span className="font-semibold text-primary">{s.exampleLabel}</span>
                    <span className="mt-0.5 block text-muted-foreground">{item.example.to}</span>
                  </figcaption>
                  <blockquote className="mt-3 border-l-2 border-primary pl-3 text-sm leading-relaxed">
                    <p>{item.example.body}</p>
                    <p className="mt-1.5 font-medium">{item.example.signature}</p>
                  </blockquote>
                </figure>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[62ch]">
            <p className="text-[17px] font-medium">{s.frame}</p>
            <p className="mt-2 text-sm text-muted-foreground">{s.closing}</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <Button asChild className="h-11 px-5">
                <Link href="/inscription">
                  {s.primary}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5">
                <a href={`#${HOME_SECTIONS.howItWorks}`}>{s.secondary}</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground lg:max-w-[40ch] lg:text-right">{s.hint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
