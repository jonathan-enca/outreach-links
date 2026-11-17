"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import {
  createBatchAction,
  editDraftAction,
  removeFromBatchAction,
  validateBatchAction,
} from "./actions";
import { BATCH_LIMITS } from "./limits";
import type { BatchItemView, BatchView, BatchesView } from "./service";

type Act = (prev: AuditActionState) => Promise<AuditActionState>;
type FormAct = (prev: AuditActionState, fd: FormData) => Promise<AuditActionState>;

export function batchSummary(b: Pick<BatchView, "items">) {
  const ready = b.items.filter((i) => i.ready).length;
  return {
    ready,
    toFix: b.items.length - ready,
    canValidate: b.items.length > 0 && ready === b.items.length,
  };
}

function Status({ state }: { state: AuditActionState }) {
  return state.message ? (
    <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
      {state.message}
    </p>
  ) : null;
}

function ItemRow({
  item,
  locked,
  edit,
  remove,
}: {
  item: BatchItemView;
  locked: boolean;
  edit: FormAct;
  remove: Act;
}) {
  const m = t.batches;
  const [editState, editAction, editing] = useActionState(edit, { status: "idle" });
  const [rmState, rmAction, removing] = useActionState(remove, { status: "idle" });
  return (
    <li className="flex flex-col gap-2 border-t pt-3 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{item.domain}</span>
        <Badge tone={item.ready ? "success" : "warning"}>{item.ready ? m.ready : m.toFix}</Badge>
        {item.edited ? <Badge tone="neutral">{m.edited}</Badge> : null}
      </div>
      <p className="text-sm">{item.request}</p>
      <p className="text-sm text-muted-foreground">
        {m.why} {item.targetingReason}
      </p>
      {item.triageReason ? (
        <p className="text-sm text-muted-foreground">
          {m.triage} {item.triageReason}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {m.hook} « {item.hook} »
      </p>
      {item.channel === "formulaire" && item.formUrl ? (
        <p className="text-sm text-muted-foreground">
          {m.formChannel}{" "}
          <a href={item.formUrl} target="_blank" rel="noreferrer" className="underline">
            {item.formUrl}
          </a>
        </p>
      ) : null}
      {item.email ? (
        <p className="text-sm text-muted-foreground">
          {m.to} {item.email}
        </p>
      ) : null}
      {item.issues.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-danger">
          {item.issues.map((i) => (
            <li key={i.code}>{i.message}</li>
          ))}
        </ul>
      ) : null}
      {locked ? (
        <>
          {item.subject ? <p className="text-sm font-semibold">{item.subject}</p> : null}
          <p className="whitespace-pre-line text-sm">{item.body}</p>
        </>
      ) : (
        <details>
          <summary className="cursor-pointer text-sm underline underline-offset-4">
            {m.edit}
          </summary>
          <form action={editAction} className="mt-2 flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm">
              {m.subject}
              <input
                name="subject"
                defaultValue={item.subject ?? ""}
                className="rounded-md border bg-background p-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {m.message}
              <textarea
                name="body"
                defaultValue={item.body}
                rows={8}
                className="rounded-md border bg-background p-2"
              />
            </label>
            <Button type="submit" disabled={editing} className="self-start">
              {editing ? m.saving : m.save}
            </Button>
            <Status state={editState} />
          </form>
          <form action={rmAction} className="mt-2">
            <Button type="submit" variant="outline" disabled={removing}>
              {m.remove}
            </Button>
            <Status state={rmState} />
          </form>
        </details>
      )}
      {!locked ? (
        <>
          {item.subject ? <p className="text-sm font-semibold">{item.subject}</p> : null}
          <p className="whitespace-pre-line text-sm">{item.body}</p>
        </>
      ) : null}
    </li>
  );
}

function BatchCard({
  batch,
  validate,
  editFor,
  removeFor,
}: {
  batch: BatchView;
  validate: Act;
  editFor: (draftId: string) => FormAct;
  removeFor: (draftId: string) => Act;
}) {
  const m = t.batches;
  const [state, action, pending] = useActionState(validate, { status: "idle" });
  const locked = batch.status === "valide";
  const sum = batchSummary(batch);
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold">
          {m.lot.replace("{n}", String(batch.number))}
        </h3>
        <Badge tone={locked ? "success" : "info"}>{m.status[batch.status]}</Badge>
        <span className="text-sm text-muted-foreground">
          {m.count.replace("{n}", String(batch.items.length))}
        </span>
      </div>
      {locked ? (
        <p className="text-sm text-muted-foreground">
          {m.locked}
          {batch.validatedAt
            ? ` ${m.validatedOn.replace("{date}", new Date(batch.validatedAt).toLocaleDateString("fr-FR"))}`
            : ""}
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-2">
          <Button type="submit" disabled={pending || !sum.canValidate} className="self-start">
            {pending ? m.validating : m.validate}
          </Button>
          <Status state={state} />
        </form>
      )}
      <ul className="flex flex-col gap-4">
        {batch.items.map((it) => (
          <ItemRow
            key={it.draftId}
            item={it}
            locked={locked}
            edit={editFor(it.draftId)}
            remove={removeFor(it.draftId)}
          />
        ))}
      </ul>
    </div>
  );
}

export function BatchesSection({ view, auditId }: { view: BatchesView; auditId: string }) {
  const m = t.batches;
  const [state, action, pending] = useActionState(createBatchAction.bind(null, auditId), {
    status: "idle",
  });
  const hasOpen = view.batches.some((b) => b.status === "brouillon");
  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{m.title}</h2>
      <p className="text-muted-foreground">{m.body}</p>
      <p className="text-sm">{m.eligible.replace("{n}", String(view.eligible))}</p>
      {!hasOpen ? (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {m.sizeLabel}
            <input
              type="number"
              name="size"
              defaultValue={BATCH_LIMITS.defaultSize}
              min={BATCH_LIMITS.minSize}
              max={BATCH_LIMITS.maxSize}
              className="w-28 rounded-md border bg-background p-2"
            />
          </label>
          <Button type="submit" disabled={pending || view.eligible === 0}>
            {pending ? m.creating : m.create}
          </Button>
          <Status state={state} />
        </form>
      ) : null}
      {[...view.batches].reverse().map((b) => (
        <BatchCard
          key={b.id}
          batch={b}
          validate={validateBatchAction.bind(null, auditId, b.id)}
          editFor={(d) => editDraftAction.bind(null, auditId, b.id, d)}
          removeFor={(d) => removeFromBatchAction.bind(null, auditId, b.id, d)}
        />
      ))}
    </Card>
  );
}
