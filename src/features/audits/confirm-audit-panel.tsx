"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import type { AuditActionState } from "./service";

/**
 * « Lancer l'analyse » : une phrase, la durée, un bouton. Aucun montant (décision D1) : le coût
 * d'API reste contrôlé et journalisé côté serveur, `confirmAudit` refuse toujours de dépasser le plafond.
 */
export function ConfirmAuditPanel({
  confirmed,
  resume = false,
  action,
}: {
  /** true : déjà confirmé, seul le renvoi du travail est proposé. */
  confirmed: boolean;
  /** true : l'analyse a échoué, le bouton la reprend là où elle s'était arrêtée. */
  resume?: boolean;
  action: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const e = t.audits.estimate;
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{resume ? e.resumeTitle : e.title}</h2>
      <p className="text-muted-foreground">{resume ? e.resumeBody : e.body}</p>
      <form action={formAction} className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="h-12 self-start px-6 text-base">
          {pending ? e.confirming : resume ? e.resume : confirmed ? e.retrySend : e.confirm}
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
