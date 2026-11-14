"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import type { AuditActionState } from "./service";

/** Bouton « Préparer un audit » : crée l'audit et calcule le coût estimé (aucun appel payant). */
export function PrepareAuditForm({
  action,
  label,
}: {
  action: (prev: AuditActionState) => Promise<AuditActionState>;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <Button type="submit" size="sm" disabled={pending}>
        {label ?? t.audits.prepare}
      </Button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
