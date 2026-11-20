"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Mail,
  MessageSquare,
  Reply,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { draftingProgress } from "./drafting-progress";
import {
  campaignInitial,
  groupByCampaign,
  nextRowId,
  queueRows,
  selectionSummary,
  type Nature,
  type QueueRow,
  type SelectionSummary,
} from "./queue-model";
import type { QueueView, SignedView, SnoozedItem } from "./service";

const V = t.toValidate;
type Result = Promise<AuditActionState>;
type Draft = { subject: string; body: string };
type Edit = (id: string, input: Draft) => Result;

export interface QueueActions {
  approveMessages: (ids: string[]) => Result;
  editMessage: Edit;
  approveReply: (id: string) => Result;
  approveReplies: (ids: string[]) => Result;
  snooze: (ids: string[]) => Result;
  /** Sans argument : tout remettre dans la file. */
  wakeSnoozed: (ids?: string[]) => Result;
  refuseItems: (messageIds: string[], replyIds: string[]) => Result;
  editReply: Edit;
  rejectReply: (id: string) => Result;
  completeForm: (id: string, taskId: string) => Result;
  draftMissing: () => Result;
  draftAnyway: (itemId: string) => Result;
}

type Tab = "tout" | Nature | "plus-tard";
/** Lignes montrées par campagne avant « Afficher les autres ». */
const PREVIEW = 8;
const LABEL = "text-xs font-semibold text-muted-foreground";
const NATURE = {
  reponses: { tone: "warning", label: V.row.reply, Icon: Reply },
  messages: { tone: "info", label: V.row.email, Icon: Mail },
  formulaires: { tone: "neutral", label: V.row.form, Icon: ClipboardList },
} as const;
/** Pastilles de campagne : trois habillages neutres, l'initiale et le nom portent le sens. */
const AVATARS = [
  "bg-foreground text-background",
  "bg-muted-foreground text-background",
  "border-[1.5px] border-foreground bg-card text-foreground",
];

function Avatar({ label, index }: { label: string; index: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
        AVATARS[Math.max(index, 0) % AVATARS.length],
      )}
    >
      {campaignInitial(label)}
    </span>
  );
}

function NatureBadge({ nature }: { nature: Nature }) {
  const n = NATURE[nature];
  return (
    <Badge tone={n.tone}>
      <n.Icon aria-hidden className="size-3" />
      {n.label}
    </Badge>
  );
}

/** Case à cocher d'un groupe : à moitié pleine quand une partie seulement est choisie. */
function Check3({
  label,
  all,
  some,
  onChange,
}: {
  label: string;
  all: boolean;
  some: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 shrink-0 accent-primary"
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = some && !all;
      }}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/** Le message tel qu'il partira (avec la signature), ou sa modification sur place. */
function Body({
  subject,
  body,
  signed,
  editing,
  draft,
  onChange,
}: {
  subject: string | null;
  body: string;
  signed?: SignedView | null;
  editing: boolean;
  draft: Draft;
  onChange: (d: Draft) => void;
}) {
  if (!editing)
    return (
      <>
        {subject ? <p className="text-[15px] font-semibold">{subject}</p> : null}
        {signed ? (
          <div className="rounded-control bg-muted px-3 py-2.5 text-sm">
            <p className="whitespace-pre-line [overflow-wrap:anywhere]">{signed.content}</p>
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
          <p className="whitespace-pre-line rounded-control bg-muted px-3 py-2.5 text-sm [overflow-wrap:anywhere]">
            {body}
          </p>
        )}
      </>
    );
  return (
    <div className="flex flex-col gap-2">
      {subject !== null ? (
        <input
          aria-label={V.subject}
          value={draft.subject}
          onChange={(e) => onChange({ ...draft, subject: e.target.value })}
          className="h-10 rounded-control border border-border bg-card px-3 text-sm font-semibold"
        />
      ) : null}
      <textarea
        aria-label={V.body}
        value={draft.body}
        rows={10}
        onChange={(e) => onChange({ ...draft, body: e.target.value })}
        className="rounded-control border border-border bg-card px-3 py-2 text-sm"
      />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      className="w-full"
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

/** Ce qu'une ligne dit en trois temps : qui, quoi, pourquoi (ou ce qui cloche). */
function rowText(row: QueueRow): {
  title: string;
  line: string;
  note: string;
  tone: "muted" | "warning" | "danger";
} {
  if (row.nature === "reponses")
    return {
      title: row.item.to ?? "",
      line: row.item.theirs ? `« ${row.item.theirs} »` : (row.item.subject ?? ""),
      note: "",
      tone: "muted",
    };
  if (row.nature === "formulaires")
    return {
      title: row.item.domain,
      line: V.formSubject,
      note: row.item.issues[0] ? `${V.row.fix} ${row.item.issues[0].message}` : V.row.formWhy,
      tone: row.item.issues[0] ? "danger" : "muted",
    };
  const m = row.item;
  const issue = m.issues[0]?.message;
  return {
    title: m.domain,
    line: m.subject ?? "",
    note: issue ? `${V.row.fix} ${issue}` : m.hook,
    tone: issue ? "danger" : "muted",
  };
}

const NOTE_TONE = {
  muted: "text-muted-foreground",
  warning: "text-warning",
  danger: "text-danger",
};

function RowLine({
  row,
  current,
  selected,
  onSelect,
  onOpen,
}: {
  row: QueueRow;
  current: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onOpen: () => void;
}) {
  const x = rowText(row);
  return (
    <li
      className={cn(
        "flex items-start gap-3 border-b border-border px-3.5 py-2.5",
        selected && "bg-primary/5",
        // La ligne lue n'est marquée que là où le panneau de lecture est à côté (grand écran).
        current && "xl:bg-primary/5 xl:shadow-[inset_3px_0_0_var(--primary)]",
      )}
    >
      <input
        type="checkbox"
        aria-label={`${V.select} : ${x.title}`}
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="mt-1 size-4 shrink-0 accent-primary"
      />
      <button
        type="button"
        onClick={onOpen}
        aria-label={V.row.open(x.title)}
        aria-current={current ? "true" : undefined}
        className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
          <NatureBadge nature={row.nature} />
          <span className="min-w-0 truncate font-semibold">{x.title}</span>
        </span>
        <span className="mt-0.5 max-w-full truncate">{x.line}</span>
        {x.note ? (
          <span className={cn("max-w-full truncate text-[13px]", NOTE_TONE[x.tone])}>{x.note}</span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Panneau de lecture d'un élément : le message complet, pourquoi ce site, et les décisions.
 * Sur téléphone il occupe tout l'écran, boutons collés en bas.
 */
function Reader({
  row,
  campaignIndex,
  position,
  total,
  hasMailbox,
  actions,
  onPrev,
  onNext,
  onBack,
  onDone,
}: {
  row: QueueRow;
  campaignIndex: number;
  position: number;
  total: number;
  hasMailbox: boolean;
  actions: QueueActions;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onBack: () => void;
  onDone: (r: AuditActionState, o: { advance: boolean; undo?: string[] }) => void;
}) {
  const it = row.item;
  const subject = row.nature === "formulaires" ? null : row.item.subject;
  const [editing, setEditing] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [draft, setDraft] = useState<Draft>({ subject: subject ?? "", body: it.body });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Result, o: { advance: boolean; undo?: string[] }, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.status === "error") {
        setError(r.message ?? V.messages.saveError);
        return;
      }
      setError(null);
      after?.();
      onDone(r, o);
    });
  const save = () =>
    run(
      () =>
        row.nature === "reponses"
          ? actions.editReply(row.id, draft)
          : actions.editMessage(row.id, {
              subject: row.nature === "formulaires" ? "" : draft.subject,
              body: draft.body,
            }),
      { advance: false },
      () => setEditing(false),
    );
  const later = () => run(() => actions.snooze([row.id]), { advance: true, undo: [row.id] });
  const blocked =
    row.nature !== "messages"
      ? null
      : !row.item.ready
        ? V.hintNotReady
        : !hasMailbox
          ? V.hintMailbox
          : null;
  const issues = row.nature === "reponses" ? [] : row.item.issues;
  const nav = "inline-flex size-8 items-center justify-center rounded-control border border-border";

  return (
    <div className="flex min-h-full flex-col xl:min-h-0">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button type="button" size="sm" variant="ghost" className="xl:hidden" onClick={onBack}>
          <ChevronLeft aria-hidden />
          {V.pane.back}
        </Button>
        <span className="hidden min-w-0 items-center gap-2 font-semibold xl:flex">
          <Avatar label={row.campaign} index={campaignIndex} />
          <span className="truncate">{row.campaign}</span>
        </span>
        <span className="ml-auto shrink-0 text-[13px] text-muted-foreground">
          {V.pane.position(position, total)}
        </span>
        <button
          type="button"
          className={cn(nav, !onPrev && "opacity-40")}
          disabled={!onPrev}
          onClick={onPrev ?? undefined}
          aria-label={V.pane.previous}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          className={cn(nav, !onNext && "opacity-40")}
          disabled={!onNext}
          onClick={onNext ?? undefined}
          aria-label={V.pane.next}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex min-w-0 items-center gap-2 font-semibold xl:hidden">
            <Avatar label={row.campaign} index={campaignIndex} />
            <span className="truncate">{row.campaign}</span>
          </span>
          <NatureBadge nature={row.nature} />
        </div>
        <p className="break-all text-[13px] text-muted-foreground">
          {row.nature === "formulaires"
            ? row.item.domain
            : row.item.to
              ? `${V.to} ${row.item.to}`
              : ""}
        </p>
        {row.nature === "reponses" && row.item.theirs ? (
          <div>
            <p className={LABEL}>{V.aside.theirs}</p>
            <p className="text-sm">« {row.item.theirs} »</p>
          </div>
        ) : null}
        <Body
          subject={row.nature === "formulaires" ? V.formSubject : subject}
          body={it.body}
          signed={row.nature === "formulaires" ? null : row.item.signed}
          editing={editing}
          draft={draft}
          onChange={setDraft}
        />
        {issues.length > 0 ? (
          <ul className="list-disc pl-5 text-sm text-danger">
            {issues.map((i) => (
              <li key={i.message}>{i.message}</li>
            ))}
          </ul>
        ) : null}
        {row.nature === "messages" ? (
          <>
            <div className="text-sm">
              <p className={LABEL}>{V.pane.why}</p>
              <p>
                <mark className="mark-hook">{row.item.hook}</mark>
              </p>
              {row.item.reason && row.item.reason !== row.item.hook ? (
                <p className="text-muted-foreground">{row.item.reason}</p>
              ) : null}
            </div>
            <div className="text-sm">
              <p className={LABEL}>{V.recap.approveTitle}</p>
              <p>{V.aside.thenEmail}</p>
            </div>
          </>
        ) : null}
        {row.nature === "formulaires" ? (
          <div className="text-sm">
            <p className={LABEL}>{V.aside.todo}</p>
            <p>{V.aside.todoForm}</p>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-card p-3 xl:static">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? V.saving : V.save}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              {V.cancel}
            </Button>
          </div>
        ) : refusing ? (
          <>
            <p className="text-sm">{V.refuseHelp}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                disabled={pending}
                onClick={() => run(() => actions.refuseItems([row.id], []), { advance: true })}
              >
                {pending ? V.busy : V.confirmRefuse}
              </Button>
              <Button type="button" variant="outline" onClick={() => setRefusing(false)}>
                {V.cancel}
              </Button>
            </div>
          </>
        ) : (
          <>
            {row.nature === "formulaires" ? (
              <>
                <CopyButton text={row.item.body} />
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline">
                    <a href={row.item.formUrl} target="_blank" rel="noreferrer">
                      {V.openForm}
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() => actions.completeForm(row.id, row.item.taskId), { advance: true })
                    }
                  >
                    {pending ? V.busy : V.markDone}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={pending || blocked !== null}
                onClick={() =>
                  run(
                    () =>
                      row.nature === "reponses"
                        ? actions.approveReply(row.id)
                        : actions.approveMessages([row.id]),
                    { advance: true },
                  )
                }
              >
                <Send aria-hidden />
                {pending ? V.sending : V.approve}
              </Button>
            )}
            {blocked ? <p className="text-[13px] text-muted-foreground">{blocked}</p> : null}
            <div
              className={cn(
                "grid gap-2",
                row.nature === "formulaires" ? "grid-cols-2" : "grid-cols-3",
              )}
            >
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                {V.edit}
              </Button>
              {row.nature === "messages" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setRefusing(true)}>
                  {V.refuse}
                </Button>
              ) : null}
              {row.nature === "reponses" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => actions.rejectReply(row.id), { advance: true })}
                >
                  {V.noReply}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                title={V.laterHelp}
                onClick={later}
              >
                {V.later}
              </Button>
            </div>
            {row.nature === "reponses" && row.item.classificationId ? (
              <Link
                href={`/app/inbox/${row.item.classificationId}`}
                className="text-sm font-semibold text-primary underline underline-offset-4"
              >
                {V.openThread}
              </Link>
            ) : null}
            <p className="hidden text-xs text-muted-foreground xl:block">{V.pane.autoNext}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Ce que ferait chaque action groupée, dit avant de cliquer. */
function Recap({ s }: { s: SelectionSummary }) {
  const approve = s.approveMessageIds.length + s.approveReplyIds.length;
  const refuse = s.refuseMessageIds.length + s.refuseReplyIds.length;
  const stays = [
    s.notReady > 0 ? V.recap.notReady(s.notReady) : null,
    s.noMailbox > 0 ? V.recap.noMailbox(s.noMailbox) : null,
    s.forms > 0 ? V.recap.forms(s.forms) : null,
  ].filter((x): x is string => x !== null);
  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <p className="text-[15px] font-semibold">{V.recap.title(s.total)}</p>
      {s.campaigns.length > 1 ? (
        <div className="rounded-control border border-warning/30 bg-warning/5 px-3 py-2">
          <p className="font-semibold">{V.campaign.mixed(s.campaigns.length)}</p>
          <ul className="mt-1 list-disc pl-5">
            {s.campaigns.map((c) => (
              <li key={c.id}>
                {c.label} : {c.count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p className={LABEL}>{V.recap.approveTitle}</p>
        <p>{approve > 0 ? V.recap.approve(approve) : V.recap.approveNone}</p>
      </div>
      {stays.length > 0 ? (
        <div>
          <p className={LABEL}>{V.recap.stayTitle}</p>
          <ul className="list-disc pl-5">
            {stays.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p className={LABEL}>{V.recap.refuseTitle}</p>
        <p>{refuse > 0 ? V.recap.refuse(refuse) : V.recap.refuseNone}</p>
      </div>
      <div>
        <p className={LABEL}>{V.recap.laterTitle}</p>
        <p>{V.recap.later(s.total)}</p>
      </div>
    </div>
  );
}

/**
 * File « À valider » (maquette `docs/mockups/a-valider.html`, validée le 18/11) : une liste rangée par
 * campagne, une ligne par élément, un panneau pour lire et décider, une barre collée en bas pour
 * traiter en lot. « Plus tard » est un onglet : on y voit ce qui est mis de côté et quand cela revient.
 */
export function ApprovalQueue({ view, actions }: { view: QueueView; actions: QueueActions }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("tout");
  const [campaign, setCampaign] = useState("all");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<{ state: AuditActionState; undo?: string[] } | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [pending, start] = useTransition();

  const campaignIndex = (id: string) => view.campaigns.findIndex((c) => c.id === id);
  const inCampaign = (x: { planId: string }) => campaign === "all" || x.planId === campaign;
  const all = queueRows(view).filter(inCampaign);
  const count = (n: Nature) => all.filter((r) => r.nature === n).length;
  const later = view.later.filter(inCampaign);
  const rows =
    tab === "tout" ? all : tab === "plus-tard" ? [] : all.filter((r) => r.nature === tab);
  const groups = groupByCampaign(rows, view.campaigns);
  // L'ordre de lecture est celui de l'écran : campagne après campagne.
  const flat = groups.flatMap((g) => g.rows);
  const selection = selectionSummary(flat, picked, view.hasMailbox);
  const selecting = selection.total > 0;
  const opened = open ? flat.find((r) => r.id === open) : undefined;
  const current = opened ?? flat[0];
  const at = current ? flat.indexOf(current) : -1;
  const totalPending = view.messages.length + view.replies.length + view.forms.length;

  const pickMany = (ids: readonly string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  const done = (r: AuditActionState, undo?: string[]) => {
    setNotice({ state: r, undo });
    router.refresh();
  };
  const act = (fn: () => Result, o: { clear?: boolean; undo?: string[] } = {}) =>
    start(async () => {
      const r = await fn();
      if (r.status !== "error" && o.clear) {
        setPicked(new Set());
        setRefusing(false);
      }
      done(r, r.status === "error" ? undefined : o.undo);
    });
  const approveSelection = async (): Result => {
    const parts: AuditActionState[] = [];
    if (selection.approveMessageIds.length > 0)
      parts.push(await actions.approveMessages(selection.approveMessageIds));
    if (selection.approveReplyIds.length > 0)
      parts.push(await actions.approveReplies(selection.approveReplyIds));
    const ok = parts.filter((p) => p.status !== "error");
    if (ok.length === 0) return parts[0] ?? { status: "error", message: V.messages.nothing };
    return {
      status: "ok",
      message: [
        ...ok.map((p) => p.message),
        selection.forms > 0 ? V.bulkSkipped(selection.forms) : null,
      ]
        .filter(Boolean)
        .join(" "),
    };
  };

  // Pendant une rédaction, l'écran se met à jour seul : les nouveaux messages arrivent sans recharger.
  // S'arrête dès que la rédaction est finie (view.drafting repasse à faux).
  useEffect(() => {
    if (!view.drafting) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [view.drafting, router]);

  // Bloc de progression en haut de l'écran : visible dès qu'une rédaction tourne ou qu'une cible attend.
  const progress = draftingProgress(view);
  const missingBanner = progress.visible ? (
    <Card className="flex flex-col gap-3 p-4 text-sm" aria-labelledby="drafting-progress-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="drafting-progress-title" className="font-semibold text-primary">
          {progress.running ? V.progress.title : V.progress.idleTitle}
        </h2>
        {progress.running ? null : (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => act(() => actions.draftMissing())}
          >
            {pending ? V.busy : V.missingCta}
          </Button>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={V.progress.bar}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <ul className="grid gap-1 tabular-nums sm:grid-cols-3">
        <li>{V.progress.toWrite(progress.toWrite, progress.running)}</li>
        <li>{V.progress.ready(progress.ready)}</li>
        <li>{V.progress.approved(progress.approved)}</li>
      </ul>
      <p className="text-muted-foreground">
        {progress.running ? V.progress.runningHelp : V.progress.idleHelp}
      </p>
    </Card>
  ) : null;

  const noticeLine = notice?.state.message ? (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border px-3 py-2 text-sm",
        notice.state.status === "error"
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-success/30 bg-success/5",
      )}
    >
      <span className="min-w-0 flex-1">{notice.state.message}</span>
      {notice.undo ? (
        <button
          type="button"
          disabled={pending}
          className="font-semibold text-primary underline underline-offset-4"
          onClick={() => act(() => actions.wakeSnoozed(notice.undo))}
        >
          {V.laterTab.undo}
        </button>
      ) : null}
    </div>
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  disabled={pending}
                  onClick={() => act(() => actions.draftAnyway(d.itemId))}
                >
                  {V.anyway}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      </Card>
    ) : null;

  const laterList = (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <Card className="overflow-hidden text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <span className="font-medium">
            {later.length > 0 ? V.laterTab.title(later.length) : V.laterTab.none}
          </span>
          {later.length > 1 ? (
            <button
              type="button"
              disabled={pending}
              className="font-semibold text-primary underline underline-offset-4"
              onClick={() => act(() => actions.wakeSnoozed(later.map((x) => x.id)))}
            >
              {V.wake}
            </button>
          ) : null}
        </div>
        <ul>
          {later.map((x: SnoozedItem) => (
            <li
              key={x.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3.5 py-2.5"
            >
              <div className="flex min-w-0 flex-1 basis-64 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Avatar label={x.campaign} index={campaignIndex(x.planId)} />
                  <span className="min-w-0 truncate font-semibold">{x.title}</span>
                  <NatureBadge nature={x.nature} />
                </span>
                <span className="truncate">{x.line}</span>
                <span className="text-[13px] text-muted-foreground">
                  {x.campaign} · {V.laterTab.returns(x.returns)}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => act(() => actions.wakeSnoozed([x.id]))}
              >
                {V.laterTab.wakeOne}
              </Button>
            </li>
          ))}
        </ul>
        {later.length > 0 ? (
          <p className="px-3.5 py-2.5 text-[13px] text-muted-foreground">{V.laterTab.foot}</p>
        ) : null}
      </Card>
      <Card className="flex flex-col gap-2 p-4 text-sm">
        <p className="text-[15px] font-semibold">{V.laterTab.helpTitle}</p>
        <p>{V.laterTab.help1}</p>
        <p>{V.laterTab.help2}</p>
        <p className="text-muted-foreground">{V.laterTab.help3}</p>
      </Card>
    </div>
  );

  // Boîte à zéro : plus rien n'attend, on dit ce qui se passe maintenant sans la personne.
  if (totalPending === 0 && tab !== "plus-tard")
    return (
      <div className="flex flex-col gap-4">
        {missingBanner}
        {noticeLine}
        {view.handled ? (
          <Card className="mx-auto w-full max-w-2xl p-6 text-center md:p-8">
            <span className="inline-flex size-13 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check aria-hidden className="size-6" strokeWidth={2.25} />
            </span>
            <h2 className="mt-3 font-display text-xl font-bold">{V.zero.title}</h2>
            <p className="text-muted-foreground">{V.zero.lead}</p>
            <ul className="mt-5 border-t border-border text-left text-sm">
              <li className="flex gap-3 border-b border-border py-3">
                <Send aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{V.zero.sending}</span>
              </li>
              {view.later.length > 0 ? (
                <li className="flex gap-3 border-b border-border py-3">
                  <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {V.zero.later(view.later.length)}{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary underline underline-offset-4"
                      onClick={() => setTab("plus-tard")}
                    >
                      {V.zero.laterCta}
                    </button>
                  </span>
                </li>
              ) : null}
              <li className="flex gap-3 border-b border-border py-3">
                <MessageSquare
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <span>{V.zero.replies}</span>
              </li>
            </ul>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/app/inbox">{V.zero.conversations}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/app/campagnes">{V.zero.campaigns}</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-muted-foreground">
            <p>{V.none}</p>
            {view.later.length > 0 ? (
              <p className="mt-2">
                {V.zero.later(view.later.length)}{" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline underline-offset-4"
                  onClick={() => setTab("plus-tard")}
                >
                  {V.zero.laterCta}
                </button>
              </p>
            ) : null}
          </Card>
        )}
        {declinedCard}
      </div>
    );

  const tabs: [Tab, string, string, number][] = [
    ["tout", V.filters.all, V.filters.all, all.length],
    ["reponses", V.filters.replies, V.filters.replies, count("reponses")],
    ["messages", V.filters.messages, V.filters.messagesShort, count("messages")],
    ["formulaires", V.filters.forms, V.filters.formsShort, count("formulaires")],
  ];
  const tabClass = (on: boolean) =>
    cn(
      "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
      on
        ? "border-primary font-semibold text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    );
  const pill = (on: boolean) =>
    cn(
      "rounded-full px-1.5 text-xs font-semibold tabular-nums",
      on ? "bg-primary/10 text-primary" : "bg-muted",
    );
  const chip = (on: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1.5 text-[13px] font-medium",
      on ? "border-foreground bg-foreground text-background" : "border-border bg-card",
    );
  const switchCampaign = (id: string) => {
    setCampaign(id);
    setPicked(new Set());
    setOpen(null);
  };
  const filtered = view.campaigns.find((c) => c.id === campaign);

  return (
    <div className="flex flex-col gap-4">
      {missingBanner}
      {!view.hasMailbox && view.messages.length > 0 ? (
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

      <div
        role="group"
        aria-label={V.filters.label}
        className="flex overflow-x-auto border-b border-border"
      >
        {tabs
          .filter(([k, , , n]) => k === "tout" || n > 0)
          .map(([k, long, short, n]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              className={tabClass(tab === k)}
              onClick={() => {
                setTab(k);
                setOpen(null);
              }}
            >
              <span className="hidden sm:inline">{long}</span>
              <span className="sm:hidden">{short}</span>
              <span className={pill(tab === k)}>{n}</span>
            </button>
          ))}
        {view.later.length > 0 || tab === "plus-tard" ? (
          <button
            type="button"
            aria-pressed={tab === "plus-tard"}
            className={cn(tabClass(tab === "plus-tard"), "sm:ml-auto")}
            onClick={() => {
              setTab("plus-tard");
              setPicked(new Set());
            }}
          >
            <Clock aria-hidden className="size-4" />
            {V.laterTab.tab}
            <span className={pill(tab === "plus-tard")}>{later.length}</span>
          </button>
        ) : null}
      </div>

      {view.campaigns.length > 1 ? (
        <>
          <div
            role="group"
            aria-label={V.campaign.label}
            className={cn(
              "items-center gap-2 overflow-x-auto",
              view.campaigns.length > 5 ? "hidden" : "hidden md:flex",
            )}
          >
            <span className={LABEL}>{V.campaign.label}</span>
            <button
              type="button"
              aria-pressed={campaign === "all"}
              className={cn(chip(campaign === "all"), "pl-3")}
              onClick={() => switchCampaign("all")}
            >
              {V.campaign.all}
            </button>
            {view.campaigns.map((c, i) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={campaign === c.id}
                className={chip(campaign === c.id)}
                onClick={() => switchCampaign(c.id)}
              >
                <Avatar label={c.label} index={i} />
                {c.label}
              </button>
            ))}
          </div>
          <select
            aria-label={V.campaign.label}
            value={campaign}
            onChange={(e) => switchCampaign(e.target.value)}
            className={cn(
              "h-10 w-full rounded-control border border-border bg-card px-2 text-sm font-medium md:w-auto md:self-start",
              view.campaigns.length > 5 ? "" : "md:hidden",
            )}
          >
            <option value="all">{V.campaign.allLong}</option>
            {view.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {noticeLine}

      {tab === "plus-tard" ? (
        laterList
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <div className="flex min-w-0 flex-col gap-3">
            {filtered ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border bg-muted px-3 py-2 text-sm">
                <Avatar label={filtered.label} index={campaignIndex(filtered.id)} />
                <span className="min-w-0 flex-1 basis-48">
                  <span className="font-semibold">{filtered.label}</span>. {V.campaign.onlyNotice}
                </span>
                <button
                  type="button"
                  className="font-semibold text-primary underline underline-offset-4"
                  onClick={() => switchCampaign("all")}
                >
                  {V.campaign.showAll}
                </button>
              </div>
            ) : null}
            <Card className="overflow-hidden text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3.5 py-2.5">
                <label className="flex cursor-pointer items-center gap-3 font-medium">
                  <Check3
                    label={V.selectAll(flat.length)}
                    all={flat.length > 0 && selection.total === flat.length}
                    some={selecting}
                    onChange={(on) => setPicked(on ? new Set(flat.map((r) => r.id)) : new Set())}
                  />
                  {selecting ? V.selected(selection.total) : V.selectAll(flat.length)}
                </label>
                {tab === "tout" && count("reponses") > 0 ? (
                  <span className="ml-auto hidden text-[13px] text-muted-foreground sm:inline">
                    {V.repliesFirst}
                  </span>
                ) : null}
              </div>
              {groups.map((g) => {
                const ids = g.rows.map((r) => r.id);
                const chosen = ids.filter((id) => picked.has(id)).length;
                const openAt = current ? g.rows.indexOf(current) : -1;
                const showAll = expanded.has(g.id) || g.rows.length <= PREVIEW + 1;
                const shown = showAll ? g.rows : g.rows.slice(0, Math.max(PREVIEW, openAt + 1));
                return (
                  <section key={g.id} aria-label={g.label}>
                    {campaign === "all" && view.campaigns.length > 1 ? (
                      <div className="flex items-center gap-3 border-b border-border bg-muted px-3.5 py-2">
                        <Check3
                          label={V.campaign.selectGroup(g.label)}
                          all={chosen === ids.length}
                          some={chosen > 0}
                          onChange={(on) => pickMany(ids, on)}
                        />
                        <Avatar label={g.label} index={campaignIndex(g.id)} />
                        <h2 className="min-w-0 font-semibold">
                          <span className="block truncate">{g.label}</span>
                        </h2>
                        <span className="shrink-0 text-[13px] text-muted-foreground">
                          {V.campaign.count(g.rows.length)}
                        </span>
                        <button
                          type="button"
                          className="ml-auto hidden shrink-0 text-[13px] font-medium text-primary hover:underline lg:inline"
                          onClick={() => switchCampaign(g.id)}
                        >
                          {V.campaign.only}
                        </button>
                      </div>
                    ) : null}
                    <ul>
                      {shown.map((r) => (
                        <RowLine
                          key={r.id}
                          row={r}
                          current={!selecting && current?.id === r.id}
                          selected={picked.has(r.id)}
                          onSelect={(on) => pickMany([r.id], on)}
                          // Une sélection en cours : toucher une ligne la coche, on ne quitte pas le lot.
                          onOpen={() =>
                            selecting ? pickMany([r.id], !picked.has(r.id)) : setOpen(r.id)
                          }
                        />
                      ))}
                    </ul>
                    {shown.length < g.rows.length ? (
                      <button
                        type="button"
                        className="w-full border-b border-border py-2.5 pr-3.5 pl-11 text-left font-semibold text-primary hover:underline"
                        onClick={() => setExpanded(new Set([...expanded, g.id]))}
                      >
                        {V.showMore(g.rows.length - shown.length)}
                      </button>
                    ) : null}
                  </section>
                );
              })}
            </Card>
          </div>

          {selecting ? (
            <Card className="hidden xl:sticky xl:top-4 xl:block">
              <Recap s={selection} />
            </Card>
          ) : current ? (
            <Card
              role="region"
              aria-label={V.pane.label}
              className={cn(
                "xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto",
                opened
                  ? "fixed inset-0 z-30 overflow-y-auto rounded-none border-0 xl:static xl:z-auto xl:rounded-card xl:border"
                  : "hidden",
              )}
            >
              <Reader
                key={current.id}
                row={current}
                campaignIndex={campaignIndex(current.planId)}
                position={at + 1}
                total={flat.length}
                hasMailbox={view.hasMailbox}
                actions={actions}
                onPrev={at > 0 ? () => setOpen(flat[at - 1]!.id) : null}
                onNext={at < flat.length - 1 ? () => setOpen(flat[at + 1]!.id) : null}
                onBack={() => setOpen(null)}
                onDone={(r, o) => {
                  // Sur téléphone on reste en lecture : le suivant s'affiche à la place.
                  if (o.advance && opened) setOpen(nextRowId(flat, current.id));
                  done(r, o.undo);
                }}
              />
            </Card>
          ) : null}
        </div>
      )}

      {selecting ? (
        <div
          role="region"
          aria-label={V.selected(selection.total)}
          className="sticky bottom-18 z-20 flex flex-col gap-2 rounded-card bg-foreground p-3 text-background shadow-float md:bottom-4 md:flex-row md:items-center md:pl-4"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{V.selected(selection.total)}</span>
            <span className="text-[13px] opacity-80 md:truncate">
              {refusing
                ? V.bulkRefuseConfirm(
                    selection.refuseMessageIds.length + selection.refuseReplyIds.length,
                  )
                : selection.campaigns.length > 1
                  ? V.campaign.mixed(selection.campaigns.length)
                  : (selection.campaigns[0]?.label ?? "")}
            </span>
          </div>
          {refusing ? (
            <div className="grid grid-cols-2 gap-2 md:flex">
              <button
                type="button"
                className={BAR_GHOST}
                onClick={() => setRefusing(false)}
                disabled={pending}
              >
                {V.cancel}
              </button>
              <button
                type="button"
                className={BAR_MAIN}
                disabled={pending}
                onClick={() =>
                  act(
                    () => actions.refuseItems(selection.refuseMessageIds, selection.refuseReplyIds),
                    { clear: true },
                  )
                }
              >
                {pending ? V.busy : V.confirmRefuse}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-row-reverse">
              <button
                type="button"
                className={cn(BAR_MAIN, "col-span-2")}
                disabled={
                  pending ||
                  selection.approveMessageIds.length + selection.approveReplyIds.length === 0
                }
                onClick={() => act(approveSelection, { clear: true })}
              >
                <Send aria-hidden className="size-4" />
                {pending
                  ? V.sending
                  : V.bulkApprove(
                      selection.approveMessageIds.length + selection.approveReplyIds.length,
                    )}
              </button>
              <button
                type="button"
                className={BAR_GHOST}
                disabled={
                  pending ||
                  selection.refuseMessageIds.length + selection.refuseReplyIds.length === 0
                }
                onClick={() => setRefusing(true)}
              >
                {V.bulkRefuse(selection.refuseMessageIds.length + selection.refuseReplyIds.length)}
              </button>
              <button
                type="button"
                className={BAR_GHOST}
                disabled={pending}
                onClick={() =>
                  act(() => actions.snooze(selection.laterIds), {
                    clear: true,
                    undo: selection.laterIds,
                  })
                }
              >
                {V.bulkLater(selection.total)}
              </button>
              <button
                type="button"
                className={cn(BAR_GHOST, "col-span-2 border-transparent")}
                onClick={() => setPicked(new Set())}
              >
                {V.clearSelection}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {declinedCard}
    </div>
  );
}

const BAR_BUTTON =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-control px-3 text-sm font-medium whitespace-nowrap transition-[background-color,transform,filter] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-accent";
const BAR_GHOST = `${BAR_BUTTON} border border-background/30 text-background hover:bg-background/20 active:bg-background/25`;
const BAR_MAIN = `${BAR_BUTTON} bg-sidebar-accent font-semibold text-sidebar hover:brightness-110 active:brightness-95`;
