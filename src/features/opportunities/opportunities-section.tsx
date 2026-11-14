"use client";

import { useActionState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";

export interface OpportunitiesView {
  status: string;
  /** null : le plafond de l'étape ne permet pas de la lancer. */
  estimate: { totalUsd: number; queries: number; capUsd: number } | null;
  errorMessage: string | null;
  costUsd: number | null;
  total: number;
  byType: Record<string, number>;
  items: {
    domain: string;
    type: string;
    priority: string;
    targetPageUrl: string;
    rationale: string;
  }[];
}

const tone = (p: string): BadgeTone =>
  p === "haute" ? "success" : p === "moyenne" ? "warning" : "neutral";

/** Étape « opportunités de liens » (M2.1) : confirmer le coût, puis voir les opportunités. */
export function OpportunitiesSection({
  view,
  startAction,
}: {
  view: OpportunitiesView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const o = t.opportunities;
  const [state, formAction, pending] = useActionState(startAction, { status: "idle" });

  if (view.status === "en_cours") {
    return (
      <Card className="flex flex-col gap-1 p-6">
        <h2 className="font-display text-xl font-semibold">{o.running.title}</h2>
        <p className="text-muted-foreground">{o.running.body}</p>
      </Card>
    );
  }

  if (view.status === "termine") {
    const r = o.result;
    return (
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-semibold">{r.title}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
          <dt className="text-muted-foreground">{r.total}</dt>
          <dd className="font-semibold">{view.total}</dd>
          <dt className="text-muted-foreground">{r.cost}</dt>
          <dd>{formatUsd(view.costUsd)}</dd>
        </dl>
        <p className="text-sm text-muted-foreground">
          {r.byType} :{" "}
          {Object.entries(view.byType)
            .map(([k, n]) => `${o.types[k as keyof typeof o.types] ?? k} ${n}`)
            .join(", ") || "-"}
        </p>
        {view.items.length === 0 ? (
          <p>{r.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">{r.domain}</th>
                  <th className="py-2 pr-4 font-medium">{r.type}</th>
                  <th className="py-2 pr-4 font-medium">{r.priority}</th>
                  <th className="py-2 pr-4 font-medium">{r.target}</th>
                  <th className="py-2 font-medium">{r.why}</th>
                </tr>
              </thead>
              <tbody>
                {view.items.map((i) => (
                  <tr key={i.domain} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 font-medium">{i.domain}</td>
                    <td className="py-2 pr-4">
                      {o.types[i.type as keyof typeof o.types] ?? i.type}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone={tone(i.priority)}>
                        {o.priorities[i.priority as keyof typeof o.priorities] ?? i.priority}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 break-all">{i.targetPageUrl}</td>
                    <td className="py-2">{i.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{r.note}</p>
      </Card>
    );
  }

  const e = o.estimate;
  return (
    <div className="flex flex-col gap-4">
      {view.status === "echoue" ? (
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="font-display text-xl font-semibold text-danger">{o.failed.title}</h2>
          <p className="text-muted-foreground">{o.failed.body}</p>
          {view.errorMessage ? <p className="text-sm">{view.errorMessage}</p> : null}
        </Card>
      ) : null}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-display text-xl font-semibold">{o.title}</h2>
        <p className="text-muted-foreground">{o.body}</p>
        {view.estimate ? (
          <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
              <dt className="text-muted-foreground">{e.total}</dt>
              <dd className="font-semibold">{formatUsd(view.estimate.totalUsd)}</dd>
              <dt className="text-muted-foreground">{e.queries}</dt>
              <dd>{view.estimate.queries}</dd>
              <dt className="text-muted-foreground">{e.cap}</dt>
              <dd>{formatUsd(view.estimate.capUsd)}</dd>
            </dl>
            <p className="text-sm text-muted-foreground">{e.note}</p>
            <form action={formAction} className="flex flex-col gap-2">
              <Button type="submit" disabled={pending} className="self-start">
                {pending ? e.confirming : view.status === "confirme" ? e.retrySend : e.confirm}
              </Button>
              {state.message ? (
                <p
                  role="status"
                  className={state.status === "error" ? "text-danger" : "text-success"}
                >
                  {state.message}
                </p>
              ) : null}
            </form>
          </>
        ) : (
          <p>{e.unavailable}</p>
        )}
      </Card>
    </div>
  );
}
