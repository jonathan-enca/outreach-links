"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { CATEGORIES, CATEGORY_LABELS } from "@/features/classification/types";
import { t } from "@/lib/messages";
import {
  choosePaymentAction,
  correctCategoryAction,
  editDraftAction,
  generateDraftAction,
  rejectDraftAction,
  setAutonomyAction,
  setStateAction,
  validateDraftAction,
} from "./actions";
import { PAYMENT_OPTIONS } from "./payment";
import type { ReplyDraftRow, Thread } from "./service";

type Idle = AuditActionState;
const IDLE: Idle = { status: "idle" };

function Msg({ s }: { s: AuditActionState }) {
  return s.message ? (
    <p role="status" className={s.status === "error" ? "text-danger" : "text-success"}>
      {s.message}
    </p>
  ) : null;
}

/** Bouton pour une action serveur sans formulaire. */
function Act({
  label,
  run,
  variant = "outline",
}: {
  label: string;
  run: () => Promise<AuditActionState>;
  variant?: "default" | "outline";
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<AuditActionState>(IDLE);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() => start(async () => setState(await run()))}
      >
        {label}
      </Button>
      <Msg s={state} />
    </span>
  );
}

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
      {done ? t.inbox.copied : t.inbox.copy}
    </Button>
  );
}

function DraftCard({ d, id }: { d: ReplyDraftRow; id: string }) {
  const m = t.inbox;
  const [state, action, pending] = useActionState(editDraftAction.bind(null, id, d.id), IDLE);
  const open = d.status === "brouillon";
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={d.status === "validee" ? "success" : d.status === "rejetee" ? "neutral" : "info"}
        >
          {d.kind === "pret_a_inserer" ? m.readyToInsert : m.drafts}
        </Badge>
        {d.edited ? <Badge tone="neutral">{m.edited}</Badge> : null}
        {d.linkNature ? (
          <Badge tone={d.linkNature === "sponsorise" ? "warning" : "neutral"}>
            {m.payment.natureLabels[d.linkNature as keyof typeof m.payment.natureLabels]}
          </Badge>
        ) : null}
        {d.budgetCapEur !== null ? <Badge tone="warning">≤ {d.budgetCapEur} €</Badge> : null}
      </div>
      {d.insertion ? (
        <dl className="grid gap-1 text-sm">
          <div>
            <dt className="font-semibold">{m.insertPage}</dt>
            <dd>{d.insertion.page_url}</dd>
          </div>
          <div>
            <dt className="font-semibold">{m.insertAnchor}</dt>
            <dd>{d.insertion.anchor}</dd>
          </div>
          <div>
            <dt className="font-semibold">{m.insertLink}</dt>
            <dd>{d.insertion.link_url}</dd>
          </div>
          <div>
            <dt className="font-semibold">{m.insertAdd}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {d.insertion.sentence_to_add} <CopyButton text={d.insertion.sentence_to_add} />
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{m.insertAfter}</dt>
            <dd>{d.insertion.sentence_after}</dd>
          </div>
        </dl>
      ) : null}
      {open ? (
        <form action={action} className="flex flex-col gap-2">
          {d.kind === "reponse" ? (
            <label className="flex flex-col gap-1 text-sm">
              {m.subject}
              <input name="subject" defaultValue={d.subject ?? ""} className="rounded border p-2" />
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            {m.message}
            <textarea name="body" defaultValue={d.body} rows={8} className="rounded border p-2" />
          </label>
          <div>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? m.saving : m.save}
            </Button>
          </div>
          <Msg s={state} />
        </form>
      ) : (
        <pre className="whitespace-pre-wrap text-sm">{d.body}</pre>
      )}
      {open && d.issues.length > 0 ? (
        <div className="text-sm text-danger">
          <p>{m.toFix}</p>
          <ul className="list-disc pl-5">
            {d.issues.map((i) => (
              <li key={i.code}>{i.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {open ? (
        <div className="flex flex-wrap gap-2">
          <Act label={m.validate} variant="default" run={() => validateDraftAction(id, d.id)} />
          <Act label={m.reject} run={() => rejectDraftAction(id, d.id)} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {d.status === "validee" ? m.validated : m.rejected}
        </p>
      )}
    </Card>
  );
}

function PaymentPanel({ id }: { id: string }) {
  const m = t.inbox.payment;
  const [state, action, pending] = useActionState(choosePaymentAction.bind(null, id), IDLE);
  const [option, setOption] = useState<string>("decliner");
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="font-semibold">{m.title}</h3>
      <p className="text-sm text-muted-foreground">{m.body}</p>
      <form action={action} className="flex flex-col gap-2">
        {PAYMENT_OPTIONS.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="option"
              value={o}
              checked={option === o}
              onChange={() => setOption(o)}
            />
            {m[o]}
          </label>
        ))}
        {option === "achat_plafonne" ? (
          <label className="flex flex-col gap-1 text-sm">
            {m.budget}
            <input name="budget" inputMode="decimal" className="w-32 rounded border p-2" />
          </label>
        ) : null}
        <div>
          <Button type="submit" disabled={pending}>
            {m.choose}
          </Button>
        </div>
        <Msg s={state} />
      </form>
    </Card>
  );
}

function CorrectForm({ id, current }: { id: string; current: string }) {
  const m = t.inbox;
  const [state, action, pending] = useActionState(correctCategoryAction.bind(null, id), IDLE);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-2">
        {m.category}
        <select name="category" defaultValue={current} className="rounded border p-1">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        {m.correct}
      </Button>
      <p className="w-full text-xs text-muted-foreground">{m.correctHint}</p>
      <Msg s={state} />
    </form>
  );
}

function AutonomyForm({ workspaceId, level }: { workspaceId: string; level: string }) {
  const m = t.inbox.autonomy;
  const [state, action, pending] = useActionState(setAutonomyAction.bind(null, workspaceId), IDLE);
  return (
    <form action={action} className="flex flex-col gap-2 text-sm">
      <h3 className="font-semibold">{m.title}</h3>
      <p className="text-muted-foreground">{m.body}</p>
      {(["manuel", "assiste"] as const).map((l) => (
        <label key={l} className="flex items-center gap-2">
          <input type="radio" name="level" value={l} defaultChecked={level === l} />
          {m[l]}
        </label>
      ))}
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {m.save}
        </Button>
      </div>
      <Msg s={state} />
    </form>
  );
}

export function ThreadView({ thread, theirBody }: { thread: Thread; theirBody: string }) {
  const m = t.inbox;
  const r = thread.row;
  const cat = r.validatedCategory ?? r.category;
  const canPrepare = thread.drafts.length === 0 && !r.injectionSuspected;
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{r.fromEmail ?? r.toEmail}</span>
          <Badge tone="neutral">{CATEGORY_LABELS[cat]}</Badge>
          <span className="text-sm text-muted-foreground">
            {m.confidence.replace("{n}", String(Math.round(r.confidence * 100)))}
          </span>
          {r.needsReview ? <Badge tone="warning">{m.toReview}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{r.justification}</p>
        {r.injectionSuspected ? <p className="text-sm text-danger">{m.injection}</p> : null}
        <CorrectForm id={r.id} current={cat} />
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2 p-4">
          <h3 className="font-semibold">{m.ourMessage}</h3>
          <p className="text-sm font-medium">{thread.ourSubject}</p>
          <pre className="whitespace-pre-wrap text-sm">{thread.ourBody}</pre>
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <h3 className="font-semibold">{m.theirMessage}</h3>
          <p className="text-sm font-medium">{r.subject}</p>
          <pre className="whitespace-pre-wrap text-sm">{theirBody}</pre>
        </Card>
      </section>

      {cat === "demande_paiement" ? <PaymentPanel id={r.id} /> : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">{m.drafts}</h2>
        {thread.drafts.length === 0 ? <p className="text-muted-foreground">{m.noDraft}</p> : null}
        {thread.drafts.map((d) => (
          <DraftCard key={d.id} d={d} id={r.id} />
        ))}
        {canPrepare && cat !== "demande_paiement" ? (
          <div>
            <Act label={m.prepare} run={() => generateDraftAction(r.id)} />
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-2">
        <h3 className="w-full font-semibold">{m.state.title}</h3>
        {(["en_negociation", "gagne", "archive", "aucun"] as const).map((s) => (
          <Act key={s} label={m.state[s]} run={() => setStateAction(r.id, s)} />
        ))}
      </section>

      <Card className="p-4">
        <AutonomyForm workspaceId={thread.workspaceId} level={thread.autonomy} />
      </Card>
    </div>
  );
}
