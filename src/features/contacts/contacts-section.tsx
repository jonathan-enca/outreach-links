"use client";

import { useActionState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { ContactsView } from "./service";

const TONES: Record<string, BadgeTone> = {
  email_verifie: "success",
  email_a_verifier: "warning",
  formulaire: "warning",
  pending: "neutral",
};

/** Résumé chiffré : emails vérifiés, formulaires à la main, cibles sans contact. */
export function summarizeContacts(view: Pick<ContactsView, "rows">) {
  const sendable = view.rows.filter((r) => r.sendable).length;
  const form = view.rows.filter((r) => r.status === "formulaire").length;
  const missing = view.rows.filter((r) => r.status === "introuvable").length;
  return { sendable, form, missing };
}

export function ContactsSection({
  view,
  startAction,
}: {
  view: ContactsView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const m = t.contacts;
  const [state, formAction, pending] = useActionState(startAction, { status: "idle" });
  const byItem = new Map(view.rows.map((r) => [r.itemId, r]));
  const canStart = view.status === "aucun" || view.status === "echoue";
  const sum = summarizeContacts(view);

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
            {m.summary
              .replace("{sendable}", String(sum.sendable))
              .replace("{form}", String(sum.form))
              .replace("{missing}", String(sum.missing))}
          </p>
          {view.openTasks > 0 ? (
            <p className="text-sm text-muted-foreground">
              {m.tasks.replace("{count}", String(view.openTasks))}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {view.items.map((item) => {
              const r = byItem.get(item.id);
              const key = r?.status ?? "pending";
              return (
                <li key={item.id} className="flex flex-col gap-1 border-t pt-3 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.domain}</span>
                    <Badge tone={TONES[key] ?? "danger"}>
                      {m.statuses[key as keyof typeof m.statuses]}
                    </Badge>
                  </div>
                  {r ? <p className="text-sm">{r.reason}</p> : null}
                  {r?.email ? <p className="text-sm text-muted-foreground">{r.email}</p> : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
