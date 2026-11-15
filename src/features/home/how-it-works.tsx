import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { AppMockup } from "./app-mockup";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/** Bande produit sombre : la méthode en étapes, puis la maquette de l'application. */
export function HowItWorks() {
  const s = t.home.how;
  const headingId = `${HOME_SECTIONS.howItWorks}-titre`;
  return (
    <section
      id={HOME_SECTIONS.howItWorks}
      aria-labelledby={headingId}
      className="surface-night bg-grid scroll-mt-20 px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <div className="rounded-panel border border-border bg-card p-5 sm:p-7">
          <h3 className="mb-5 text-lg font-semibold">{s.loopTitle}</h3>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
            {s.steps.map((step, i) => (
              <li key={step.title} className="flex gap-3 lg:flex-col">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-10">
          <AppMockup />
        </div>
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <Button asChild className="h-11 px-5 text-base">
            <Link href="/inscription">
              {s.cta}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">{s.ctaHint}</p>
        </div>
      </div>
    </section>
  );
}
