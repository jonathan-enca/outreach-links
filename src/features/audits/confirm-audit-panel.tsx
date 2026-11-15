"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { formatUsd } from "./format";
import type { ChainEstimate } from "./chain";
import type { AuditActionState } from "./service";

/** Écran « coût estimé + confirmer » : le lancement exige un clic explicite. */
export function ConfirmAuditPanel({
  estimatedUsd,
  capUsd,
  perQuery,
  chain,
  confirmed,
  action,
}: {
  estimatedUsd: number;
  capUsd: number;
  perQuery: { query: string; usd: number }[];
  /** MA.6 : coût de tout le parcours (absent sur les anciens audits). */
  chain?: ChainEstimate | null;
  /** true : déjà confirmé, seul le renvoi du travail est proposé. */
  confirmed: boolean;
  action: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const e = t.audits.estimate;
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{e.title}</h2>
      <p className="text-muted-foreground">{e.body}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
        <dt className="text-muted-foreground">{e.total}</dt>
        <dd className="font-semibold">{formatUsd(estimatedUsd)}</dd>
        <dt className="text-muted-foreground">{e.cap}</dt>
        <dd>{formatUsd(capUsd)}</dd>
        <dt className="text-muted-foreground">{e.calls}</dt>
        <dd>{perQuery.length}</dd>
      </dl>
      <div>
        <h3 className="font-medium">{e.perQuery}</h3>
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {perQuery.map((q) => (
            <li key={q.query} className="flex justify-between gap-4">
              <span>{q.query}</span>
              <span className="text-muted-foreground">{formatUsd(q.usd)}</span>
            </li>
          ))}
        </ul>
      </div>
      {chain ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{t.audits.chain.title}</h3>
          <p className="text-sm text-muted-foreground">{t.audits.chain.body}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:max-w-md">
            <dt className="text-muted-foreground">{t.audits.chain.discovery}</dt>
            <dd>{formatUsd(chain.discoveryUsd)}</dd>
            <dt className="text-muted-foreground">{t.audits.chain.backlinks}</dt>
            <dd>{formatUsd(chain.backlinksUsd)}</dd>
            <dt className="text-muted-foreground">{t.audits.chain.profile}</dt>
            <dd>{formatUsd(chain.profileUsd)}</dd>
            <dt className="text-muted-foreground">{t.audits.chain.opportunities}</dt>
            <dd>{formatUsd(chain.opportunitiesUsd)}</dd>
            <dt className="font-medium">{t.audits.chain.total}</dt>
            <dd className="font-semibold">{formatUsd(chain.totalUsd)}</dd>
          </dl>
          {chain.uncovered.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.audits.chain.uncovered} (
              {chain.uncovered.map((k) => t.audits.chain.stage[k]).join(", ")})
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{e.note}</p>
      <form action={formAction} className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? e.confirming : confirmed ? e.retrySend : e.confirm}
        </Button>
        {state.message ? (
          <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
            {state.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
