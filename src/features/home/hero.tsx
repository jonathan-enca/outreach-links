import { AuditForm } from "@/features/public-audit/audit-form";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { ProductTour } from "./product-tour";

export function Hero() {
  const h = t.home.hero;
  return (
    <section
      id="audit"
      className="bg-hero-wash scroll-mt-20 px-4 pb-16 pt-14 text-center sm:px-7 sm:pt-20"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-5 inline-block rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
          {h.pill}
        </p>
        <h1 className="mx-auto max-w-[18ch] text-4xl font-bold leading-[1.06] sm:text-6xl">
          {h.title}
        </h1>
        <p className="mx-auto mb-8 mt-5 max-w-[56ch] text-lg text-muted-foreground sm:text-xl">
          {h.lead}
        </p>
        <AuditForm variant="hero" />
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {h.hints.map((hint) => (
            <li key={hint} className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {hint}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <a
            href={`#${HOME_SECTIONS.howItWorks}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {h.secondary}
          </a>
        </p>
        <ProductTour />
      </div>
    </section>
  );
}
