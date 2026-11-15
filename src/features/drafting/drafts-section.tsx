"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { DraftsView } from "./service";

export function summarizeDrafts(view: Pick<DraftsView, "rows">) {
  const ready = view.rows.filter((r) => r.ready).length;
  return { ready, toFix: view.rows.length - ready };
}

export function DraftsSection({
  view,
  startAction,
}: {
  view: DraftsView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const m = t.drafts;
  const [state, formAction, pending] = useActionState(startAction, { status: "idle" });
  const canStart = view.status === "aucun" || view.status === "echoue";
  const sum = summarizeDrafts(view);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{m.title}</h2>
      <p className="text-muted-foreground">{m.body}</p>
      {view.status === "echoue" ? (
        <p className="text-danger">
          {m.failed}
          {view.error ? ` : ${view.error}` : ""}
        </p>
      ) : null}
      {view.status === "en_cours" ? <p role="status">{m.running}</p> : null}
      {canStart ? (
        <form action={formAction} className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? m.starting : m.start}
          </Button>
          {state.message ? (
            <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
      {view.rows.length > 0 ? (
        <>
          <p className="font-semibold">
            {m.summary.replace("{ready}", String(sum.ready)).replace("{fix}", String(sum.toFix))}
          </p>
          <ul className="flex flex-col gap-4">
            {view.rows.map((r) => (
              <li key={r.itemId} className="flex flex-col gap-2 border-t pt-3 first:border-t-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.domain}</span>
                  <Badge tone="neutral">{m.channels[r.channel]}</Badge>
                  <Badge tone={r.ready ? "success" : "warning"}>
                    {r.ready ? m.ready : m.toFix}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {m.why} {r.targetingReason}
                </p>
                <p className="text-sm text-muted-foreground">
                  {m.hook} « {r.hook} »
                </p>
                {r.subject ? <p className="text-sm font-semibold">{r.subject}</p> : null}
                <p className="whitespace-pre-line text-sm">{r.body}</p>
                {r.issues.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm text-danger">
                    {r.issues.map((i) => (
                      <li key={i.code}>{i.message}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
