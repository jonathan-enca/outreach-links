"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import { countByTactic, eligibleIds, filterCards, isEligible, primaryRequest } from "./cards";
import { publisherTabs } from "./publishers";
import {
  FOUNDER_ROLES,
  type FindingView,
  type TacticFilter,
  type TargetCard,
  type TargetsRunView,
} from "./types";
import type { TargetsView } from "./service";

const M = t.targets;

type Act = () => Promise<AuditActionState>;
type FormAct = (prev: AuditActionState, fd: FormData) => Promise<AuditActionState>;

function Message({ state }: { state: AuditActionState }) {
  return state.message ? (
    <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
      {state.message}
    </p>
  ) : null;
}

/** Réponse à « comment vous présentez-vous » : jamais « fondateur » sans accord. */
export function FounderQuestion({
  site,
  current,
  save,
}: {
  site: string;
  current: TargetsView["founderRole"];
  save: FormAct;
}) {
  const [state, action, pending] = useActionState(save, { status: "idle" } as AuditActionState);
  const [editing, setEditing] = useState(current === null);
  if (!editing && current)
    return (
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <p className="text-sm">
          {M.founder.current.replace("{role}", M.founder.shortRoles[current])}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          {M.founder.change}
        </Button>
      </Card>
    );
  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">{M.founder.title}</h2>
        <p className="text-muted-foreground">{M.founder.body}</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{M.founder.title}</legend>
          {FOUNDER_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value={r}
                defaultChecked={current === r}
                required
                className="size-4 accent-primary"
              />
              <span>{M.founder.roles[r].replace("{site}", site)}</span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? M.founder.saving : M.founder.save}
        </Button>
        <Message state={state} />
      </form>
    </Card>
  );
}

interface Preview {
  expectedUsd: number;
  worstUsd: number;
  budgetUsd: number;
}

/**
 * Une étape payante (qualifier, analyser les pages) : le coût attendu et le pire cas sont affichés AVANT
 * le bouton, qui porte le montant. Rien ne part sans ce clic.
 */
function CostStep({
  title,
  body,
  detail,
  run,
  preview,
  remainingUsd,
  labels,
  start,
  disabledReason,
  doneLine,
  redoNote,
}: {
  title: string;
  body: string;
  detail: string | null;
  run: TargetsRunView;
  preview: Preview | null;
  remainingUsd: number | null;
  labels: { button: string; confirm: string; running: string; failed: string; redo: string };
  start: Act;
  disabledReason: string | null;
  doneLine: string | null;
  redoNote?: string;
}) {
  const [state, setState] = useState<AuditActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const running = run.status === "en_cours" || run.status === "confirme";
  const done = run.status === "termine";
  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {done ? <Badge tone="success">{doneLine}</Badge> : null}
      </div>
      <p className="text-muted-foreground">{body}</p>
      {disabledReason ? <p className="text-sm text-muted-foreground">{disabledReason}</p> : null}
      {running ? <p role="status">{labels.running}</p> : null}
      {run.status === "echoue" ? (
        <p className="text-danger">
          {labels.failed}
          {run.error ? ` (${run.error})` : ""}
        </p>
      ) : null}
      {preview && !running && !disabledReason ? (
        <div className="flex flex-col gap-3 rounded-control border border-border p-3">
          {detail ? <p className="text-sm">{detail}</p> : null}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:max-w-md">
            <dt className="text-muted-foreground">{M.steps.cost.expected}</dt>
            <dd className="font-semibold">{formatUsd(preview.expectedUsd)}</dd>
            <dt className="text-muted-foreground">{M.steps.cost.worst}</dt>
            <dd>{formatUsd(preview.worstUsd)}</dd>
            <dt className="text-muted-foreground">{M.steps.cost.budget}</dt>
            <dd>{formatUsd(preview.budgetUsd)}</dd>
            {remainingUsd !== null ? (
              <>
                <dt className="text-muted-foreground">{M.steps.cost.remaining}</dt>
                <dd>{formatUsd(remainingUsd)}</dd>
              </>
            ) : null}
          </dl>
          <p className="text-xs text-muted-foreground">{M.steps.cost.note}</p>
          {done && redoNote ? <p className="text-xs text-muted-foreground">{redoNote}</p> : null}
          <Button
            type="button"
            disabled={pending}
            className="self-start"
            aria-label={`${done ? labels.redo : labels.confirm} : ${formatUsd(preview.expectedUsd)}`}
            onClick={() =>
              startTransition(async () => {
                setState(await start());
              })
            }
          >
            {pending
              ? M.steps.starting
              : `${done ? labels.redo : labels.button} · ${formatUsd(preview.expectedUsd)}`}
          </Button>
          <Message state={state} />
        </div>
      ) : null}
    </Card>
  );
}

function FindingBlock({ f }: { f: FindingView }) {
  const c = M.card;
  return (
    <li className="flex flex-col gap-1 rounded-control border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={
            f.kind === "lien_mort" ? "danger" : f.kind === "mention_sans_lien" ? "info" : "warning"
          }
        >
          {M.kinds[f.kind]}
        </Badge>
        {f.httpStatus ? (
          <span className="text-muted-foreground">
            {c.status.replace("{code}", String(f.httpStatus))}
          </span>
        ) : null}
      </div>
      <blockquote className="border-l-2 border-primary pl-3 italic">« {f.quote} »</blockquote>
      <p className="text-muted-foreground">
        {c.page} :{" "}
        <a
          href={f.pageUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >
          {f.pageUrl}
        </a>
      </p>
      {f.linkUrl ? (
        <p className="break-all text-muted-foreground">
          {c.linkCited} : {f.linkUrl}
        </p>
      ) : null}
      {f.proposedSentence ? (
        <p>
          <span className="text-muted-foreground">{c.sentenceAfter} :</span> {f.proposedSentence}
        </p>
      ) : null}
      <p className="break-all">
        <span className="text-muted-foreground">{c.proposed} :</span> {f.resourceTitle} (
        {f.resourceUrl})
      </p>
      {f.anchor ? (
        <p>
          <span className="text-muted-foreground">{c.anchor} :</span> {f.anchor}
        </p>
      ) : null}
    </li>
  );
}

function contactLine(card: TargetCard): string {
  const c = M.card;
  const k = card.contact;
  if (k.kind === "email")
    return (k.verified ? c.email : c.emailUnverified).replace("{email}", k.email ?? "");
  if (k.kind === "formulaire") return c.form;
  return c.none;
}

export function TargetCardView({
  card,
  selected,
  onToggle,
}: {
  card: TargetCard;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const c = M.card;
  const req = primaryRequest(card);
  const eligible = isEligible(card);
  return (
    <li>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {eligible ? (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(card.id)}
              aria-label={`${c.select} : ${card.domain}`}
              className="size-4 accent-primary"
            />
          ) : null}
          {card.rank ? (
            <span className="text-sm text-muted-foreground">
              {c.rank.replace("{n}", String(card.rank))}
            </span>
          ) : null}
          <h3 className="font-semibold">{card.domain}</h3>
          {card.siteType ? <Badge tone="neutral">{M.siteTypes[card.siteType]}</Badge> : null}
          {[...new Set(card.tactics)].map((x) => (
            <Badge key={x} tone="accent">
              {M.tacticLabels[x]}
            </Badge>
          ))}
          {card.platformHosted ? <Badge tone="neutral">{c.hosted}</Badge> : null}
          {card.alreadyValidated ? <Badge tone="success">{c.alreadyValidated}</Badge> : null}
        </div>
        {card.why ? (
          <p className="text-sm">
            <span className="text-muted-foreground">{c.why} :</span> {card.why}
          </p>
        ) : null}
        <p className="text-sm">
          <span className="text-muted-foreground">{c.contact} :</span> {contactLine(card)}
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{c.request}</p>
          <ol className="list-decimal pl-5 text-sm">
            {req.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </div>
        {card.findings.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{c.findings}</p>
            <ul className="flex flex-col gap-2">
              {card.findings.map((f) => (
                <FindingBlock key={f.id} f={f} />
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </li>
  );
}

/** Chantier G : ce que l'analyse a examiné, en une phrase, et le détail des sites écartés sans lecture. */
export function FunnelSummary({ funnel }: { funnel: NonNullable<TargetsView["funnel"]> }) {
  const F = M.funnel;
  return (
    <Card className="flex flex-col gap-2 p-4" data-testid="funnel-summary">
      <p className="font-medium">{F.summary(funnel.candidates, funnel.shortlist)}</p>
      <p className="text-sm text-muted-foreground">
        {F.detail(funnel.preReadTotal, funnel.pagesRead, funnel.judged)}
      </p>
      {funnel.preRead.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary underline underline-offset-4">
            {F.skippedTitle}
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
            {funnel.preRead.map((r) => (
              <li key={r.reason}>
                {r.count} : {F.reasons[r.reason] ?? F.reasons.autre}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}

/** Chantier G : le stock de sites pas encore lus, et le bouton qui en lit un lot de plus. */
export function MoreSites({
  funnel,
  more,
  start,
}: {
  funnel: NonNullable<TargetsView["funnel"]>;
  more: TargetsView["more"];
  start: Act;
}) {
  const R = M.more;
  const router = useRouter();
  const [state, setState] = useState<AuditActionState>({ status: "idle" });
  const [pending, begin] = useTransition();
  const auto = more.auto;
  const running =
    more.status === "demande" || more.status === "en_cours" || auto.status === "en_cours";
  // Pendant la lecture, l'écran se met à jour seul : les nouvelles cibles arrivent sans recharger.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [running, router]);
  if (funnel.stock === 0 && more.status === "aucun" && auto.status === "aucun") return null;
  return (
    <Card className="flex flex-col gap-2 p-4" data-testid="more-sites">
      {auto.status === "aucun" && more.status === "termine" && more.added !== null ? (
        <p className="font-medium">{R.done(more.added)}</p>
      ) : null}
      {auto.status === "termine" || auto.status === "echoue" ? (
        <p className="font-medium" data-testid="auto-done">
          {auto.added > 0 ? `${R.auto.doneLine(auto.added)} ` : ""}
          {R.auto.stop[auto.stop ?? "erreur"]}
        </p>
      ) : null}
      {more.status === "echoue" && auto.status === "aucun" ? (
        <p className="text-destructive">{R.failedLine}</p>
      ) : null}
      {running ? (
        <p role="status" className="font-medium" data-testid="auto-running">
          {auto.status === "en_cours" ? R.auto.running(auto.added, funnel.stock) : R.running}
        </p>
      ) : funnel.stock > 0 ? (
        <>
          <p>{R.stock(funnel.stock)}</p>
          <p className="text-sm text-muted-foreground">{R.hint}</p>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                begin(async () => {
                  setState(await start());
                  router.refresh();
                })
              }
            >
              {pending ? R.busy : R.button}
            </Button>
          </div>
        </>
      ) : null}
      <Message state={state} />
    </Card>
  );
}

export function TargetsScreen({
  view,
  auditId,
  showSteps = false,
  actions,
}: {
  view: TargetsView;
  auditId: string;
  /** Panneaux payants par étape (ancien parcours) : cachés, remplacés par l'analyse unique (MU.1). */
  showSteps?: boolean;
  actions: {
    startCollection: Act;
    startQualification: Act;
    startFindings: Act;
    saveFounder: FormAct;
    validate: (ids: string[]) => Promise<AuditActionState>;
    readMore: Act;
  };
}) {
  const [filter, setFilter] = useState<TacticFilter>("toutes");
  /** Onglet de type d'éditeur : `undefined` = toutes, `null` = autres sites. */
  const [publisher, setPublisher] = useState<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligibleIds(view.cards)));
  const [vState, setVState] = useState<AuditActionState>({ status: "idle" });
  const [vPending, startValidate] = useTransition();
  const counts = useMemo(() => countByTactic(view.cards), [view.cards]);
  const types = view.publisherTypes;
  const tabs = useMemo(
    () =>
      publisherTabs(
        view.cards.map((c) => c.publisher ?? null),
        types,
      ),
    [view.cards, types],
  );
  const shown = useMemo(() => {
    const byTactic = filterCards(view.cards, filter);
    if (publisher === undefined) return byTactic;
    const known = new Set(types.map((x) => x.label));
    return byTactic.filter((c) =>
      publisher === null ? !c.publisher || !known.has(c.publisher) : c.publisher === publisher,
    );
  }, [view.cards, filter, publisher, types]);
  const q = view.qualification;
  const f = view.findings;
  const chosen = [...selected].filter((id) => view.cards.some((c) => c.id === id && isEligible(c)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const c = view.collection;
  const qDone = q.status === "termine";
  const m = M.steps;

  return (
    <div className="flex flex-col gap-6">
      <FounderQuestion
        site={view.siteDomain}
        current={view.founderRole}
        save={actions.saveFounder}
      />

      {showSteps ? (
        <>
          <CostStep
            title={m.collect.title}
            body={m.collect.body}
            detail={
              c.preview ? m.collect.detail.replace("{n}", String(c.preview.estimate.calls)) : null
            }
            run={c}
            preview={
              c.preview
                ? {
                    expectedUsd: c.preview.estimate.expectedUsd,
                    worstUsd: c.preview.estimate.worstUsd,
                    budgetUsd: c.preview.estimate.targetUsd,
                  }
                : null
            }
            remainingUsd={c.preview?.remainingUsd ?? null}
            labels={{
              button: m.collect.button,
              confirm: m.collect.confirm,
              running: m.collect.running,
              failed: m.collect.failed,
              redo: m.collect.redo,
            }}
            start={actions.startCollection}
            disabledReason={null}
            doneLine={
              view.collectionDone ? m.collect.done.replace("{cost}", formatUsd(c.costUsd)) : null
            }
          />

          <CostStep
            title={m.qualify.title}
            body={m.qualify.body}
            detail={
              q.preview
                ? m.qualify.candidates.replace("{n}", String(q.preview.estimate.afterFree))
                : null
            }
            run={q}
            preview={q.preview?.estimate ?? null}
            remainingUsd={q.preview?.remainingUsd ?? null}
            labels={{
              button: m.qualify.button,
              confirm: m.qualify.confirm,
              running: m.qualify.running,
              failed: m.qualify.failed,
              redo: m.qualify.redo,
            }}
            start={actions.startQualification}
            disabledReason={view.collectionDone ? null : m.collectMissing}
            doneLine={
              qDone
                ? m.qualify.done
                    .replace("{n}", String(view.cards.length))
                    .replace("{cost}", formatUsd(q.costUsd))
                : null
            }
            redoNote={m.qualify.redoNote}
          />

          <CostStep
            title={m.findings.title}
            body={m.findings.body}
            detail={
              f.preview
                ? m.findings.targets
                    .replace("{n}", String(f.preview.estimate.targets))
                    .replace(
                      "{m}",
                      String(Math.max(0, f.preview.estimate.targets - view.cards.length)),
                    )
                : null
            }
            run={f}
            preview={f.preview?.estimate ?? null}
            remainingUsd={f.preview?.remainingUsd ?? null}
            labels={{
              button: m.findings.button,
              confirm: m.findings.confirm,
              running: m.findings.running,
              failed: m.findings.failed,
              redo: m.findings.redo,
            }}
            start={actions.startFindings}
            disabledReason={qDone ? null : m.findings.needQualification}
            doneLine={
              f.status === "termine"
                ? m.findings.done
                    .replace("{n}", String(f.count))
                    .replace("{cost}", formatUsd(f.costUsd))
                : null
            }
          />
        </>
      ) : null}

      <section className="flex flex-col gap-4" aria-labelledby="short-list">
        <h2 id="short-list" className="font-display text-2xl font-semibold">
          {M.list.title}
        </h2>
        {view.funnel ? <FunnelSummary funnel={view.funnel} /> : null}
        {view.cards.length === 0 ? (
          <Card className="p-6 text-muted-foreground">{M.list.empty}</Card>
        ) : (
          <>
            <div role="group" aria-label={M.filters.label} className="flex flex-wrap gap-2">
              {(["toutes", "inconnus", "ressources", "mentions"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={filter === k ? "default" : "outline"}
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                >
                  {M.filters[k]} ({counts[k]})
                </Button>
              ))}
            </div>
            {types.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">{M.publishers.title}</p>
                <div
                  role="group"
                  aria-label={M.publishers.label}
                  className="flex flex-wrap gap-2"
                  data-testid="publisher-tabs"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={publisher === undefined ? "default" : "outline"}
                    aria-pressed={publisher === undefined}
                    onClick={() => setPublisher(undefined)}
                  >
                    {M.publishers.all} ({view.cards.length})
                  </Button>
                  {tabs.map((tab) => (
                    <Button
                      key={tab.label ?? "~autres"}
                      type="button"
                      size="sm"
                      variant={publisher === tab.label ? "default" : "outline"}
                      aria-pressed={publisher === tab.label}
                      className={tab.count === 0 ? "text-muted-foreground" : undefined}
                      onClick={() => setPublisher(tab.label)}
                    >
                      {tab.label ?? M.publishers.others} ({tab.count})
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            {shown.length === 0 ? (
              <p className="text-muted-foreground">
                {publisher !== undefined && publisher !== null
                  ? M.publishers.emptyTab
                  : M.list.emptyFiltered}
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {shown.map((c) => (
                  <TargetCardView
                    key={c.id}
                    card={c}
                    selected={selected.has(c.id)}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            )}
            {view.funnel ? (
              <MoreSites funnel={view.funnel} more={view.more} start={actions.readMore} />
            ) : null}
            <Card className="sticky bottom-4 flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={vPending || chosen.length === 0 || view.founderRole === null}
                  onClick={() =>
                    startValidate(async () => {
                      setVState(await actions.validate(chosen));
                    })
                  }
                >
                  {vPending
                    ? M.validate.busy
                    : M.validate.button.replace("{n}", String(chosen.length))}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set(eligibleIds(view.cards)))}
                >
                  {M.list.selectAll}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  {M.list.selectNone}
                </Button>
                <Link
                  href={`/app/audit/${auditId}/plan`}
                  className="text-sm underline underline-offset-4"
                >
                  {M.toPlan}
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">
                {view.founderRole === null
                  ? M.validate.needFounder
                  : chosen.length === 0
                    ? M.validate.empty
                    : M.validate.note}
              </p>
              <Message state={vState} />
            </Card>
          </>
        )}
      </section>

      {view.contactless.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="contactless">
          <h2 id="contactless" className="font-display text-xl font-semibold">
            {M.contactless.title}
          </h2>
          <p className="text-muted-foreground">{M.contactless.body}</p>
          <ul className="flex flex-col gap-4">
            {view.contactless.map((c) => (
              <TargetCardView key={c.id} card={c} selected={false} onToggle={toggle} />
            ))}
          </ul>
        </section>
      ) : null}

      <details className="rounded-card border border-border bg-card p-4">
        <summary className="cursor-pointer font-medium">{M.serp.title}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{M.serp.body}</p>
        {view.competitors.length === 0 ? (
          <p className="mt-2 text-sm">{M.serp.empty}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {view.competitors.map((c) => (
              <li key={c.domain} className="flex flex-wrap gap-2">
                <span className="font-medium">{c.domain}</span>
                <span className="text-muted-foreground">
                  {M.serp.row
                    .replace("{queries}", String(c.queries))
                    .replace("{rank}", c.bestRank === null ? "-" : String(c.bestRank))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
