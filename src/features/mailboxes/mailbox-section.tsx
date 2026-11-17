"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { connectMailboxAction, removeMailboxAction, testMailboxAction } from "./actions";
import { healthWarnings } from "./health-warnings";
import type { MailboxState } from "./service";

export interface MailboxView {
  id: string;
  email: string;
  status: "en_attente" | "verifiee" | "erreur" | "suspendue";
  smtpOk: boolean | null;
  imapOk: boolean | null;
  lastError: string | null;
  health: { spf: boolean; dkim: boolean; dmarc: boolean } | null;
  hourlyCap: number;
  dailyCap: number;
}

const m = t.mailboxes;
const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Status({ state }: { state: MailboxState }) {
  return state.message ? (
    <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
      {state.message}
    </p>
  ) : null;
}

/** Texte d'avertissement de santé du domaine (testé séparément). */
export function healthText(h: MailboxView["health"]): string | null {
  if (!h) return null;
  const missing = healthWarnings(h);
  if (missing.length === 0) return m.healthOk;
  return m.healthMissing.replace("{list}", missing.map((x) => x.toUpperCase()).join(", "));
}

function Row({ siteId, box }: { siteId: string; box: MailboxView }) {
  const [testState, test, testing] = useActionState(testMailboxAction.bind(null, siteId, box.id), {
    status: "idle",
  } as MailboxState);
  const [rmState, remove, removing] = useActionState(
    removeMailboxAction.bind(null, siteId, box.id),
    { status: "idle" } as MailboxState,
  );
  const warn = healthText(box.health);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{box.email}</strong>
        <Badge>{m.status[box.status]}</Badge>
      </div>
      <p className="text-sm">
        {m.smtp} : {box.smtpOk === null ? "—" : box.smtpOk ? m.ok : m.ko} · {m.imap} :{" "}
        {box.imapOk === null ? "—" : box.imapOk ? m.ok : m.ko}
      </p>
      <p className="text-sm">
        {m.caps.replace("{hourly}", String(box.hourlyCap)).replace("{daily}", String(box.dailyCap))}
      </p>
      {warn ? (
        <p className="text-sm">
          <strong>{m.healthTitle} :</strong> {warn}
        </p>
      ) : null}
      {box.lastError ? <p className="text-sm text-danger">{box.lastError}</p> : null}
      <div className="flex gap-2">
        <form action={test}>
          <Button type="submit" disabled={testing}>
            {testing ? m.testing : m.test}
          </Button>
        </form>
        <form action={remove}>
          <Button type="submit" variant="outline" disabled={removing}>
            {m.remove}
          </Button>
        </form>
      </div>
      <Status state={testState} />
      <Status state={rmState} />
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1" htmlFor={`mb-${name}`}>
      <span className="font-medium">{label}</span>
      <input
        id={`mb-${name}`}
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        autoComplete={type === "password" ? "new-password" : "off"}
        className={inputClass}
      />
    </label>
  );
}

export function MailboxSection({ siteId, boxes }: { siteId: string; boxes: MailboxView[] }) {
  const [state, connect, pending] = useActionState(connectMailboxAction.bind(null, siteId), {
    status: "idle",
  } as MailboxState);
  return (
    <Card id="boite-envoi" className="flex scroll-mt-4 flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      <p>{m.body}</p>
      {boxes.map((b) => (
        <Row key={b.id} siteId={siteId} box={b} />
      ))}
      {boxes.length === 0 ? (
        <form action={connect} className="grid gap-3 sm:grid-cols-2">
          <Field name="email" label={m.email} type="email" />
          <Field name="fromName" label={m.fromName} />
          <Field name="username" label={m.username} />
          <Field name="password" label={m.password} type="password" />
          <Field name="smtpHost" label={m.smtpHost} />
          <Field name="smtpPort" label={m.smtpPort} defaultValue="587" />
          <Field name="imapHost" label={m.imapHost} />
          <Field name="imapPort" label={m.imapPort} defaultValue="993" />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? m.connecting : m.connect}
            </Button>
          </div>
          <div className="sm:col-span-2">
            <Status state={state} />
          </div>
        </form>
      ) : (
        <Status state={state} />
      )}
    </Card>
  );
}
