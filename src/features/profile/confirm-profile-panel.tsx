"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";

/** Écran « coût estimé + confirmer » du profil de liens : le lancement exige un clic explicite. */
export function ConfirmProfilePanel({
  estimate,
  confirmed,
  action,
}: {
  /** null : le plafond de l'audit ne permet pas l'étape. */
  estimate: { totalUsd: number; competitors: number; rows: number; pages: number } | null;
  confirmed: boolean;
  action: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const e = t.profile.estimate;
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{t.profile.title}</h2>
      <p className="text-muted-foreground">{t.profile.body}</p>
      {estimate ? (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
            <dt className="text-muted-foreground">{e.total}</dt>
            <dd className="font-semibold">{formatUsd(estimate.totalUsd)}</dd>
            <dt className="text-muted-foreground">{e.competitors}</dt>
            <dd>{estimate.competitors}</dd>
            <dt className="text-muted-foreground">{e.rows}</dt>
            <dd>{estimate.rows}</dd>
            <dt className="text-muted-foreground">{e.pages}</dt>
            <dd>{estimate.pages}</dd>
          </dl>
          <p className="text-sm text-muted-foreground">{e.note}</p>
          <form action={formAction} className="flex flex-col gap-2">
            <Button type="submit" disabled={pending} className="self-start">
              {pending ? e.confirming : confirmed ? e.retrySend : e.confirm}
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
  );
}
