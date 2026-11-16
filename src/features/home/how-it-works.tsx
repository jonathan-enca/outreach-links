import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { howScreens } from "./how-screens";
import { HowTour } from "./how-tour";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/** Bande produit sombre : le parcours en six étapes, chacune avec l'écran du produit qui lui correspond. */
export function HowItWorks() {
  const s = t.home.how;
  const headingId = `${HOME_SECTIONS.howItWorks}-titre`;
  const screens = howScreens();
  const steps = s.steps.map((step, i) => ({
    title: step.title,
    text: step.text,
    roleLabel: step.role === "you" ? s.roles.you : s.roles.tool,
    byUser: step.role === "you",
    screen: screens[i],
  }));
  return (
    <section
      id={HOME_SECTIONS.howItWorks}
      aria-labelledby={headingId}
      className="surface-night bg-grid scroll-mt-20 px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <HowTour steps={steps} caption={s.screenCaption} />
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
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
