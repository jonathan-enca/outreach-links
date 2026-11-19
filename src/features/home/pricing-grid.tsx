"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { t } from "@/lib/messages";
import { formatEuros } from "@/lib/money";
import type { PublicPlan } from "./plans";

type PricingCopy = typeof t.home.pricing;
type Period = "month" | "year";

const nf = new Intl.NumberFormat("fr-FR");

/** Lignes de comparaison, dans le même ordre sur chaque carte. Valeurs issues de la table `plans`. */
function rowsOf(p: PublicPlan, r: PricingCopy["rows"]) {
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
 * Grille des offres payantes avec le sélecteur mensuel / annuel. En annuel, le prix affiché est le
 * montant de l'année divisé par douze (exact, sans arrondi) ; le montant facturé en une fois est
 * indiqué dessous. Mensuel par défaut.
 */
export function PricingGrid({ plans, copy: s }: { plans: PublicPlan[]; copy: PricingCopy }) {
  const [period, setPeriod] = useState<Period>("month");
  const annual = period === "year";
  const groupId = "periode-facturation-home";
  const discountPct = (() => {
    const paid = plans.find((p) => p.priceEurCents > 0);
    return paid ? Math.round((1 - paid.priceAnnualEurCents / (12 * paid.priceEurCents)) * 100) : 0;
  })();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-labelledby={groupId}
          className="inline-flex gap-1 rounded-card bg-muted p-1"
        >
          <span id={groupId} className="sr-only">
            {s.period.group}
          </span>
          <button
            type="button"
            aria-pressed={!annual}
            onClick={() => setPeriod("month")}
            className={`h-9 rounded-[calc(var(--radius)-2px)] px-4 text-sm font-medium transition-colors ${!annual ? "bg-card shadow-card" : "text-muted-foreground"}`}
          >
            {s.period.monthly}
          </button>
          <button
            type="button"
            aria-pressed={annual}
            onClick={() => setPeriod("year")}
            className={`inline-flex h-9 items-center gap-2 rounded-[calc(var(--radius)-2px)] px-4 text-sm font-medium transition-colors ${annual ? "bg-card shadow-card" : "text-muted-foreground"}`}
          >
            {s.period.annual}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {s.period.discount.replace("{pct}", String(discountPct))}
            </span>
          </button>
        </div>
      </div>

      <ul className="grid items-stretch gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const copy = s.plans[p.key];
          const featured = p.key === "pro";
          const monthlyEquivalent = Math.round(p.priceAnnualEurCents / 12);
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
                  {formatEuros(annual ? monthlyEquivalent : p.priceEurCents)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {annual ? s.period.perMonthAnnual : s.perMonth}
                </span>
              </p>
              <p className="min-h-5 text-sm text-muted-foreground tabular-nums">
                {annual
                  ? s.period.billedYearly.replace("{amount}", formatEuros(p.priceAnnualEurCents))
                  : " "}
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
    </>
  );
}
