"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import type { PendingForm, PendingMessage, QueueView } from "@/features/approvals/service";
import type { TargetsView } from "@/features/targets/service";
import type { TargetCard } from "@/features/targets/types";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { CIBLE_TABS, messageStateKey, toDecide, type CibleTab } from "./model";

const C = t.ciblesScreen;
type Result = Promise<AuditActionState>;

export interface CampaignOption {
  siteId: string;
  domain: string;
}

export interface CiblesActions {
  validate: (ids: string[]) => Result;
  approveMessages: (ids: string[]) => Result;
  editMessage: (id: string, input: { subject: string; body: string }) => Result;
  refuseItems: (messageIds: string[], replyIds: string[]) => Result;
  completeForm: (id: string, taskId: string) => Result;
  draftMissing: () => Result;
}

export function CiblesScreen({
  campaigns,
  selectedSiteId,
  initialTab,
  view,
  queue,
  actions,
}: {
  campaigns: CampaignOption[];
  selectedSiteId: string;
  initialTab: CibleTab;
  view: TargetsView;
  queue: QueueView;
  actions: CiblesActions;
}) {
  const [tab, setTab] = useState<CibleTab>(initialTab);
  const decide = toDecide(view.cards);
  const counts: Record<CibleTab, number> = {
    decider: decide.length,
    retenues: queue.messages.length + queue.forms.length,
    ecartees: queue.declined.length,
  };
  return (
    <div className="flex flex-col gap-5">
      <CampaignPicker campaigns={campaigns} selectedSiteId={selectedSiteId} />
      <div
        role="tablist"
        aria-label={C.title}
        className="flex flex-wrap gap-2 border-b border-border"
      >
        {CIBLE_TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 px-3 pb-2 text-sm font-medium",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {C.tabs[key]} <span className="tabular-nums">({counts[key]})</span>
          </button>
        ))}
      </div>
      {tab === "decider" && <DecideTab cards={decide} retain={actions.validate} />}
      {tab === "retenues" && <RetainedTab queue={queue} actions={actions} />}
      {tab === "ecartees" && <DeclinedTab queue={queue} />}
    </div>
  );
}

function CampaignPicker({
  campaigns,
  selectedSiteId,
}: {
  campaigns: CampaignOption[];
  selectedSiteId: string;
}) {
  return (
    <nav aria-label={C.campaign} className="flex flex-wrap gap-2">
      {campaigns.map((c) => (
        <Link
          key={c.siteId}
          href={`/app/cibles?campagne=${c.siteId}`}
          aria-current={c.siteId === selectedSiteId ? "page" : undefined}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm",
            c.siteId === selectedSiteId
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card hover:bg-muted",
          )}
        >
          {c.domain}
        </Link>
      ))}
    </nav>
  );
}

/** Feedback commun : un message court sous la barre d'actions. */
function useActionState() {
  const router = useRouter();
  const [state, setState] = useState<AuditActionState>({ status: "idle" });
  const [pending, start] = useTransition();
  function run(fn: () => Result) {
    start(async () => {
      const r = await fn();
      setState(r);
      router.refresh();
    });
  }
  return { state, pending, run };
}

function StateLine({ state }: { state: AuditActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role="status"
      className={cn("text-sm", state.status === "error" ? "text-danger" : "text-muted-foreground")}
    >
      {state.message}
    </p>
  );
}

function DecideTab({ cards, retain }: { cards: TargetCard[]; retain: (ids: string[]) => Result }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const { state, pending, run } = useActionState();
  if (cards.length === 0) return <EmptyLine text={C.decide.empty} />;
  const allOn = cards.every((c) => selected.has(c.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const chosen = cards.filter((c) => selected.has(c.id)).map((c) => c.id);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          type="button"
          onClick={() => setSelected(allOn ? new Set() : new Set(cards.map((c) => c.id)))}
        >
          {allOn ? C.decide.clearAll : C.decide.selectAll}
        </Button>
        <Button
          type="button"
          disabled={pending || chosen.length === 0}
          onClick={() => run(() => retain(chosen))}
        >
          {C.decide.retain(chosen.length)}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{C.decide.help}</p>
      <StateLine state={state} />
      <ul className="flex flex-col gap-2">
        {cards.map((c) => (
          <li key={c.id}>
            <Card className="flex items-start gap-3 p-4">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                aria-label={c.domain}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.domain}</p>
                {c.pageUrl && (
                  <a
                    href={c.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-primary underline underline-offset-4"
                  >
                    {c.pageTitle || c.pageUrl}
                    <span className="sr-only"> ({C.decide.openPage})</span>
                  </a>
                )}
                {c.why && <p className="mt-1 text-sm text-muted-foreground">{c.why}</p>}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RetainedTab({ queue, actions }: { queue: QueueView; actions: CiblesActions }) {
  const { state, pending, run } = useActionState();
  const empty = queue.messages.length === 0 && queue.forms.length === 0 && queue.missing === 0;
  return (
    <div className="flex flex-col gap-3">
      {queue.missing > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">{C.retained.drafting(queue.missing)}</p>
          <Button
            variant="outline"
            type="button"
            disabled={pending || queue.drafting}
            onClick={() => run(() => actions.draftMissing())}
          >
            {C.retained.draftMissing}
          </Button>
        </Card>
      )}
      <StateLine state={state} />
      {empty && <EmptyLine text={C.retained.empty} />}
      <ul className="flex flex-col gap-2">
        {queue.messages.map((m) => (
          <li key={m.id}>
            <MessageRow message={m} actions={actions} />
          </li>
        ))}
        {queue.forms.map((f) => (
          <li key={f.id}>
            <FormRow form={f} actions={actions} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageRow({ message: m, actions }: { message: PendingMessage; actions: CiblesActions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ subject: m.subject ?? "", body: m.body });
  const { state, pending, run } = useActionState();
  const key = messageStateKey(m.ready);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{m.domain}</p>
        <Badge tone={key === "pret" ? "success" : "warning"}>
          {C.retained[key === "pret" ? "ready" : "toReview"]}
        </Badge>
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {C.retained.subject}
            <input
              className="rounded-md border border-border bg-background px-3 py-2"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {C.retained.body}
            <textarea
              className="min-h-40 rounded-md border border-border bg-background px-3 py-2"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await actions.editMessage(m.id, draft);
                  if (r.status !== "error") setEditing(false);
                  return r;
                })
              }
            >
              {C.retained.save}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
              {C.retained.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{m.body}</p>
      )}
      <StateLine state={state} />
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending || !m.ready}
            title={m.ready ? undefined : C.retained.approveNeedsReview}
            onClick={() => run(() => actions.approveMessages([m.id]))}
          >
            {C.retained.approve}
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            {C.retained.edit}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={pending}
            onClick={() => run(() => actions.refuseItems([m.id], []))}
          >
            {C.retained.refuse}
          </Button>
        </div>
      )}
    </Card>
  );
}

function FormRow({ form: f, actions }: { form: PendingForm; actions: CiblesActions }) {
  const [copied, setCopied] = useState(false);
  const { state, pending, run } = useActionState();
  async function copy() {
    try {
      await navigator.clipboard.writeText(f.body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{f.domain}</p>
        <Badge tone="neutral">{C.retained.formTitle}</Badge>
      </div>
      <p className="whitespace-pre-line text-sm text-muted-foreground">{f.body}</p>
      <StateLine state={state} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" onClick={copy}>
          {copied ? C.retained.copied : C.retained.copy}
        </Button>
        <Button variant="outline" asChild>
          <a href={f.formUrl} target="_blank" rel="noreferrer">
            {C.retained.formOpen}
          </a>
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => run(() => actions.completeForm(f.id, f.taskId))}
        >
          {C.retained.done}
        </Button>
      </div>
    </Card>
  );
}

function DeclinedTab({ queue }: { queue: QueueView }) {
  if (queue.declined.length === 0) return <EmptyLine text={C.declined.empty} />;
  return (
    <ul className="flex flex-col gap-2">
      {queue.declined.map((d) => (
        <li key={d.itemId}>
          <Card className="flex flex-col gap-1 p-4">
            <p className="font-medium">{d.domain}</p>
            <p className="text-sm text-muted-foreground">{d.reason}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
