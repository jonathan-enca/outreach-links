import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/**
 * Tactiques : les trois façons d'obtenir un lien, détaillées (principe et où l'on cherche à gauche,
 * déroulé en étapes à droite, exemple de demande en pied de carte). Tout est visible sans clic.
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
        <ol className="grid gap-6">
          {s.items.map((item, i) => (
            <li
              key={item.title}
              className="grid overflow-hidden rounded-panel border border-border bg-card shadow-card lg:grid-cols-2"
            >
              <div className="p-6 sm:p-8">
                <p className="flex items-center gap-3 text-sm font-semibold text-primary">
                  <span
                    aria-hidden
                    className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  >
                    {i + 1}
                  </span>
                  {s.kicker} {i + 1}
                </p>
                <h3 className="mt-4 text-balance text-2xl font-bold leading-tight sm:text-[28px]">
                  {item.title}
                </h3>
                <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
                <p className="mt-6 text-sm font-semibold">{item.whereLabel}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {item.where.map((w) => (
                    <li
                      key={w}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-sm"
                    >
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border p-6 sm:p-8 lg:border-l lg:border-t-0">
                <p className="text-sm font-semibold">{s.stepsLabel}</p>
                <ol className="mt-5 grid gap-6">
                  {item.steps.map((step, j) => (
                    <li key={step.title} className="flex items-start gap-4">
                      <span
                        aria-hidden
                        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                      >
                        {j + 1}
                      </span>
                      <div>
                        <p className="font-semibold leading-snug">{step.title}</p>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                          {step.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <figure className="grid gap-3 border-t border-border bg-muted/60 p-6 sm:p-8 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
                <figcaption className="text-sm">
                  <span className="font-semibold text-primary">{s.exampleLabel}</span>
                  <span className="mt-1 block text-muted-foreground">{item.example.to}</span>
                </figcaption>
                <blockquote className="border-l-2 border-primary pl-4 text-[15px] leading-relaxed">
                  <p>{item.example.body}</p>
                  <p className="mt-2 font-medium">{item.example.signature}</p>
                </blockquote>
              </figure>
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
                <a href={`#${HOME_SECTIONS.features}`}>{s.secondary}</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground lg:max-w-[40ch] lg:text-right">{s.hint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
