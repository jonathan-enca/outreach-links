import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { formatEuros, type PublicPlan } from "./plans";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

function limitsFor(plan: PublicPlan): string[] {
  const l = t.home.pricing.limits;
  return [
    plan.monthlySendCap > 0 ? `${plan.monthlySendCap} ${l.sends}` : l.none,
    `${plan.maxSites} ${plan.maxSites > 1 ? l.sitesPlural : l.sites}`,
    ...(plan.maxMailboxes > 0
      ? [`${plan.maxMailboxes} ${plan.maxMailboxes > 1 ? l.mailboxesPlural : l.mailboxes}`]
      : []),
  ];
}

/** Tarifs : tout vient de la table `plans` ; la carte du milieu est inversée (surface nuit). Aucun prix comparatif. */
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
        {plans ? (
          <ul className="grid items-stretch gap-5 lg:grid-cols-3">
            {plans.map((p) => {
              const copy = s.plans[p.key];
              const featured = p.key === "starter";
              return (
                <li
                  key={p.key}
                  className={`flex flex-col rounded-panel border border-border p-6 ${featured ? "surface-night shadow-float" : "bg-card shadow-card"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-bold">{p.name}</h3>
                    {featured ? (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        {s.popular}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.tagline}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold tabular-nums">
                      {formatEuros(p.priceEurCents)}
                    </span>
                    <span className="text-sm text-muted-foreground">{s.perMonth}</span>
                  </p>
                  <ul className="mt-5 grid gap-2 border-t border-border pt-5 text-[15px] font-medium">
                    {limitsFor(p).map((x) => (
                      <li key={x} className="tabular-nums">
                        {x}
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-4 grid flex-1 gap-2 text-[15px]">
                    {copy.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-muted-foreground">
                        <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={featured ? "default" : "outline"} className="mt-6 h-11">
                    {p.key === "gratuit" ? (
                      <a href="#audit">{copy.cta}</a>
                    ) : (
                      <Link href="/connexion">{copy.cta}</Link>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
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
