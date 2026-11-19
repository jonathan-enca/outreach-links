import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteHref, START_HREF } from "@/features/shell/next-step";
import { loadOverview } from "@/features/shell/overview";
import { selectedSiteId } from "@/features/shell/current-site";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const H = t.shell.home;

function Stat({
  label,
  value,
  hint,
  first,
}: {
  label: string;
  value: number;
  hint: string;
  first?: boolean;
}) {
  return (
    <Card className={`p-4 ${first ? "border-t-[3px] border-t-primary" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-3xl font-bold leading-tight tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </Card>
  );
}

/**
 * Accueil (maquette validée le 18/11) : quatre compteurs, la liste « Vos premiers liens » (une action par
 * étape, cochée quand elle est faite) et ce qui attend la personne. Sans aucun site : étape 1.
 */
async function Home() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  // Le site choisi dans le menu filtre l'accueil : compteurs, étapes et « À faire maintenant ».
  const o = await loadOverview(supabase, await selectedSiteId(supabase));
  if (o.campaigns.length === 0) redirect(START_HREF);
  const first = o.campaigns[0]!;
  const withTargets = o.campaigns.find((c) => c.step.kind === "cibles") ?? null;
  const mailboxHref = `/app/reglages/boite?site=${first.siteId}`;
  const steps = [
    {
      key: "campaign" as const,
      done: withTargets !== null,
      href: first.step.href,
      label: [H.steps.campaign, H.steps.campaignDone],
      hint: H.steps.campaignHint,
    },
    {
      key: "validate" as const,
      done: o.totals.validated > 0,
      href: withTargets ? siteHref.cibles(withTargets.siteId) : first.step.href,
      label: [H.steps.validate, H.steps.validateDone],
      hint: H.steps.validateHint,
    },
    {
      key: "mailbox" as const,
      done: o.hasMailbox,
      href: mailboxHref,
      label: [H.steps.mailbox, H.steps.mailboxDone],
      hint: H.steps.mailboxHint,
    },
    {
      key: "send" as const,
      done: o.totals.contacted > 0,
      href: "/app/a-valider",
      label: [H.steps.send, H.steps.sendDone],
      hint: H.steps.sendHint,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextKey = steps.find((s) => !s.done)?.key ?? null;
  const pct =
    o.totals.contacted > 0 ? Math.round((o.totals.replies / o.totals.contacted) * 100) : null;
  const todo = [
    { n: o.pending.replies, text: H.todo.replies, href: "/app/inbox" },
    { n: o.pending.drafts, text: H.todo.drafts, href: "/app/a-valider" },
    { n: o.pending.forms, text: H.todo.forms, href: "/app/taches" },
  ].filter((x) => x.n > 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{H.hello}</h1>
          <p className="text-muted-foreground">{H.lead}</p>
        </div>
        <Button asChild>
          <Link href={START_HREF}>+ {H.newCampaign}</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          first
          label={H.stats.targets}
          value={o.totals.targets}
          hint={H.stats.targetsHint(o.totals.validated)}
        />
        <Stat label={H.stats.sent} value={o.totals.contacted} hint={H.stats.sentHint} />
        <Stat label={H.stats.replies} value={o.totals.replies} hint={H.stats.repliesHint(pct)} />
        <Stat label={H.stats.links} value={o.totals.links} hint={H.stats.linksHint} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="px-5 py-2">
          <div className="flex items-center justify-between gap-3 py-3">
            <h2 className="font-semibold">{H.steps.title}</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {H.steps.progress(doneCount, steps.length)}
            </span>
          </div>
          <ol>
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-4 border-t border-border py-3.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    s.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.done ? <Check aria-hidden className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.label[s.done ? 1 : 0]}</p>
                  <p className="text-sm text-muted-foreground">{s.hint}</p>
                </div>
                {!s.done ? (
                  <Button asChild size="sm" variant={s.key === nextKey ? "default" : "outline"}>
                    <Link href={s.href}>{H.steps.go[s.key]}</Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-semibold">{H.todo.title}</h2>
          {todo.length === 0 ? (
            <p className="text-sm text-muted-foreground">{H.todo.none}</p>
          ) : (
            <ul>
              {todo.map((x) => (
                <li
                  key={x.href}
                  className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <span className="text-sm">{x.text(x.n)}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={x.href}>{H.todo.open}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
