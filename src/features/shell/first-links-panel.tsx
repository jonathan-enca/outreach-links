import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { readSearchConsoleStatus, searchConsoleEnabled } from "@/features/search-console/load";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { firstLinkSteps, nextFirstLinkKey, type FirstLinkKey } from "./first-links";
import type { OverviewView } from "./overview";
import { START_HREF } from "./next-step";

const H = t.shell.home;

/**
 * « Vos premiers liens », visible dès l'arrivée : sur l'accueil et sur tous les écrans d'onboarding.
 * Chaque étape cochée se voit ; la première non cochée (hors facultative) est mise en avant.
 * Le lecteur de la Search Console ne lit que le premier site (celui que le fil désigne).
 */
export async function FirstLinksPanel({ o }: { o: OverviewView }) {
  const firstSiteId = o.sites[0]?.id ?? null;
  const campaign = o.campaigns.find((c) => c.siteId === firstSiteId) ?? o.campaigns[0] ?? null;
  const shown = searchConsoleEnabled();
  const scConnected =
    shown && firstSiteId
      ? Boolean(await readSearchConsoleStatus(createServiceClient(), firstSiteId))
      : false;
  const steps = firstLinkSteps({
    firstSiteId,
    searchConsoleShown: shown,
    searchConsoleConnected: scConnected,
    campaignDone: o.campaigns.some((c) => c.step.kind === "cibles"),
    campaignHref: campaign?.step.href ?? START_HREF,
    validated: o.totals.validated > 0,
    mailbox: o.hasMailbox,
    sent: o.totals.contacted > 0,
  });
  const nextKey = nextFirstLinkKey(steps);
  const doneCount = steps.filter((s) => s.done).length;

  const copy = (key: FirstLinkKey) => {
    switch (key) {
      case "searchConsole":
        return {
          label: [H.steps.searchConsole, H.steps.searchConsoleDone],
          hint: H.steps.searchConsoleHint,
        };
      case "campaign":
        return { label: [H.steps.campaign, H.steps.campaignDone], hint: H.steps.campaignHint };
      case "validate":
        return { label: [H.steps.validate, H.steps.validateDone], hint: H.steps.validateHint };
      case "mailbox":
        return { label: [H.steps.mailbox, H.steps.mailboxDone], hint: H.steps.mailboxHint };
      case "send":
        return { label: [H.steps.send, H.steps.sendDone], hint: H.steps.sendHint };
    }
  };

  return (
    <Card className="px-5 py-2">
      <div className="flex items-center justify-between gap-3 py-3">
        <h2 className="font-semibold">{H.steps.title}</h2>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {H.steps.progress(doneCount, steps.length)}
        </span>
      </div>
      <ol>
        {steps.map((s, i) => {
          const c = copy(s.key);
          return (
            <li key={s.key} className="flex items-center gap-4 border-t border-border py-3.5">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold",
                  s.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {s.done ? <Check aria-hidden className="size-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {c.label[s.done ? 1 : 0]}
                  {s.optional ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                      {H.steps.optional}
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted-foreground">{c.hint}</p>
              </div>
              {!s.done ? (
                <Button asChild size="sm" variant={s.key === nextKey ? "default" : "outline"}>
                  {s.href.startsWith("/api/") ? (
                    <a href={s.href}>{H.steps.go[s.key]}</a>
                  ) : (
                    <Link href={s.href}>{H.steps.go[s.key]}</Link>
                  )}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
