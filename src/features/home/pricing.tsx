import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import type { PublicPlan } from "./plans";
import { PricingGrid } from "./pricing-grid";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/**
 * Lignes de comparaison, dans le même ordre sur chaque carte : on lit les offres en colonne.
 * Valeurs issues de la table `plans` (aucune valeur écrite en dur ici).
 */

/**
 * Tarifs : un bandeau « gratuit pour commencer », puis les trois offres payantes en colonnes
 * comparables. Prix et plafonds viennent de la table `plans` ; la carte recommandée est inversée
 * (surface nuit). Aucun prix comparatif, aucune preuve sociale.
 */
export function Pricing({ plans }: { plans: PublicPlan[] | null }) {
  const s = t.home.pricing;
  const headingId = `${HOME_SECTIONS.pricing}-titre`;
  return (
    <section
      id={HOME_SECTIONS.pricing}
      aria-labelledby={headingId}
      className="scroll-mt-20 px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />

        <div className="mb-6 flex flex-col items-start gap-4 rounded-card border border-border bg-muted p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2.5 font-semibold">
              <span aria-hidden className="size-2 rounded-full bg-primary" />
              {s.free.title}
            </p>
            <p className="mt-1 text-[15px] text-muted-foreground">{s.free.text}</p>
          </div>
          <Button asChild variant="outline" className="h-10 shrink-0">
            <Link href="/inscription">
              {s.free.cta}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {plans ? (
          <PricingGrid plans={plans} copy={s} />
        ) : (
          <p className="rounded-card border border-border bg-muted p-5 text-muted-foreground">
            {s.unavailable}
          </p>
        )}
        <p className="mt-5 text-sm text-muted-foreground">{s.note}</p>
      </div>
    </section>
  );
}
