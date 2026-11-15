"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import {
  groupTasks,
  reminderText,
  STATE_TONES,
  type TaskGroup,
  type TaskState,
  type TaskView,
} from "./view";

const T = t.tasks;
type Act = (prev: AuditActionState, formData: FormData) => Promise<AuditActionState>;

export interface TaskActions {
  complete: Act;
  followUp: Act;
  cancel: Act;
  skip: Act;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? T.actions.copied : T.actions.copy}
    </Button>
  );
}

function ActionForm({
  action,
  taskId,
  label,
  variant = "default",
  reason,
}: {
  action: Act;
  taskId: string;
  label: string;
  variant?: "default" | "outline";
  reason?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="task_id" value={taskId} />
      {reason ? <input type="hidden" name="reason" value={reason} /> : null}
      <Button type="submit" variant={variant} disabled={pending}>
        {label}
      </Button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function MessageBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted p-3 font-sans text-sm">
        {text}
      </pre>
      <div>
        <CopyButton text={text} />
      </div>
    </div>
  );
}

function TaskCard({ r, actions }: { r: TaskView & { state: TaskState }; actions: TaskActions }) {
  const followUp = r.state === "relance_due" || r.state === "attente_relance";
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{r.domain}</span>
        <Badge tone={STATE_TONES[r.state]}>{T.status[r.state]}</Badge>
        {r.followUpCancelReason ? (
          <Badge tone="neutral">
            {T.cancelReason[r.followUpCancelReason as keyof typeof T.cancelReason] ??
              r.followUpCancelReason}
          </Badge>
        ) : null}
      </div>
      <p className="break-all text-sm text-muted-foreground">
        {T.fields.page} :{" "}
        <a className="underline" href={r.formUrl} target="_blank" rel="noopener noreferrer">
          {r.formUrl}
        </a>
      </p>
      <p className="break-all text-sm text-muted-foreground">
        {T.fields.target} : {r.targetUrl}
      </p>
      {r.doneAt ? (
        <p className="text-sm text-muted-foreground">
          {T.fields.doneOn.replace("{date}", fmt(r.doneAt))}
          {r.state === "attente_relance"
            ? ` · ${T.fields.followUpOn.replace("{date}", fmt(r.followUpDueAt))}`
            : ""}
        </p>
      ) : null}

      {r.state === "a_faire" ? (
        <>
          <MessageBox label={T.fields.message} text={r.message} />
          <div className="flex flex-wrap items-start gap-2">
            <Button asChild variant="outline">
              <a href={r.formUrl} target="_blank" rel="noopener noreferrer">
                {T.actions.open}
              </a>
            </Button>
            <ActionForm action={actions.complete} taskId={r.id} label={T.actions.done} />
            <ActionForm
              action={actions.skip}
              taskId={r.id}
              label={T.actions.skip}
              variant="outline"
            />
          </div>
        </>
      ) : null}

      {r.state === "relance_due" && r.followUpMessage ? (
        <MessageBox label={T.fields.followUpMessage} text={r.followUpMessage} />
      ) : null}

      {followUp ? (
        <div className="flex flex-wrap items-start gap-2">
          {r.state === "relance_due" ? (
            <>
              <Button asChild variant="outline">
                <a href={r.formUrl} target="_blank" rel="noopener noreferrer">
                  {T.actions.open}
                </a>
              </Button>
              <ActionForm action={actions.followUp} taskId={r.id} label={T.actions.followUpDone} />
            </>
          ) : null}
          <ActionForm
            action={actions.cancel}
            taskId={r.id}
            reason="reponse"
            label={T.actions.gotReply}
            variant="outline"
          />
          <ActionForm
            action={actions.cancel}
            taskId={r.id}
            reason="refus"
            label={T.actions.refused}
            variant="outline"
          />
          <ActionForm
            action={actions.cancel}
            taskId={r.id}
            reason="abandon"
            label={T.actions.abandon}
            variant="outline"
          />
        </div>
      ) : null}
    </Card>
  );
}

const ORDER: TaskGroup[] = ["toDo", "followUp", "waiting", "closed"];

export function TasksSection({
  rows,
  actions,
  now,
}: {
  rows: TaskView[];
  actions: TaskActions;
  now: Date;
}) {
  const groups = groupTasks(rows, now);
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">{T.intro}</p>
      <p role="status" className="font-medium">
        {reminderText({ toDo: groups.toDo.length, followUps: groups.followUp.length })}
      </p>
      {ORDER.map((g) => (
        <section key={g} aria-labelledby={`tasks-${g}`} className="flex flex-col gap-3">
          <h2 id={`tasks-${g}`} className="font-display text-lg font-semibold">
            {T.sections[g]} ({groups[g].length})
          </h2>
          {groups[g].length === 0 ? (
            <p className="text-sm text-muted-foreground">{T.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {groups[g].map((r) => (
                <li key={r.id}>
                  <TaskCard r={r} actions={actions} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
