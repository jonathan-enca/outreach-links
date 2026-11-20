"use client";

import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import { groupByDay, type EnvoiRow } from "./format";
import type { EnvoisState, Quota } from "./service";

const M = t.envois;
const MAILBOX_SETTINGS = "/app/reglages/boite";
/** Emails partis montrés d'emblée ; les plus anciens derrière un bouton. */
const SENT_FIRST = 20;

export interface EnvoisScreenProps {
  state: EnvoisState;
  scheduled: EnvoiRow[];
  sent: EnvoiRow[];
  /** Nombre total d'emails partis (la liste peut en montrer moins). */
  sentTotal: number;
  /** Horaires d'envoi déjà mis en mots, et d'où partent les emails. */
  hours: string | null;
  from: string | null;
  /** Prochain départ déjà mis en mots, ou `null`. */
  next: string | null;
  day: Quota | null;
  /** La limite journalière retient le prochain départ (même si le compteur du jour n'est pas plein). */
  dayLimited: boolean;
  warmingUp: boolean;
  week: number;
  month: Quota | null;
  actions: {
    cancel: (draftId: string) => Promise<AuditActionState>;
    setPaused: (paused: boolean) => Promise<AuditActionState>;
  };
}

const DOT: Record<EnvoisState, string> = {
  actif: "bg-success ring-success/15",
  pause: "bg-warning ring-warning/20",
  sans_boite: "bg-muted-foreground ring-muted-foreground/15",
  simulation: "bg-muted-foreground ring-muted-foreground/15",
};

/** Un repère chiffré : libellé, valeur, et sa barre quand il a une limite (comme dans « Abonnement »). */
function Fact({
  label,
  value,
  unit,
  quota,
}: {
  label: string;
  value: string;
  unit?: string;
  quota?: Quota;
}) {
  const pct =
    quota && quota.cap > 0 ? Math.min(100, Math.round((quota.used / quota.cap) * 100)) : 0;
  return (
    <div className="border-b border-border px-4 py-3 last:border-b-0 sm:px-5 lg:border-r lg:border-b-0 lg:last:border-r-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {value}
        {unit ? <span className="font-normal text-muted-foreground"> {unit}</span> : null}
      </dd>
      {quota ? (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={quota.cap}
          aria-valuenow={Math.min(quota.used, quota.cap)}
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** La phrase sous les repères : une seule, la plus utile (quota du mois, limite du jour, démarrage). */
function quotaNote(
  day: Quota | null,
  dayLimited: boolean,
  month: Quota | null,
  warmingUp: boolean,
): { lead: string; text: string } | null {
  const n = M.notes;
  if (month && month.used >= month.cap) return n.monthFull;
  if (day && (dayLimited || day.used >= day.cap)) {
    return {
      lead: n.dayFull.lead,
      text: warmingUp ? n.dayFull.warmup(day.cap) : n.dayFull.steady,
    };
  }
  if (day && warmingUp) return { lead: n.warmup.lead, text: n.warmup.text(day.cap) };
  return null;
}

/** Une ligne de la boîte : heure, destinataire, objet et début du message ; un clic ouvre le message. */
function MailRow({
  row,
  sent,
  open,
  pending,
  onOpen,
  onCancel,
}: {
  row: EnvoiRow;
  sent: boolean;
  open: boolean;
  pending: boolean;
  onOpen: () => void;
  onCancel?: () => void;
}) {
  const bodyId = `message-${row.id}`;
  const preview = row.body.replace(/\s+/g, " ").trim();
  return (
    <li className="border-b border-border last:border-b-0" data-testid="envoi-row">
      <div
        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 px-4 py-2.5 hover:bg-muted/50 sm:grid-cols-[4.75rem_12rem_minmax(0,1fr)_auto]"
        onClick={(e) => {
          // Le bouton de l'objet et « Annuler » gardent leur propre effet.
          if ((e.target as HTMLElement).closest("button")) return;
          onOpen();
        }}
      >
        <span
          className={`order-2 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap tabular-nums sm:order-none ${sent ? "text-success" : "text-info"}`}
        >
          {sent ? (
            <Check aria-hidden="true" className="size-3.5 shrink-0" />
          ) : (
            <Clock aria-hidden="true" className="size-3.5 shrink-0" />
          )}
          {row.time}
        </span>
        <span className="order-1 min-w-0 sm:order-none">
          <span className="block truncate font-semibold">{row.domain}</span>
          <span className="block truncate text-[13px] text-muted-foreground">{row.email}</span>
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          title={open ? M.closeMessage : M.openMessage}
          onClick={onOpen}
          className={`order-3 col-span-2 min-w-0 rounded-sm text-left text-[14.5px] focus-visible:outline-2 focus-visible:outline-ring sm:order-none sm:col-span-1 ${open ? "" : "sm:truncate"}`}
        >
          <span className="font-medium">{row.subject}</span>
          {open || !preview ? null : (
            <span className="hidden text-muted-foreground sm:inline"> · {preview}</span>
          )}
        </button>
        <span className="order-4 col-span-2 justify-self-start sm:order-none sm:col-span-1 sm:justify-self-end">
          {sent ? (
            <span className="pr-1.5 text-[13px] font-medium whitespace-nowrap text-success">
              {M.sentBadge}
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !onCancel}
              aria-label={M.cancelLabel(row.domain)}
              onClick={onCancel}
            >
              {M.cancel}
            </Button>
          )}
        </span>
      </div>
      {open ? (
        <div
          id={bodyId}
          className="mx-4 mb-3.5 rounded-control bg-muted px-4 py-3.5 text-[14.5px] sm:ml-[6.5rem]"
        >
          <p className="mb-2.5 text-[13px] break-words text-muted-foreground">
            {M.to} {row.email}
            {row.meta ? ` · ${row.meta}` : ""}
          </p>
          <p className="break-words whitespace-pre-line">{row.body}</p>
        </div>
      ) : null}
    </li>
  );
}

/** La liste d'un dossier, rangée par jour. */
function MailList({
  rows,
  sent,
  empty,
  open,
  pending,
  onOpen,
  onCancel,
}: {
  rows: readonly EnvoiRow[];
  sent: boolean;
  empty: string;
  open: ReadonlySet<string>;
  pending: boolean;
  onOpen: (id: string) => void;
  onCancel?: (draftId: string) => void;
}) {
  if (rows.length === 0) {
    return <Card className="p-7 text-center text-muted-foreground">{empty}</Card>;
  }
  return (
    <Card className="overflow-hidden p-0">
      {groupByDay(rows).map((g) => (
        <section key={g.day} className="border-b border-border last:border-b-0">
          {g.day ? (
            <h3 className="border-b border-border bg-muted/60 px-4 py-1.5 text-[13px] font-medium text-muted-foreground">
              {g.day}
            </h3>
          ) : null}
          <ul>
            {g.rows.map((r) => (
              <MailRow
                key={r.id}
                row={r}
                sent={sent}
                open={open.has(r.id)}
                pending={pending}
                onOpen={() => onOpen(r.id)}
                onCancel={onCancel && r.draftId ? () => onCancel(r.draftId as string) : undefined}
              />
            ))}
          </ul>
        </section>
      ))}
    </Card>
  );
}

/**
 * Écran « Emails », façon boîte aux lettres (retour de Jonathan, 20/11) : l'état des envois et les quotas
 * en haut, dits une seule fois, puis deux dossiers, « Programmés » (avec annulation) et « Envoyés ».
 */
export function EnvoisScreen({
  state,
  scheduled,
  sent,
  sentTotal,
  hours,
  from,
  next,
  day,
  dayLimited,
  warmingUp,
  week,
  month,
  actions,
}: EnvoisScreenProps) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [allSent, setAllSent] = useState(false);
  function run(task: () => Promise<AuditActionState>) {
    start(async () => {
      const r = await task();
      setMessage(r.status === "error" ? (r.message ?? M.actionFailed) : (r.message ?? null));
    });
  }
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const nextSet = new Set(prev);
      if (!nextSet.delete(id)) nextSet.add(id);
      return nextSet;
    });

  const s = M.states[state];
  const stateText =
    state === "actif"
      ? hours
        ? M.states.actif.text(hours, from)
        : M.states.actif.fallback
      : M.states[state].text;
  const note =
    state === "actif" || state === "pause" ? quotaNote(day, dayLimited, month, warmingUp) : null;
  const f = M.facts;
  const shownSent = allSent ? sent : sent.slice(0, SENT_FIRST);
  const tabs = [
    { key: "scheduled", label: M.tabs.scheduled, count: scheduled.length },
    { key: "sent", label: M.tabs.sent, count: sentTotal },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0" aria-label={M.stateLabel} data-testid="envois-state">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ring-4 ${DOT[state]}`}
          />
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="text-[17px] font-semibold">{s.title}</h2>
            <p className="text-sm text-muted-foreground">
              {stateText}{" "}
              {state === "actif" ? (
                <Link
                  href={MAILBOX_SETTINGS}
                  className="whitespace-nowrap text-primary underline underline-offset-4"
                >
                  {M.editHours}
                </Link>
              ) : null}
            </p>
          </div>
          {state === "actif" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => run(() => actions.setPaused(true))}
            >
              {M.pause}
            </Button>
          ) : state === "pause" ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => run(() => actions.setPaused(false))}
            >
              {M.resume}
            </Button>
          ) : state === "sans_boite" ? (
            <Button asChild className="w-full sm:w-auto">
              <Link href={MAILBOX_SETTINGS}>{M.connect}</Link>
            </Button>
          ) : null}
        </div>
        {state === "actif" || state === "pause" ? (
          <dl className="grid border-t border-border lg:grid-cols-4">
            <Fact
              label={f.next}
              value={
                state === "pause"
                  ? f.nextPaused
                  : (next ?? (scheduled.length > 0 ? f.nextUnknown : f.nextNone))
              }
            />
            {day ? (
              <Fact label={f.day} value={String(day.used)} unit={f.of(day.cap)} quota={day} />
            ) : null}
            <Fact label={f.week} value={String(week)} unit={f.weekValue(week)} />
            {month ? (
              <Fact
                label={f.month}
                value={String(month.used)}
                unit={f.of(month.cap)}
                quota={month}
              />
            ) : (
              <Fact label={f.month} value={f.none} />
            )}
          </dl>
        ) : null}
        {note ? (
          <p className="border-t border-border px-4 py-2.5 text-[13.5px] text-muted-foreground sm:px-5">
            <strong className="font-medium text-foreground">{note.lead}</strong> {note.text}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-col gap-3.5">
        <div role="tablist" aria-label={M.tabsLabel} className="flex gap-1 border-b border-border">
          {tabs.map((x) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={tab === x.key}
              onClick={() => {
                setTab(x.key);
                setMessage(null);
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 font-medium focus-visible:outline-2 focus-visible:outline-ring ${tab === x.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {x.label}
              <span
                className={`rounded-full px-2 text-[12.5px] tabular-nums ${tab === x.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
              >
                {x.count}
              </span>
            </button>
          ))}
        </div>

        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}

        {tab === "scheduled" ? (
          <MailList
            rows={scheduled}
            sent={false}
            empty={M.emptyScheduled}
            open={open}
            pending={pending}
            onOpen={toggleOpen}
            onCancel={(draftId) => run(() => actions.cancel(draftId))}
          />
        ) : (
          <>
            <MailList
              rows={shownSent}
              sent
              empty={M.emptySent}
              open={open}
              pending={pending}
              onOpen={toggleOpen}
            />
            {!allSent && sent.length > SENT_FIRST ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-center"
                onClick={() => setAllSent(true)}
              >
                {M.older(sent.length - SENT_FIRST)}
              </Button>
            ) : null}
            {allSent && sentTotal > sent.length ? (
              <p className="text-center text-sm text-muted-foreground">
                {M.truncated(sent.length)}
              </p>
            ) : null}
            <p className="px-1 text-[13.5px] text-muted-foreground">{M.replies}</p>
          </>
        )}
      </div>
    </div>
  );
}
