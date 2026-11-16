import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import type { BillingOverview } from "./service";

/** « 19,90 € » ; sans décimales si le prix est rond. */
const eur = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

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
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="font-display text-lg font-semibold">
          {b.currentPlan} :{" "}
          {overview.plans.find((p) => p.key === overview.plan)?.name ?? overview.plan}
        </h2>
        {overview.plan === "gratuit" ? (
          <p className="text-muted-foreground">{b.freeNote}</p>
        ) : (
          <p className="text-muted-foreground">
            {b.usage(overview.sendUsed ?? 0, overview.sendCap ?? 0)}
            {overview.periodEnd
              ? ` ${overview.cancelAtPeriodEnd ? b.endsOn : b.renewsOn} ${new Date(overview.periodEnd).toLocaleDateString("fr-FR")}.`
              : ""}
          </p>
        )}
        <p className="text-muted-foreground">{b.credits(overview.credits)}</p>
        {testMode ? <p className="text-sm text-muted-foreground">{b.fakeNote}</p> : null}
        {overview.hasCustomer ? (
          <form action={portal}>
            <Button type="submit" variant="outline">
              {b.portal}
            </Button>
          </form>
        ) : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.plans.map((p) => (
          <Card key={p.key} className="flex flex-col gap-2 p-6">
            <h3 className="font-display text-base font-semibold">{p.name}</h3>
            <p className="text-2xl font-semibold">
              {p.price_eur_cents === 0 ? b.free : `${eur(p.price_eur_cents)} ${b.perMonth}`}
            </p>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              <li>{p.monthly_send_cap === 0 ? b.noSending : b.sendCap(p.monthly_send_cap)}</li>
              <li>{b.sites(p.max_sites)}</li>
              {p.monthly_audits > 0 ? <li>{b.audits(p.monthly_audits)}</li> : null}
              <li>{b.mailboxes(p.max_mailboxes)}</li>
              <li>{b.creditsPerMonth(p.monthly_credits)}</li>
            </ul>
            {p.key !== "gratuit" && overview.plan === "gratuit" ? (
              <form action={checkout}>
                <input type="hidden" name="plan" value={p.key} />
                <Button type="submit">{b.choose(p.name)}</Button>
              </form>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
