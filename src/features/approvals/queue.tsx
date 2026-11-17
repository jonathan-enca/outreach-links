"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { PendingForm, PendingMessage, PendingReply, QueueView, SignedView } from "./service";

const V = t.toValidate;
type Result = Promise<AuditActionState>;
type Edit = (id: string, input: { subject: string; body: string }) => Result;

export interface QueueActions {
  approveMessages: (ids: string[]) => Result;
  editMessage: Edit;
  approveReply: (id: string) => Result;
  editReply: Edit;
  rejectReply: (id: string) => Result;
  completeForm: (id: string, taskId: string) => Result;
  draftMissing: () => Result;
}

type Filter = "tout" | "messages" | "reponses" | "formulaires";

const LABEL = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/** Corps d'un message : lecture, ou modification sur place (objet + texte). */
function Body({
  subject,
  body,
  signed,
  editing,
  withSubject,
  onChange,
}: {
  subject: string | null;
  body: string;
  signed?: SignedView | null;
  editing: boolean;
  withSubject: boolean;
  onChange: (s: string, b: string) => void;
}) {
  if (!editing)
    return (
      <>
        {subject ? <p className="font-semibold">{subject}</p> : null}
        {signed ? (
          <div className="rounded-control bg-muted px-3 py-2.5 text-sm">
            <p className="whitespace-pre-line">{signed.content}</p>
            <div className="mt-3 flex items-center gap-3 [overflow-wrap:anywhere]">
              {signed.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo servi par jeton
                <img
                  src={signed.logoUrl}
                  alt=""
                  className="h-10 w-auto max-w-24 shrink-0 object-contain"
                />
              ) : null}
              <div className="flex min-w-0 flex-col">
                {signed.lines.map((l, i) => (
                  <span
                    key={i}
                    className={
                      l.strong ? "font-semibold" : l.href ? "text-info underline" : undefined
                    }
                  >
                    {l.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-line rounded-control bg-muted px-3 py-2.5 text-sm">{body}</p>
        )}
      </>
    );
  return (
    <div className="flex flex-col gap-2">
      {withSubject ? (
        <input
          aria-label={V.subject}
          defaultValue={subject ?? ""}
          onChange={(e) => onChange(e.target.value, body)}
          className="h-10 rounded-control border border-border bg-card px-3 text-sm font-semibold"
        />
      ) : null}
      <textarea
        aria-label={V.body}
        defaultValue={body}
        rows={8}
        onChange={(e) => onChange(subject ?? "", e.target.value)}
        className="rounded-control border border-border bg-card px-3 py-2 text-sm"
      />
    </div>
  );
}

/** Une carte de la file : en-tête, message, encadré d'explication, actions. */
function Item({
  tone,
  tag,
  to,
  campaign,
  subject,
  body,
  signed,
  withSubject,
  aside,
  issues,
  primary,
  secondary,
  onEdit,
  onLater,
  extra,
}: {
  tone: "info" | "warning" | "neutral";
  tag: string;
  to: string | null;
  campaign?: string;
  subject: string | null;
  body: string;
  signed?: SignedView | null;
  withSubject: boolean;
  aside: { title: string; text: string }[];
  issues?: string[];
  /** `hint` : la raison affichée au survol quand le bouton est désactivé. */
  primary: { label: string; run: () => Result; disabled?: boolean; hint?: string } | null;
  secondary?: { label: string; run: () => Result };
  onEdit?: Edit extends (id: string, i: infer I) => Result ? (i: I) => Result : never;
  onLater: () => void;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ subject: subject ?? "", body });
  const [state, setState] = useState<AuditActionState>({ status: "idle" });
  const [pending, start] = useTransition();
  const run = (fn: () => Result, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setState(r);
      if (r.status !== "error") {
        after?.();
        router.refresh();
      }
    });
  return (
    <Card className="grid gap-x-6 gap-y-3 p-4 md:p-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone}>{tag}</Badge>
          <span className="min-w-0 break-all text-sm text-muted-foreground">
            {to ? `${V.to} ${to}` : ""}
            {campaign ? ` · ${campaign}` : ""}
          </span>
        </div>
        <Body
          subject={subject}
          body={body}
          signed={signed}
          editing={editing}
          withSubject={withSubject}
          onChange={(s, b) => setDraft({ subject: s, body: b })}
        />
        {issues && issues.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-danger">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <aside className="flex min-w-0 flex-col gap-2 text-sm text-muted-foreground">
        {aside.map((a) => (
          <div key={a.title}>
            <p className={LABEL}>{a.title}</p>
            <p className="break-words">{a.text}</p>
          </div>
        ))}
      </aside>
      <div className="flex flex-wrap items-center gap-2 xl:col-span-2">
        {editing && onEdit ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => onEdit(draft),
                  () => setEditing(false),
                )
              }
            >
              {pending ? V.saving : V.save}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {V.cancel}
            </Button>
          </>
        ) : (
          <>
            {primary ? (
              // Un bouton désactivé ne reçoit pas le survol : l'explication est portée par son enveloppe.
              <span
                title={primary.disabled ? primary.hint : undefined}
                className={`w-full md:w-auto ${primary.disabled && primary.hint ? "cursor-not-allowed" : ""}`}
              >
                <Button
                  type="button"
                  size="sm"
                  className="w-full md:w-auto"
                  disabled={pending || primary.disabled}
                  onClick={() => run(primary.run)}
                >
                  {pending ? V.busy : primary.label}
                </Button>
              </span>
            ) : null}
            {extra}
            {onEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                {V.edit}
              </Button>
            ) : null}
            {secondary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(secondary.run)}
              >
                {secondary.label}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={onLater}>
              {V.later}
            </Button>
          </>
        )}
        {state.message ? (
          <p
            role="status"
            className={`w-full text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      className="w-full md:w-auto"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? V.copied : V.copy}
    </Button>
  );
}

/**
 * File « À valider » (maquette validée le 18/11) : premiers messages, réponses proposées et formulaires
 * dans une seule liste. Chaque élément s'approuve, se modifie ou se remet à plus tard sur place.
 * « Plus tard » masque l'élément pour cette visite seulement : rien n'est supprimé.
 */
export function ApprovalQueue({ view, actions }: { view: QueueView; actions: QueueActions }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("tout");
  const [later, setLater] = useState<Set<string>>(() => new Set());
  const [bulk, setBulk] = useState<AuditActionState>({ status: "idle" });
  const [pending, start] = useTransition();
  const hide = (id: string) => setLater((prev) => new Set(prev).add(id));
  const msgs = view.messages.filter((m) => !later.has(m.id));
  const replies = view.replies.filter((r) => !later.has(r.id));
  const forms = view.forms.filter((f) => !later.has(f.id));
  // Approbation groupée : les emails prêts, et seulement avec une boîte d'envoi connectée.
  const ready = view.hasMailbox ? msgs.filter((m) => m.ready) : [];
  const total = msgs.length + replies.length + forms.length;
  const chips: [Filter, string, number][] = [
    ["tout", V.filters.all, total],
    ["reponses", V.filters.replies, replies.length],
    ["messages", V.filters.messages, msgs.length],
    ["formulaires", V.filters.forms, forms.length],
  ];
  const show = (f: Filter) => filter === "tout" || filter === f;
  // Pendant une rédaction, l'écran se met à jour seul : les nouveaux messages arrivent sans recharger.
  useEffect(() => {
    if (!view.drafting) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [view.drafting, router]);
  const missingBanner = view.drafting ? (
    <Card className="p-4 text-sm" role="status">
      {V.drafting}
    </Card>
  ) : view.missing > 0 ? (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <span>{V.missing(view.missing)}</span>
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setBulk(await actions.draftMissing());
            router.refresh();
          })
        }
      >
        {pending ? V.busy : V.missingCta}
      </Button>
    </Card>
  ) : null;
  const declinedCard =
    view.declined.length > 0 ? (
      <Card className="p-4 text-sm">
        <details>
          <summary className="cursor-pointer font-semibold">
            {V.declined(view.declined.length)}
          </summary>
          <p className="mt-2 text-muted-foreground">{V.declinedHelp}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {view.declined.map((d, i) => (
              <li key={`${d.domain}-${i}`} className="border-t pt-2 first:border-t-0 first:pt-0">
                {d.pageUrl ? (
                  <a
                    href={d.pageUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    {d.domain}
                  </a>
                ) : (
                  <span className="font-semibold">{d.domain}</span>
                )}
                <p className="text-muted-foreground">{d.reason}</p>
              </li>
            ))}
          </ul>
        </details>
      </Card>
    ) : null;
  if (view.messages.length + view.replies.length + view.forms.length === 0)
    return (
      <div className="flex flex-col gap-4">
        {missingBanner}
        {bulk.message ? (
          <p role="status" className={bulk.status === "error" ? "text-danger" : "text-success"}>
            {bulk.message}
          </p>
        ) : null}
        <Card className="p-6 text-muted-foreground">{V.none}</Card>
        {declinedCard}
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      {missingBanner}
      {!view.hasMailbox && view.messages.some((m) => m.channel === "email") ? (
        <Card className="border-warning/40 bg-warning/5 p-4 text-sm">
          {V.noMailbox}{" "}
          <Link
            href="/app/reglages/boite"
            className="font-semibold text-primary underline underline-offset-4"
          >
            {V.connect}
          </Link>
        </Card>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={V.filters.label} className="flex gap-2 overflow-x-auto pb-1">
          {chips
            .filter(([k, , n]) => k === "tout" || n > 0)
            .map(([k, label, n]) => (
              <Button
                key={k}
                type="button"
                size="sm"
                className="shrink-0"
                variant={filter === k ? "default" : "outline"}
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
              >
                {label} ({n})
              </Button>
            ))}
        </div>
        {ready.length > 1 ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setBulk(await actions.approveMessages(ready.map((m) => m.id)));
                router.refresh();
              })
            }
          >
            {pending ? V.busy : V.approveAll(ready.length)}
          </Button>
        ) : null}
      </div>
      {bulk.message ? (
        <p role="status" className={bulk.status === "error" ? "text-danger" : "text-success"}>
          {bulk.message}
        </p>
      ) : null}
      {total === 0 ? <Card className="p-6 text-muted-foreground">{V.allLater}</Card> : null}
      <ul className="flex flex-col gap-4">
        {show("reponses")
          ? replies.map((r: PendingReply) => (
              <li key={r.id}>
                <Item
                  tone="warning"
                  tag={V.tags.reply}
                  to={r.to}
                  subject={r.subject}
                  body={r.body}
                  signed={r.signed}
                  withSubject={r.subject !== null}
                  aside={[{ title: V.aside.theirs, text: `« ${r.theirs} »` }]}
                  primary={{ label: V.approve, run: () => actions.approveReply(r.id) }}
                  secondary={{ label: V.noReply, run: () => actions.rejectReply(r.id) }}
                  onEdit={(i) => actions.editReply(r.id, i)}
                  onLater={() => hide(r.id)}
                  extra={
                    r.classificationId ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/app/inbox/${r.classificationId}`}>{V.openThread}</Link>
                      </Button>
                    ) : null
                  }
                />
              </li>
            ))
          : null}
        {show("messages")
          ? msgs.map((m: PendingMessage) => (
              <li key={m.id}>
                <Item
                  tone="info"
                  tag={V.tags.message}
                  to={m.to}
                  campaign={m.campaign}
                  subject={m.subject}
                  body={m.body}
                  signed={m.signed}
                  withSubject
                  aside={[
                    { title: V.aside.hook, text: m.hook },
                    { title: V.aside.then, text: V.aside.thenEmail },
                  ]}
                  issues={m.issues.map((i) => i.message)}
                  primary={{
                    label: V.approve,
                    run: () => actions.approveMessages([m.id]),
                    disabled: !m.ready || !view.hasMailbox,
                    hint: !m.ready ? V.hintNotReady : !view.hasMailbox ? V.hintMailbox : undefined,
                  }}
                  onEdit={(i) => actions.editMessage(m.id, i)}
                  onLater={() => hide(m.id)}
                />
              </li>
            ))
          : null}
        {show("formulaires")
          ? forms.map((f: PendingForm) => (
              <li key={f.id}>
                <Item
                  tone="neutral"
                  tag={V.tags.form}
                  to={f.domain}
                  campaign={f.campaign}
                  subject={V.formSubject}
                  body={f.body}
                  withSubject={false}
                  aside={[{ title: V.aside.todo, text: V.aside.todoForm }]}
                  issues={f.issues.map((i) => i.message)}
                  primary={null}
                  secondary={{
                    label: V.markDone,
                    run: () => actions.completeForm(f.id, f.taskId),
                  }}
                  onEdit={(i) => actions.editMessage(f.id, { subject: "", body: i.body })}
                  onLater={() => hide(f.id)}
                  extra={
                    <>
                      <CopyButton text={f.body} />
                      <Button asChild size="sm" variant="outline">
                        <a href={f.formUrl} target="_blank" rel="noreferrer">
                          {V.openForm}
                        </a>
                      </Button>
                    </>
                  }
                />
              </li>
            ))
          : null}
      </ul>
      {declinedCard}
    </div>
  );
}
