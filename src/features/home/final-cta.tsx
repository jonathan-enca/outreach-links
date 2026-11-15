import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";

export function FinalCta() {
  const s = t.home.finalCta;
  return (
    <section
      aria-labelledby="appel-final-titre"
      className="surface-night bg-grid px-4 py-20 text-center sm:px-7 sm:py-24"
    >
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-semibold text-primary">{s.label}</p>
        <h2 id="appel-final-titre" className="text-3xl font-bold leading-tight sm:text-5xl">
          {s.title}
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-lg text-muted-foreground">{s.text}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="h-12 px-6 text-base">
            <Link href="/inscription">
              {s.primary}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 px-6 text-base">
            <a href={`#${HOME_SECTIONS.pricing}`}>{s.secondary}</a>
          </Button>
        </div>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {s.hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
