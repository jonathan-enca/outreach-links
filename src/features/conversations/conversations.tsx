"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { ConversationsView, ConversationView } from "./service";
import { THREAD_STATUSES, type ThreadStatus } from "./status";

const C = t.conversations;
type Result = Promise<AuditActionState>;

export interface ConversationActions {
  markRead: (id: string) => Result;
  setArchived: (id: string, on: boolean) => Result;
  setTag: (id: string, tag: string, on: boolean) => Result;
  approveReply: (draftId: string) => Result;
  editReply: (draftId: string, input: { subject: string; body: string }) => Result;
}

const TONE: Record<ThreadStatus, "warning" | "success" | "info" | "neutral" | "danger"> = {
  a_traiter: "warning",
  a_repondu: "success",
  relance: "info",
  envoye: "neutral",
  lien_obtenu: "success",
  refuse: "danger",
  erreur: "danger",
  en_attente: "neutral",
};

const SELECT = "h-9 rounded-control border border-border bg-card px-2 text-sm";
const day = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
      ", " +
      new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

/** Le fil ouvert : contexte, échanges dans l'ordre, étiquettes, réponse proposée. */
function Pane({
  thread,
  actions,
  onBack,
  onArchived,
}: {
  thread: ConversationView;
  actions: ConversationActions;
  onBack: () => void;
  /** Après un archivage ou un désarchivage : l'écran passe au fil suivant (boîte à zéro). */
  onArchived: (on: boolean) => void;
}) {
  const router = useRouter();
  const [tag, setTag] = useState("");
  const [body, setBody] = useState(thread.draft?.body ?? "");
  const [state, setState] = useState<AuditActionState>({ status: "idle" });
  const [pending, start] = useTransition();
  const run = (fn: () => Result) =>
    start(async () => {
      const r = await fn();
      setState(r);
      if (r.status !== "error") router.refresh();
    });
  return (
    <div className="flex min-w-0 flex-col gap-3 p-4 md:p-5">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-primary underline underline-offset-4 lg:hidden"
      >
        {C.back}
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">{thread.domain}</h2>
          <p className="break-all text-sm text-muted-foreground">
            {thread.email}
            {thread.campaign ? ` · ${thread.campaign}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={TONE[thread.status]}>{C.status[thread.status]}</Badge>
          {thread.status === "en_attente" ? null : (
            <Button
              type="button"
              size="sm"
              variant={thread.archived ? "outline" : "default"}
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const r = await actions.setArchived(thread.id, !thread.archived);
                  if (r.status !== "error") onArchived(!thread.archived);
                  return r;
                })
              }
            >
              {thread.archived ? C.unarchive : C.archive}
            </Button>
          )}
          {thread.tags.map((x) => (
            <button
              key={x}
              type="button"
              title={C.removeTag}
              disabled={pending}
              onClick={() => run(() => actions.setTag(thread.id, x, false))}
              className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-xs font-semibold text-info"
            >
              {x} ×
            </button>
          ))}
        </div>
      </div>
      {thread.status === "en_attente" ? null : (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tag.trim()) return;
            run(() => actions.setTag(thread.id, tag, true));
            setTag("");
          }}
        >
          <input
            aria-label={C.addTag}
            placeholder={C.addTag}
            value={tag}
            maxLength={30}
            onChange={(e) => setTag(e.target.value)}
            className={`${SELECT} min-w-0 flex-1 md:max-w-xs`}
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {C.add}
          </Button>
        </form>
      )}
      {thread.hook ? (
        <p className="rounded-control bg-muted px-3 py-2 text-sm">
          <strong>{C.why}</strong> {thread.hook}
        </p>
      ) : null}
      <ol className="flex flex-col gap-3">
        {thread.messages.map((m, i) =>
          m.from === "systeme" ? (
            <li key={i} className="text-center text-xs text-muted-foreground">
              {m.text}
            </li>
          ) : (
            <li
              key={i}
              className={`max-w-3xl rounded-card border px-3.5 py-2.5 text-sm ${
                m.from === "nous"
                  ? "self-end border-transparent bg-primary/10"
                  : "self-start border-border bg-card"
              }`}
            >
              <p className="mb-1 flex flex-wrap justify-between gap-x-4 text-xs text-muted-foreground">
                <span>{m.from === "nous" ? C.you : thread.domain}</span>
                <span>{day(m.at)}</span>
              </p>
              {m.subject ? <p className="font-semibold">{m.subject}</p> : null}
              <p className="whitespace-pre-line break-words">{m.text}</p>
            </li>
          ),
        )}
      </ol>
      {thread.draft ? (
        <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{C.proposed}</p>
          <textarea
            aria-label={C.proposed}
            value={body}
            rows={6}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-control border border-border bg-card px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  if (body.trim() !== thread.draft!.body.trim()) {
                    const e = await actions.editReply(thread.draft!.id, {
                      subject: thread.draft!.subject ?? "",
                      body,
                    });
                    if (e.status === "error") return e;
                  }
                  return actions.approveReply(thread.draft!.id);
                })
              }
            >
              {pending ? C.busy : C.approve}
            </Button>
            {thread.classificationId ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/app/inbox/${thread.classificationId}`}>{C.more}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : thread.classificationId ? (
        <div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/app/inbox/${thread.classificationId}`}>{C.reply}</Link>
          </Button>
        </div>
      ) : null}
      {state.message ? (
        <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * « Conversations » (mini-CRM, maquette validée le 18/11) : tous les messages échangés avec tous les
 * prospects, toutes campagnes confondues. Filtres combinables : campagne, lus / non lus, statut,
 * étiquette, recherche. Liste à gauche, fil à droite ; sur téléphone, l'un puis l'autre.
 */
export function Conversations({
  view,
  actions,
}: {
  view: ConversationsView;
  actions: ConversationActions;
}) {
  const router = useRouter();
  const [campaign, setCampaign] = useState("all");
  const [read, setRead] = useState("all");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("all");
  const [box, setBox] = useState<"inbox" | "archived" | "all">("inbox");
  /** Archivages faits pendant cette visite : l'écran suit aussitôt, sans attendre le rechargement. */
  const [override, setOverride] = useState<Map<string, boolean>>(() => new Map());
  const isArchived = (x: ConversationView) => override.get(x.id) ?? x.archived;
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(
    (view.threads.find((x) => !x.archived) ?? view.threads[0])?.id ?? null,
  );
  /** Téléphone : le fil n'est affiché qu'après un choix dans la liste. */
  const [opened, setOpened] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return view.threads.filter(
      (x) =>
        (box === "all" || (box === "archived" ? isArchived(x) : !isArchived(x))) &&
        (campaign === "all" || x.campaignId === campaign) &&
        (read === "all" || (x.unread && !seen.has(x.id))) &&
        (status === "all" || x.status === status) &&
        (tag === "all" || x.tags.includes(tag)) &&
        (!needle || `${x.domain} ${x.email}`.toLowerCase().includes(needle)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isArchived ne dépend que de `override`
  }, [view.threads, campaign, read, status, tag, q, seen, box, override]);
  const archivedCount = view.threads.filter(isArchived).length;
  const archive = (id: string, on: boolean) => {
    const at = rows.findIndex((x) => x.id === id);
    const next = rows[at + 1] ?? rows[at - 1] ?? null;
    setOverride((prev) => new Map(prev).set(id, on));
    // Le fil quitte la liste affichée : on passe au suivant (boîte à zéro).
    if (box !== "all") setSelected(next && next.id !== id ? next.id : null);
  };
  const current = view.threads.find((x) => x.id === selected) ?? null;
  const open = (x: ConversationView) => {
    setSelected(x.id);
    setOpened(true);
    if (x.unread && !seen.has(x.id)) {
      setSeen((prev) => new Set(prev).add(x.id));
      void actions.markRead(x.id).then(() => router.refresh());
    }
  };
  if (view.threads.length === 0)
    return <Card className="p-6 text-muted-foreground">{C.empty}</Card>;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        {view.campaigns.length > 1 ? (
          <select
            aria-label={C.filters.campaign}
            className={SELECT}
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
          >
            <option value="all">{C.filters.allCampaigns}</option>
            {view.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label={C.filters.box}
          className={SELECT}
          value={box}
          onChange={(e) => setBox(e.target.value as typeof box)}
        >
          <option value="inbox">{C.filters.inbox(view.threads.length - archivedCount)}</option>
          <option value="archived">{C.filters.archivedBox(archivedCount)}</option>
          <option value="all">{C.filters.allBox}</option>
        </select>
        <select
          aria-label={C.filters.read}
          className={SELECT}
          value={read}
          onChange={(e) => setRead(e.target.value)}
        >
          <option value="all">{C.filters.allRead}</option>
          <option value="unread">{C.filters.unread}</option>
        </select>
        <select
          aria-label={C.filters.status}
          className={SELECT}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">{C.filters.allStatus}</option>
          {THREAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {C.status[s]}
            </option>
          ))}
        </select>
        {view.tags.length > 0 ? (
          <select
            aria-label={C.filters.tag}
            className={SELECT}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="all">{C.filters.allTags}</option>
            {view.tags.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="search"
          aria-label={C.filters.search}
          placeholder={C.filters.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${SELECT} min-w-[10rem] flex-1`}
        />
      </div>
      <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <ul
          aria-label={C.list}
          className={`min-w-0 border-border lg:block lg:max-h-[70vh] lg:overflow-y-auto lg:border-r ${
            opened ? "hidden" : ""
          }`}
        >
          {rows.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">
              {box === "inbox" && view.threads.length > archivedCount ? C.noMatch : null}
              {box === "inbox" && view.threads.length === archivedCount ? C.inboxZero : null}
              {box !== "inbox" ? C.noMatch : null}
            </li>
          ) : null}
          {rows.map((x) => (
            <li key={x.id} className="border-b border-border">
              <button
                type="button"
                aria-current={x.id === selected ? "true" : undefined}
                onClick={() => open(x)}
                className={`flex w-full flex-col gap-1 px-3.5 py-3 text-left hover:bg-muted ${
                  x.id === selected ? "lg:bg-primary/10" : ""
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold">
                    {x.unread && !seen.has(x.id) ? (
                      <span
                        title={C.filters.unread}
                        className="size-2 shrink-0 rounded-full bg-info"
                      />
                    ) : null}
                    <span className="truncate">{x.domain}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(x.lastAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </span>
                <span className="truncate text-sm text-muted-foreground">{x.preview}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone={TONE[x.status]}>{C.status[x.status]}</Badge>
                  {x.category ? <Badge tone="neutral">{x.category}</Badge> : null}
                  {x.tags.map((g) => (
                    <Badge key={g} tone="info">
                      {g}
                    </Badge>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className={`min-w-0 lg:block ${opened ? "" : "hidden"}`}>
          {current ? (
            <Pane
              key={current.id}
              thread={{ ...current, archived: isArchived(current) }}
              actions={actions}
              onBack={() => setOpened(false)}
              onArchived={(on) => archive(current.id, on)}
            />
          ) : null}
        </div>
      </div>
    </Card>
  );
}
