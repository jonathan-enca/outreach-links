import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { campaignStatus } from "@/features/shell/campaign-status";
import { siteHref, START_HREF } from "@/features/shell/next-step";
import { loadOverview } from "@/features/shell/overview";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const C = t.campaigns;
export const metadata: Metadata = { title: C.title };

const TONE = {
  onboarding: "neutral",
  analyse: "info",
  reprise: "danger",
  toValidate: "warning",
  ready: "info",
  sending: "success",
} as const;

/** Liste des campagnes (maquette validée le 18/11) : une carte par site et pays, ses cinq compteurs, son état. */
async function Campaigns() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const o = await loadOverview(supabase);
  if (o.campaigns.length === 0) return <Card className="p-6 text-muted-foreground">{C.empty}</Card>;
  const countries = t.sites.countries as Record<string, string>;
  return (
    <ul className="flex flex-col gap-4">
      {o.campaigns.map((c) => {
        const status = campaignStatus(c);
        const stats = [
          [c.targets, C.stats.targets],
          [c.validated, C.stats.validated],
          [c.contacted, C.stats.contacted],
          [c.replies, C.stats.replies],
          [c.liveLinks, C.stats.links],
        ] as const;
        return (
          <li key={c.siteId}>
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {c.domain}
                    {c.country ? ` · ${countries[c.country] ?? c.country}` : ""}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {c.analysedAt
                      ? C.analysed(
                          new Date(c.analysedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          }),
                          c.targets,
                        )
                      : C.notAnalysed}
                  </p>
                </div>
                <Badge tone={TONE[status]}>{C.status[status]}</Badge>
              </div>
              <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3 sm:grid-cols-5">
                {stats.map(([n, label]) => (
                  <div key={label}>
                    <dd className="text-xl font-bold tabular-nums">{n}</dd>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="sm">
                  <Link href={c.step.href}>{t.shell.home.action[c.step.kind]}</Link>
                </Button>
                {c.contacted > 0 ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/app/inbox">{C.conversations}</Link>
                  </Button>
                ) : null}
                {c.step.kind === "cibles" ? (
                  <Link
                    href={`${siteHref.analyse(c.siteId)}?etapes=1`}
                    className="text-sm text-primary underline underline-offset-4"
                  >
                    {C.detail}
                  </Link>
                ) : null}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {C.eyebrow}
          </p>
          <h1 className="font-display text-2xl font-bold">{C.title}</h1>
          <p className="max-w-2xl text-muted-foreground">{C.description}</p>
        </div>
        <Button asChild>
          <Link href={START_HREF}>+ {C.new}</Link>
        </Button>
      </div>
      <Suspense>
        <Campaigns />
      </Suspense>
    </div>
  );
}
