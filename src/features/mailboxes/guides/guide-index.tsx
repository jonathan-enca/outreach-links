import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/messages";
import { GROUP_ORDER, guideHref, providersByGroup } from "../providers";
import { GuideShell } from "./guide-shell";

const ui = t.mailboxGuides.ui;

/** Sommaire des guides : une carte par messagerie, rangées par famille. */
export function GuideIndex() {
  const i = ui.index;
  return (
    <GuideShell wide>
      <p className="text-sm font-semibold text-primary">{i.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{i.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{i.description}</p>

      <section
        aria-labelledby="comment"
        className="mt-8 rounded-card border border-border bg-muted p-5"
      >
        <h2 id="comment" className="font-semibold">
          {i.how.title}
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {i.how.steps.map((step, n) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {n + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {GROUP_ORDER.map((group) => (
        <section key={group} aria-labelledby={`groupe-${group}`} className="mt-10">
          <h2 id={`groupe-${group}`} className="text-xl font-semibold">
            {i.groups[group]}
          </h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">{i.groupHints[group]}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providersByGroup(group).map((p) => (
              <li key={p.slug}>
                <Link
                  href={guideHref(p.slug)}
                  className="group flex h-full flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-card hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{p.name}</span>
                    <Badge tone={p.compatible ? "success" : "warning"}>
                      {p.compatible ? i.compatible : i.notCompatible}
                    </Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">{p.scope}</span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                    {i.read}
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="chez-qui" className="mt-12 max-w-3xl">
        <h2 id="chez-qui" className="text-xl font-semibold">
          {i.whichTitle}
        </h2>
        {i.which.map((p) => (
          <p key={p} className="mt-2 text-muted-foreground">
            {p}
          </p>
        ))}
      </section>

      <section aria-labelledby="securite" className="mt-10 max-w-3xl">
        <h2 id="securite" className="text-xl font-semibold">
          {i.safetyTitle}
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
          {i.safety.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </GuideShell>
  );
}
