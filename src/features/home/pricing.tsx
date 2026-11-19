import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { formatEuros, type PublicPlan } from "./plans";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

const nf = new Intl.NumberFormat("fr-FR");

/**
 * Lignes de comparaison, dans le même ordre sur chaque carte : on lit les offres en colonne.
 * Valeurs issues de la table `plans` (aucune valeur écrite en dur ici).
 */
function rowsOf(p: PublicPlan, r: typeof t.home.pricing.rows) {
  return [
    { label: r.sites, value: String(p.maxSites) },
    { label: r.campaigns, value: String(p.monthlyCampaigns) },
    { label: r.sends, value: nf.format(p.monthlySendCap) },
    { label: r.mailboxes, value: String(p.maxMailboxes) },
    { label: r.dedicated, flag: p.dedicatedDomain },
    { label: r.linkChecks, flag: p.linkChecks },
    { label: r.digest, flag: p.weeklyDigest },
  ] as const;
}

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
          <ul className="grid items-stretch gap-5 lg:grid-cols-3">
            {plans.map((p) => {
              const copy = s.plans[p.key];
              const featured = p.key === "pro";
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
                  <p className="mt-1 min-h-10 text-sm text-muted-foreground">{copy.tagline}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold tabular-nums">
                      {formatEuros(p.priceEurCents)}
                    </span>
                    <span className="text-sm text-muted-foreground">{s.perMonth}</span>
                  </p>
                  <Button asChild variant={featured ? "default" : "outline"} className="mt-5 h-11">
                    <Link href="/inscription">{copy.cta}</Link>
                  </Button>
                  <dl className="mt-6 grid gap-3 border-t border-border pt-5 text-[15px]">
                    {rowsOf(p, s.rows).map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="text-right font-semibold tabular-nums">
                          {"flag" in row ? (
                            row.flag ? (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <Check aria-hidden className="size-4" />
                                <span className="sr-only">{s.included}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Minus aria-hidden className="size-4" />
                                <span className="sr-only">{s.notIncluded}</span>
                              </span>
                            )
                          ) : (
                            row.value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
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
