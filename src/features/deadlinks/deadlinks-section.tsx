"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";

export interface DeadlinksView {
  status: string;
  errorMessage: string | null;
  stats: {
    requests: number;
    competitorUrlsChecked: number;
    resourcePagesCrawled: number;
    linksChecked: number;
    blockedByRobots: number;
    created: number;
    truncated: boolean;
  } | null;
}

/** Étape « chasseur 404 » (M2.2) : gratuite, déclenchée à la demande. */
export function DeadlinksSection({
  view,
  startAction,
}: {
  view: DeadlinksView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const d = t.deadlinks;
  const [state, formAction, pending] = useActionState(startAction, { status: "idle" });

  if (view.status === "en_cours") {
    return (
      <Card className="flex flex-col gap-1 p-6">
        <h2 className="font-display text-xl font-semibold">{d.running.title}</h2>
        <p className="text-muted-foreground">{d.running.body}</p>
      </Card>
    );
  }

  if (view.status === "termine" && view.stats) {
    const s = view.stats;
    return (
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold">{d.result.title}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
          <dt className="text-muted-foreground">{d.result.created}</dt>
          <dd className="font-semibold">{s.created}</dd>
          <dt className="text-muted-foreground">{d.result.competitorUrls}</dt>
          <dd>{s.competitorUrlsChecked}</dd>
          <dt className="text-muted-foreground">{d.result.pages}</dt>
          <dd>{s.resourcePagesCrawled}</dd>
          <dt className="text-muted-foreground">{d.result.links}</dt>
          <dd>{s.linksChecked}</dd>
          <dt className="text-muted-foreground">{d.result.robots}</dt>
          <dd>{s.blockedByRobots}</dd>
        </dl>
        {s.truncated ? <p className="text-sm text-muted-foreground">{d.result.truncated}</p> : null}
        <p className="text-xs text-muted-foreground">{d.result.note}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {view.status === "echoue" ? (
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="font-display text-xl font-semibold text-danger">{d.failed.title}</h2>
          {view.errorMessage ? <p className="text-sm">{view.errorMessage}</p> : null}
        </Card>
      ) : null}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-semibold">{d.title}</h2>
        <p className="text-muted-foreground">{d.body}</p>
        <form action={formAction} className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? d.confirming : d.start}
          </Button>
          {state.message ? (
            <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
              {state.message}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
