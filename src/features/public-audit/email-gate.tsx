"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { unlockReportAction, type PublicActionState } from "./actions";

const initial: PublicActionState = { status: "idle" };

/** Email demandé pour voir le rapport complet (déverrouillage côté serveur, cookie httpOnly). */
export function EmailGate({ auditId }: { auditId: string }) {
  const g = t.publicAudit.gate;
  const [state, action, pending] = useActionState(unlockReportAction.bind(null, auditId), initial);
  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="font-display text-xl font-semibold">{g.title}</h2>
      <p className="text-muted-foreground">{g.body}</p>
      <form action={action} className="flex flex-col gap-3 sm:max-w-md" noValidate>
        <label htmlFor="email" className="text-sm font-medium">
          {g.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-10 rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent" className="mt-1" />
          <span>{g.consent}</span>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? g.pending : g.submit}
        </Button>
        {state.status === "error" ? (
          <p role="alert" className="text-danger">
            {state.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{g.legal}</p>
      </form>
    </Card>
  );
}
