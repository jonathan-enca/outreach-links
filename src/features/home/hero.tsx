import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { HeroCards } from "./hero-cards";
import { ProductTour } from "./product-tour";
import { HOME_SECTIONS } from "./sections";

/**
 * Hero sombre : titre centré, cartes d'exemple de chaque côté (bureau), deux boutons. « Essai gratuit »
 * mène à l'inscription ; « Fonctionnement » mène à la section Fonctionnalités (`#fonctions`).
 */
export function Hero() {
  const h = t.home.hero;
  return (
    <section
      aria-labelledby="hero-titre"
      className="bg-hero-wash relative isolate overflow-hidden px-4 pb-20 pt-16 sm:px-7 sm:pt-24 xl:pb-28 xl:pt-28"
    >
      <div className="relative mx-auto max-w-[1480px] xl:min-h-[640px]">
        <HeroCards />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-[13px] font-semibold text-primary">
            {h.pill}
          </p>
          <p className="mb-5 text-sm font-medium text-muted-foreground">{h.audience}</p>
          <h1
            id="hero-titre"
            className="text-balance text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl"
          >
            <span className="text-primary">{h.titleAccent}</span> {h.titleRest}
          </h1>
          <p className="mt-7 max-w-[54ch] text-lg text-muted-foreground">{h.lead}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 px-6 text-base">
              <Link href="/inscription">
                {h.cta.primary}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6 text-base">
              <a href={`#${HOME_SECTIONS.features}`}>{h.cta.secondary}</a>
            </Button>
          </div>
          <ul className="mt-7 flex flex-col items-center gap-1.5 text-sm text-muted-foreground sm:flex-row sm:gap-x-6 xl:flex-col 2xl:flex-row">
            {h.hints.map((hint) => (
              <li key={hint} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                {hint}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl">
        <ProductTour />
      </div>
    </section>
  );
}
