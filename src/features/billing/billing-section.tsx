"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEuros } from "@/lib/money";
import { t } from "@/lib/messages";
import type { BillingOverview, PlanRow } from "./service";

type Period = "month" | "year";

const nf = new Intl.NumberFormat("fr-FR");

/** Une jauge « utilisé sur plafond » : barre, texte, et lecture par les lecteurs d'écran. */
function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const b = t.billing.meters;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{b.of(used, cap)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-valuenow={Math.min(used, cap)}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Lignes de comparaison, dans le même ordre que sur la home. */
function rowsOf(p: PlanRow) {
  const r = t.home.pricing.rows;
  return [
    { label: r.sites, value: String(p.max_sites) },
    { label: r.campaigns, value: String(p.monthly_campaigns) },
    {
      label: r.sends,
      value: p.monthly_send_cap === 0 ? t.billing.meters.noSends : nf.format(p.monthly_send_cap),
    },
    { label: r.mailboxes, value: String(p.max_mailboxes) },
    { label: r.dedicated, flag: p.dedicated_domain },
    { label: r.linkChecks, flag: p.link_checks },
    { label: r.digest, flag: p.weekly_digest },
  ] as const;
}

/** Prix affiché pour une période : en annuel, le montant de l'année divisé par douze, exact. */
function priceFor(p: PlanRow, period: Period) {
  if (period === "month") return { main: formatEuros(p.price_eur_cents), billed: null };
  return {
    main: formatEuros(Math.round(p.price_annual_eur_cents / 12)),
    billed: formatEuros(p.price_annual_eur_cents),
  };
}

export function BillingSection({
  overview,
  checkout,
  portal,
  testMode,
}: {
  overview: BillingOverview;
  checkout: (formData: FormData) => void | Promise<void>;
  portal: () => void | Promise<void>;
  testMode: boolean;
}) {
  const b = t.billing;
  const h = t.home.pricing;
  const e = overview.entitlements;
  const current = overview.plans.find((p) => p.key === overview.plan);
  const isFree = overview.plan === "gratuit";
  const [period, setPeriod] = useState<Period>("month");
  const annual = period === "year";
  const groupId = "periode-facturation-dashboard";
  const discountPct = (() => {
    const paid = overview.plans.find((p) => p.price_eur_cents > 0);
    return paid
      ? Math.round((1 - paid.price_annual_eur_cents / (12 * paid.price_eur_cents)) * 100)
      : 0;
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Forfait en cours */}
      <Card className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">{b.currentPlan}</p>
          <h2 className="font-display text-2xl font-semibold">
            {current?.name ?? overview.plan}
            {!isFree && current ? (
              <span className="ml-3 text-base font-normal text-muted-foreground tabular-nums">
                {formatEuros(current.price_eur_cents)} {b.perMonth}
              </span>
            ) : null}
          </h2>
          {isFree ? (
            <>
              <p className="font-medium">{b.freeTitle}</p>
              <p className="text-muted-foreground">{b.freeNote}</p>
            </>
          ) : (
            <p className="text-muted-foreground">
              {overview.periodEnd
                ? `${overview.cancelAtPeriodEnd ? b.endsOn : b.renewsOn} ${new Date(overview.periodEnd).toLocaleDateString("fr-FR")}.`
                : null}
            </p>
          )}
          {testMode ? <p className="text-sm text-muted-foreground">{b.fakeNote}</p> : null}
        </div>
        {overview.hasCustomer ? (
          <div className="flex flex-col gap-2">
            <form action={portal}>
              <Button type="submit" variant="outline" className="w-full md:w-auto">
                {b.portal}
              </Button>
            </form>
            <p className="max-w-xs text-sm text-muted-foreground">{b.portalHint}</p>
          </div>
        ) : null}
      </Card>

      {/* Ce mois-ci */}
      <Card className="flex flex-col gap-5 p-6">
        <h3 className="font-display text-base font-semibold">{b.meters.title}</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <Meter
            label={b.meters.campaigns}
            used={overview.campaignsUsed}
            cap={e.monthlyCampaigns}
          />
          {e.sendCap > 0 ? (
            <Meter label={b.meters.sends} used={e.sendUsed} cap={e.sendCap} />
          ) : (
            <p className="text-sm text-muted-foreground">{b.meters.noSends}</p>
          )}
        </div>
      </Card>

      {/* Comparaison des offres */}
      <section aria-labelledby="offres-titre" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 id="offres-titre" className="font-display text-lg font-semibold">
            {b.comparison}
          </h3>
          <div
            role="group"
            aria-labelledby={groupId}
            className="inline-flex gap-1 rounded-card bg-muted p-1"
          >
            <span id={groupId} className="sr-only">
              {b.period.group}
            </span>
            <button
              type="button"
              aria-pressed={!annual}
              onClick={() => setPeriod("month")}
              className={`h-9 rounded-[calc(var(--radius)-2px)] px-4 text-sm font-medium ${!annual ? "bg-card shadow-card" : "text-muted-foreground"}`}
            >
              {b.period.monthly}
            </button>
            <button
              type="button"
              aria-pressed={annual}
              onClick={() => setPeriod("year")}
              className={`inline-flex h-9 items-center gap-2 rounded-[calc(var(--radius)-2px)] px-4 text-sm font-medium ${annual ? "bg-card shadow-card" : "text-muted-foreground"}`}
            >
              {b.period.annual}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {b.period.discount.replace("{pct}", String(discountPct))}
              </span>
            </button>
          </div>
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overview.plans.map((p) => {
            const isCurrent = p.key === overview.plan;
            const isFeatured = p.key === "pro";
            const price = priceFor(p, period);
            return (
              <li key={p.key}>
                <Card
                  className={`flex h-full flex-col gap-4 p-6 ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display text-lg font-semibold">{p.name}</h4>
                    {isCurrent ? (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        {b.current}
                      </span>
                    ) : isFeatured ? (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                        {h.popular}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {p.price_eur_cents === 0 ? b.free : price.main}
                      {p.price_eur_cents === 0 ? null : (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          {annual ? b.period.perMonthAnnual : b.perMonth}
                        </span>
                      )}
                    </p>
                    <p className="min-h-5 text-sm text-muted-foreground tabular-nums">
                      {price.billed && p.price_eur_cents !== 0
                        ? b.period.billedYearly.replace("{amount}", price.billed)
                        : " "}
                    </p>
                  </div>
                  <dl className="grid gap-2.5 border-t border-border pt-4 text-sm">
                    {rowsOf(p).map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="text-right font-semibold tabular-nums">
                          {"flag" in row ? (
                            row.flag ? (
                              <Check aria-hidden className="size-4 text-primary" />
                            ) : (
                              <Minus aria-hidden className="size-4 text-muted-foreground" />
                            )
                          ) : (
                            row.value
                          )}
                          {"flag" in row ? (
                            <span className="sr-only">{row.flag ? h.included : h.notIncluded}</span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-auto pt-2">
                    {isCurrent || p.key === "gratuit" ? null : isFree ? (
                      <form action={checkout}>
                        <input type="hidden" name="plan" value={p.key} />
                        <input type="hidden" name="period" value={period} />
                        <Button type="submit" className="w-full">
                          {b.choose(p.name)}
                        </Button>
                      </form>
                    ) : overview.hasCustomer ? (
                      <form action={portal}>
                        <Button type="submit" variant="outline" className="w-full">
                          {b.portal}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
