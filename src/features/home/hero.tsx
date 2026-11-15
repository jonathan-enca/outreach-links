import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { HeroCards } from "./hero-cards";

/**
 * Hero sombre : titre centré, cartes d'exemple de chaque côté (bureau), deux boutons. « Essai gratuit »
 * mène à l'inscription ; « Fonctionnement » mène à l'audit gratuit (section `#audit`, juste dessous).
 */
export function Hero() {
  const h = t.home.hero;
  return (
    <section
      aria-labelledby="hero-titre"
      className="surface-night bg-grid relative isolate overflow-hidden bg-background px-4 pb-20 pt-16 text-foreground sm:px-7 sm:pt-24 xl:pb-28 xl:pt-28"
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/3 -z-10 h-[34rem] w-[52rem] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-[1480px] xl:min-h-[640px]">
        <HeroCards />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <a
            href="#audit"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-white/10"
          >
            {h.pill}
            <ArrowRight aria-hidden className="size-3.5" />
          </a>
          <p className="mb-5 font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {h.audience}
          </p>
          <h1
            id="hero-titre"
            className="text-balance text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl"
          >
            <span className="text-primary">{h.titleAccent}</span> {h.titleRest}
          </h1>
          <p className="mt-7 max-w-[54ch] text-lg text-muted-foreground">{h.lead}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 px-6 text-base">
              <Link href="/connexion">
                {h.cta.primary}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6 text-base">
              <a href="#audit">{h.cta.secondary}</a>
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
          <p className="mt-5 text-sm text-muted-foreground">
            {h.justLooking}{" "}
            <a href="#audit" className="font-medium text-primary underline underline-offset-4">
              {h.previewLink}
            </a>{" "}
            : {h.previewNote}
          </p>
        </div>
      </div>
    </section>
  );
}
