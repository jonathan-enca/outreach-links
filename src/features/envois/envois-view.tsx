"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AuditActionState } from "@/features/audits/service";

export interface EnvoiRow {
  id: string;
  /** Pour l'annulation : identifiant du brouillon (programmés seulement). */
  draftId?: string;
  primary: string;
  secondary: string;
  subject: string;
}

export interface EnvoisScreenProps {
  scheduled: EnvoiRow[];
  sent: EnvoiRow[];
  paused: boolean;
  boxes: number;
  queueNote: string | null;
  actions: {
    cancel: (draftId: string) => Promise<AuditActionState>;
    setPaused: (paused: boolean) => Promise<AuditActionState>;
  };
}

/** Écran « Envois » : suspension, emails programmés (avec annulation) et emails partis. */
export function EnvoisScreen({
  scheduled,
  sent,
  paused,
  boxes,
  queueNote,
  actions,
}: EnvoisScreenProps) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  function run(task: () => Promise<AuditActionState>) {
    start(async () => {
      const r = await task();
      setMessage(r.status === "error" ? (r.message ?? "Action impossible.") : (r.message ?? null));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-border bg-muted p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Ce que nous ne voyons pas.</strong> Nous n’avons pas
        accès à votre boîte de réception : nous ne voyons ni les réponses, ni si un message a été
        lu. Les réponses arrivent directement dans votre Gmail.
      </div>

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{paused ? "Envois suspendus" : "Envois actifs"}</h2>
            <p className="text-sm text-muted-foreground">
              {paused
                ? "Rien ne part tant que les envois sont suspendus. Rien n'est annulé."
                : "Les emails programmés partent à l'heure prévue."}
            </p>
          </div>
          {paused ? (
            <Button
              type="button"
              disabled={pending || boxes === 0}
              onClick={() => run(() => actions.setPaused(false))}
            >
              Reprendre les envois
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={pending || boxes === 0}
              onClick={() => run(() => actions.setPaused(true))}
            >
              Suspendre tous les envois
            </Button>
          )}
        </div>
        {boxes === 0 ? (
          <p className="text-sm text-muted-foreground">
            Connectez une boîte d’envoi dans Réglages pour programmer des emails.
          </p>
        ) : null}
        {queueNote ? <p className="text-sm text-muted-foreground">{queueNote}</p> : null}
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Programmés ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun email n’attend son départ.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {scheduled.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{r.primary}</p>
                  <p className="text-sm text-muted-foreground break-words">{r.secondary}</p>
                  <p className="text-sm break-words">{r.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">Programmé</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || !r.draftId}
                    onClick={() => r.draftId && run(() => actions.cancel(r.draftId!))}
                  >
                    Annuler
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Envoyés ({sent.length})</h2>
        {sent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun email n’est encore parti.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sent.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{r.primary}</p>
                  <p className="text-sm text-muted-foreground break-words">{r.secondary}</p>
                  <p className="text-sm break-words">{r.subject}</p>
                </div>
                <Badge tone="success">Envoyé</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
