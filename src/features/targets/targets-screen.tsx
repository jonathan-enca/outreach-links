"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import {
  cardTactics,
  countByTactic,
  eligibleIds,
  filterCards,
  isEligible,
  primaryRequest,
  primaryTactic,
} from "./cards";
import { newIds, remainingMinutes, roundedMinutes } from "./live";
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

/**
 * Réglages des messages (rôle de l'utilisateur + prénom de signature), demandés UNE fois, au moment de
 * valider les cibles et avant la rédaction (retour de Jonathan, 18/11 : pas pendant la lecture de la
 * liste). Jamais « fondateur » sans son accord.
 */
export function MessageSettingsForm({
  site,
  role,
  firstName,
  count,
  pending,
  onSubmit,
  onCancel,
}: {
  site: string;
  role: TargetsView["founderRole"];
  firstName: string | null;
  count: number;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <Card className="p-4 md:p-6" data-testid="message-settings">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <h2 className="font-display text-xl font-semibold">{M.founder.title}</h2>
        <p className="text-muted-foreground">{M.founder.body}</p>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="firstName">
          {M.founder.firstName}
          <input
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={firstName ?? ""}
            required
            maxLength={60}
            autoComplete="given-name"
            className="h-11 rounded-control border border-border bg-card px-3 font-normal md:h-10 md:max-w-xs"
          />
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">{M.founder.title}</legend>
          {FOUNDER_ROLES.map((r) => (
            <label key={r} className="flex min-h-11 items-center gap-2 md:min-h-8">
              <input
                type="radio"
                name="role"
                value={r}
                defaultChecked={role === r}
                required
                className="size-5 accent-primary md:size-4"
              />
              <span>{M.founder.roles[r].replace("{site}", site)}</span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} className="w-full md:w-auto">
            {pending ? M.validate.busy : M.founder.saveAndValidate.replace("{n}", String(count))}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {M.founder.cancel}
          </Button>
        </div>
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
      <blockquote className="border-l-2 border-primary pl-3 italic">
        «&nbsp;{f.quote}&nbsp;»
      </blockquote>
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

const TB = M.table;
const NONE: ReadonlySet<string> = new Set();

function contactShort(card: TargetCard): string {
  const k = card.contact;
  if (k.kind === "email")
    return k.verified ? TB.contactShort.email : TB.contactShort.emailUnverified;
  return k.kind === "formulaire" ? TB.contactShort.form : TB.contactShort.none;
}

const REQUEST_TONE = {
  site_non_sollicite: "accent",
  page_ressources: "info",
  lien_mort: "warning",
  lien_inadapte: "warning",
  mention_sans_lien: "info",
} as const;

/**
 * Colonnes du tableau (écran large). Sur téléphone, la même ligne devient une carte : case à cocher,
 * site (et son type) et flèche sur la première rangée, puis la raison et les pastilles en dessous
 * (aucun défilement horizontal, cible tactile de la flèche de 40 px). Le type d'éditeur est écrit
 * sous le nom du site : la zone de contenu de l'application (56 rem) ne laisse pas la place d'une
 * colonne de plus sans écraser la raison.
 */
const COLS = "xl:grid-cols-[1.25rem_1.75rem_19rem_minmax(0,1fr)_9.5rem_7.5rem_2.25rem]";

/**
 * Une cible = une ligne qui se déplie (retour de Jonathan, 18/11 : tableau dense, le détail au clic).
 * Fermée : la raison en une phrase. Ouverte : la citation de sa page, la demande en trois temps, ce
 * que nous proposons et le contact.
 */
export function TargetRow({
  card,
  index,
  open,
  selected,
  isNew = false,
  onOpen,
  onToggle,
}: {
  card: TargetCard;
  index: number;
  open: boolean;
  selected: boolean;
  isNew?: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const c = M.card;
  const req = primaryRequest(card);
  const eligible = isEligible(card);
  const type = card.publisher ?? (card.siteType ? M.siteTypes[card.siteType] : "");
  const others = cardTactics(card).filter((x) => x !== primaryTactic(card));
  const resource = req.finding
    ? { url: req.finding.resourceUrl, title: req.finding.resourceTitle }
    : card.resource;
  const detailId = `detail-${card.id}`;
  return (
    <li className="border-b border-border last:border-b-0" data-testid="target-row">
      <div
        className={`grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_2.5rem] items-start gap-x-3 gap-y-1.5 px-3 py-3 hover:bg-muted/60 xl:items-center xl:px-4 xl:py-2.5 ${COLS}`}
        onClick={(e) => {
          // Un clic sur la case, un lien ou la flèche garde son propre effet.
          if ((e.target as HTMLElement).closest("input,a,button")) return;
          onOpen(card.id);
        }}
      >
        {eligible ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(card.id)}
            aria-label={`${c.select} : ${card.domain}`}
            className="mt-0.5 size-5 accent-primary xl:mt-0 xl:size-4"
          />
        ) : card.alreadyValidated ? (
          // Déjà validée : la case reste visible, cochée et grisée (sinon la ligne semble impossible à choisir).
          <input
            type="checkbox"
            checked
            disabled
            readOnly
            aria-label={`${c.alreadyValidated} : ${card.domain}`}
            className="mt-0.5 size-5 accent-primary opacity-50 xl:mt-0 xl:size-4"
          />
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="hidden text-sm tabular-nums text-muted-foreground xl:block">{index}</span>
        <div className="min-w-0">
          <h3 className="break-words font-semibold xl:truncate">
            {card.domain}
            {card.alreadyValidated ? (
              <Badge tone="success" className="ml-2 align-middle">
                {c.alreadyValidated}
              </Badge>
            ) : null}
            {isNew ? (
              <Badge tone="info" className="ml-2 align-middle">
                {M.live.newBadge}
              </Badge>
            ) : null}
          </h3>
          {type ? (
            <p className="break-words text-xs text-muted-foreground xl:truncate" title={type}>
              {type}
            </p>
          ) : null}
        </div>
        <p
          className={`col-start-2 min-w-0 text-sm xl:col-auto xl:text-[13.5px] ${open ? "xl:invisible xl:line-clamp-1" : "line-clamp-2"}`}
        >
          {card.why ?? req.lines[0] ?? ""}
        </p>
        <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 xl:contents">
          <span>
            <Badge tone={REQUEST_TONE[req.kind]}>{TB.requestTags[req.kind]}</Badge>
          </span>
          <span className="text-sm text-muted-foreground">
            <span aria-hidden="true" className="xl:hidden">
              ·{" "}
            </span>
            {contactShort(card)}
          </span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={`${open ? TB.close : TB.open} : ${card.domain}`}
          onClick={() => onOpen(card.id)}
          className="col-start-3 row-start-1 flex size-10 items-center justify-center justify-self-end rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:col-auto xl:row-auto xl:size-8"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M3 6l5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {open ? (
        <div
          id={detailId}
          className="flex flex-col gap-3 px-3 pb-4 xl:pb-5 xl:pl-[5.75rem] xl:pr-4"
        >
          {card.why ? (
            <p className="hidden text-sm xl:block">
              <strong>{TB.whyLead}</strong> {card.why}
            </p>
          ) : null}
          <div className="flex flex-col gap-4">
            {card.findings.length > 0 || req.quote ? (
              <div className="flex min-w-0 flex-col gap-2">
                {card.findings.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.findings}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {card.findings.map((f) => (
                        <FindingBlock key={f.id} f={f} />
                      ))}
                    </ul>
                  </>
                ) : req.quote ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {TB.quote}
                    </p>
                    <blockquote className="rounded-r-md border-l-2 border-primary bg-muted px-3 py-2 text-sm italic">
                      «&nbsp;{req.quote}&nbsp;»
                    </blockquote>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {c.request}
              </p>
              <ol className="list-decimal pl-5 text-sm">
                {req.lines.map((l, i) => (
                  <li key={i} className="mb-1">
                    {l}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {TB.offer}
              </p>
              <dl className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                {resource ? (
                  <>
                    <dt className="text-muted-foreground">{TB.resource}</dt>
                    <dd className="min-w-0">
                      {resource.title}
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        title={resource.url}
                        className="block truncate text-primary underline underline-offset-4"
                      >
                        {resource.url}
                      </a>
                    </dd>
                  </>
                ) : null}
                <dt className="text-muted-foreground">{c.contact}</dt>
                <dd className="min-w-0 break-words">{contactLine(card)}</dd>
                {card.pageUrl ? (
                  <>
                    <dt className="text-muted-foreground">{TB.page}</dt>
                    <dd className="min-w-0">
                      <a
                        href={card.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={card.pageUrl}
                        className="block truncate text-primary underline underline-offset-4"
                      >
                        {card.pageUrl}
                      </a>
                    </dd>
                  </>
                ) : null}
                {others.length > 0 ? (
                  <>
                    <dt className="text-muted-foreground">{TB.alsoTitle}</dt>
                    <dd>{others.map((x) => M.tacticLabels[x]).join(", ")}</dd>
                  </>
                ) : null}
              </dl>
              {card.platformHosted ? (
                <div>
                  <Badge tone="neutral">{c.hosted}</Badge>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** Le tableau des cibles : en-têtes de colonnes sur écran large seulement, cartes sur téléphone. */
export function TargetsTable({
  cards,
  open,
  selected,
  fresh = NONE,
  onOpen,
  onToggle,
}: {
  cards: readonly TargetCard[];
  open: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  /** Cibles arrivées depuis la dernière visite (pastille « Nouveau »). */
  fresh?: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0" data-testid="targets-table">
      <div
        aria-hidden="true"
        className={`hidden gap-x-3 border-b border-border bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground xl:grid ${COLS}`}
      >
        <span />
        <span>#</span>
        <span>{TB.site}</span>
        <span>{TB.why}</span>
        <span>{TB.request}</span>
        <span>{TB.contact}</span>
        <span />
      </div>
      <ul>
        {cards.map((c, i) => (
          <TargetRow
            key={c.id}
            card={c}
            index={i + 1}
            open={open.has(c.id)}
            selected={selected.has(c.id)}
            isNew={fresh.has(c.id)}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
      </ul>
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
  // Le suivi de la recherche en cours est dans `LiveBanner` (bandeau du haut), qui rafraîchit l'écran.
  if (running) return null;
  if (funnel.stock === 0 && more.status === "aucun" && auto.status === "aucun") return null;
  return (
    <Card className="flex flex-col gap-2 p-4" data-testid="more-sites">
      {auto.status === "aucun" && more.status === "termine" && more.added !== null ? (
        <p className="font-medium">{R.done(more.added)}</p>
      ) : null}
      {auto.status === "echoue" || (auto.status === "termine" && auto.stop === "erreur") ? (
        <p className="font-medium" data-testid="auto-done">
          {R.auto.stop.erreur}
        </p>
      ) : null}
      {more.status === "echoue" && auto.status === "aucun" ? (
        <p className="text-destructive">{R.failedLine}</p>
      ) : null}
      {funnel.stock > 0 ? (
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

/**
 * Bandeau de suivi de la recherche (retour de Jonathan, 18/11 : la liste passait de 53 à 70 sans
 * explication). Tant que la lecture continue : dit qu'elle tourne, ce qui s'est ajouté, le temps
 * restant estimé, et propose d'afficher les nouveaux sites sans faire sauter la liste. À la fin :
 * « Recherche terminée ».
 */
export function LiveBanner({
  view,
  hidden,
  onReveal,
}: {
  view: TargetsView;
  /** Nombre de cibles arrivées pendant la lecture et pas encore affichées. */
  hidden: number;
  onReveal: () => void;
}) {
  const L = M.live;
  const router = useRouter();
  const auto = view.more.auto;
  const running =
    view.more.status === "demande" || view.more.status === "en_cours" || auto.status === "en_cours";
  // Pendant la lecture, l'écran se met à jour seul ; les nouvelles cibles attendent le clic de l'utilisateur.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [running, router]);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (!running && hidden === 0) {
    return auto.status === "termine" && auto.added > 0 ? (
      <p className="text-sm text-muted-foreground" data-testid="live-done">
        {L.done(view.cards.length)}
      </p>
    ) : null;
  }
  const minutes =
    running && auto.status === "en_cours" && auto.startedAt && now !== null
      ? roundedMinutes(
          remainingMinutes({
            stock: view.funnel?.stock ?? 0,
            costUsd: auto.costUsd,
            startedAtMs: Date.parse(auto.startedAt),
            nowMs: now,
          }),
        )
      : null;
  return (
    <Card
      className="flex flex-col gap-2 p-3 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:p-4"
      data-testid="live-banner"
    >
      {running ? (
        <div role="status" className="flex min-w-0 flex-1 items-start gap-3 md:min-w-[18rem]">
          <span
            aria-hidden="true"
            className="mt-1.5 size-2.5 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
          />
          <p className="text-sm">
            <strong>{L.running}</strong> {minutes !== null ? L.runningBody(minutes) : null}
            {auto.added > 0 ? ` ${L.added(auto.added)}` : ""}
          </p>
        </div>
      ) : (
        <p className="flex-1 text-sm">{L.done(view.cards.length + hidden)}</p>
      )}
      {hidden > 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={onReveal}>
          {L.reveal(hidden)}
        </Button>
      ) : null}
    </Card>
  );
}

/** Filtres : une rangée qui défile au doigt sur téléphone, qui passe à la ligne sur écran large. */
const CHIPS = "flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0";

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
    saveSettings: (fd: FormData) => Promise<AuditActionState>;
    validate: (ids: string[]) => Promise<AuditActionState>;
    readMore: Act;
  };
}) {
  // Cibles arrivées pendant la lecture d'arrière-plan : mises de côté jusqu'au clic de l'utilisateur, pour
  // que la liste qu'il lit ne bouge pas sous ses yeux (retour de Jonathan, 18/11).
  const [known] = useState<ReadonlySet<string>>(() => new Set(view.cards.map((x) => x.id)));
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const cards = useMemo(
    () => view.cards.filter((x) => known.has(x.id) || revealed.has(x.id)),
    [view.cards, revealed, known],
  );
  const hiddenCards = view.cards.filter((x) => !known.has(x.id) && !revealed.has(x.id));
  // Dernière visite de l'utilisateur sur cet écran (son navigateur) : sert à marquer « Nouveau ».
  const [seenAt, setSeenAt] = useState<string | null>(null);
  useEffect(() => {
    const key = `targets-seen-${auditId}`;
    const read = setTimeout(() => {
      try {
        setSeenAt(localStorage.getItem(key));
      } catch {
        /* stockage indisponible : aucune cible marquée nouvelle */
      }
    }, 0);
    const save = () => {
      try {
        localStorage.setItem(key, new Date().toISOString());
      } catch {
        /* ignoré */
      }
    };
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(read);
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [auditId]);
  const fresh = useMemo(() => newIds(cards, seenAt, revealed), [cards, seenAt, revealed]);
  const [onlyNew, setOnlyNew] = useState(false);
  const [filter, setFilter] = useState<TacticFilter>("toutes");
  /** Onglet de type d'éditeur : `undefined` = toutes, `null` = autres sites. */
  const [publisher, setPublisher] = useState<string | null | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligibleIds(view.cards)));
  const reveal = () => {
    setRevealed(new Set(hiddenCards.map((x) => x.id)));
    setSelected((prev) => new Set([...prev, ...eligibleIds(hiddenCards)]));
  };
  // La première cible est ouverte d'emblée : on voit tout de suite le niveau de détail disponible.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(view.cards[0] ? [view.cards[0].id] : []),
  );
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const [vState, setVState] = useState<AuditActionState>({ status: "idle" });
  const [vPending, startValidate] = useTransition();
  const [askSettings, setAskSettings] = useState(false);
  const settingsOk = view.founderRole !== null && view.hasSignature;
  /** Valide les cibles retenues ; avec des réglages saisis, les enregistre d'abord (une seule fois). */
  const runValidate = (fd?: FormData) =>
    startValidate(async () => {
      if (fd) {
        const saved = await actions.saveSettings(fd);
        if (saved.status === "error") {
          setVState(saved);
          return;
        }
      }
      setVState(await actions.validate(chosen));
      setAskSettings(false);
    });
  const counts = useMemo(() => countByTactic(cards), [cards]);
  const types = view.publisherTypes;
  const tabs = useMemo(
    () =>
      publisherTabs(
        cards.map((c) => c.publisher ?? null),
        types,
      ),
    [cards, types],
  );
  const shown = useMemo(() => {
    const byTactic = filterCards(cards, filter).filter((x) => !onlyNew || fresh.has(x.id));
    if (publisher === undefined) return byTactic;
    const known = new Set(types.map((x) => x.label));
    return byTactic.filter((c) =>
      publisher === null ? !c.publisher || !known.has(c.publisher) : c.publisher === publisher,
    );
  }, [cards, filter, publisher, types, onlyNew, fresh]);
  const q = view.qualification;
  const f = view.findings;
  const chosen = [...selected].filter((id) => cards.some((c) => c.id === id && isEligible(c)));
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
                    .replace("{n}", String(cards.length))
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
                    .replace("{m}", String(Math.max(0, f.preview.estimate.targets - cards.length)))
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
          {cards.length > 0 ? M.list.heading(cards.length) : M.list.title}
        </h2>
        {cards.length > 0 ? <p className="text-muted-foreground">{M.list.lead}</p> : null}
        {view.funnel ? (
          <LiveBanner view={{ ...view, cards }} hidden={hiddenCards.length} onReveal={reveal} />
        ) : null}
        {cards.length === 0 ? (
          <Card className="p-6 text-muted-foreground">{M.list.empty}</Card>
        ) : (
          <>
            <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:w-28 xl:shrink-0 xl:pt-2">
                {M.filters.rowTitle}
              </p>
              <div role="group" aria-label={M.filters.label} className={CHIPS}>
                {(["toutes", "inconnus", "ressources", "mentions"] as const)
                  .filter((k) => k === "toutes" || counts[k] > 0)
                  .map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      className="shrink-0"
                      variant={filter === k && !onlyNew ? "default" : "outline"}
                      aria-pressed={filter === k && !onlyNew}
                      onClick={() => {
                        setFilter(k);
                        setOnlyNew(false);
                      }}
                    >
                      {M.filters[k]} ({counts[k]})
                    </Button>
                  ))}
                {fresh.size > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    variant={onlyNew ? "default" : "outline"}
                    aria-pressed={onlyNew}
                    onClick={() => setOnlyNew(!onlyNew)}
                  >
                    {M.live.newFilter} ({fresh.size})
                  </Button>
                ) : null}
              </div>
            </div>
            {types.length > 0 ? (
              <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:w-28 xl:shrink-0 xl:pt-2">
                  {M.publishers.short}
                </p>
                <div
                  role="group"
                  aria-label={M.publishers.label}
                  className={CHIPS}
                  data-testid="publisher-tabs"
                >
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0"
                    variant={publisher === undefined ? "default" : "outline"}
                    aria-pressed={publisher === undefined}
                    onClick={() => setPublisher(undefined)}
                  >
                    {M.publishers.all} ({cards.length})
                  </Button>
                  {tabs
                    .filter((tab) => tab.count > 0)
                    .map((tab) => (
                      <Button
                        key={tab.label ?? "~autres"}
                        type="button"
                        size="sm"
                        variant={publisher === tab.label ? "default" : "outline"}
                        aria-pressed={publisher === tab.label}
                        className="shrink-0"
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
                  : filter === "mentions"
                    ? view.collection.skipped.mentions
                      ? M.list.mentionsSkipped.replace("{reason}", view.collection.skipped.mentions)
                      : M.list.tacticNone
                    : M.list.emptyFiltered}
              </p>
            ) : (
              <TargetsTable
                cards={shown}
                open={open}
                selected={selected}
                fresh={fresh}
                onOpen={toggleOpen}
                onToggle={toggle}
              />
            )}
            {filter === "ressources" && view.collection.skipped.deadPages.length > 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="dead-pages-skipped">
                {M.list.deadPagesSkipped
                  .replace("{n}", String(view.collection.skipped.deadPages.length))
                  .replace(
                    "{names}",
                    view.collection.skipped.deadPages
                      .map((d) => `${d.domain} (${d.reason})`)
                      .join(", "),
                  )}
              </p>
            ) : null}
            {view.funnel ? (
              <MoreSites funnel={view.funnel} more={view.more} start={actions.readMore} />
            ) : null}
            {askSettings ? (
              <MessageSettingsForm
                site={view.siteDomain}
                role={view.founderRole}
                firstName={view.signatureFirstName}
                count={chosen.length}
                pending={vPending}
                onSubmit={(fd) => runValidate(fd)}
                onCancel={() => setAskSettings(false)}
              />
            ) : null}
            {/* Téléphone : le bouton prend toute la largeur, les actions secondaires tiennent sur une rangée. */}
            <Card className="sticky bottom-3 flex flex-col gap-2 p-3 md:bottom-4 md:p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button
                  type="button"
                  className="w-full md:w-auto"
                  disabled={vPending || chosen.length === 0}
                  onClick={() => (settingsOk ? runValidate() : setAskSettings(true))}
                >
                  {vPending
                    ? M.validate.busy
                    : M.validate.button.replace("{n}", String(chosen.length))}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set(eligibleIds(cards)))}
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
                  className="hidden text-sm underline underline-offset-4 md:inline"
                >
                  {M.toPlan}
                </Link>
              </div>
              <p
                className={`text-xs text-muted-foreground ${chosen.length > 0 ? "hidden md:block" : ""}`}
              >
                {chosen.length === 0 ? M.validate.empty : M.validate.note}
              </p>
              {settingsOk && view.founderRole ? (
                <p className="hidden text-xs text-muted-foreground md:block">
                  {M.founder.recap
                    .replace("{name}", view.signatureFirstName ?? "")
                    .replace("{role}", M.founder.shortRoles[view.founderRole])}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setAskSettings(true)}
                  >
                    {M.founder.change}
                  </button>
                </p>
              ) : null}
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
          <TargetsTable
            cards={view.contactless}
            open={open}
            selected={NONE}
            onOpen={toggleOpen}
            onToggle={toggle}
          />
        </section>
      ) : null}

      {view.noContact.length > 0 ? (
        <details className="rounded-card border border-border bg-card p-4">
          <summary className="cursor-pointer font-medium">
            {M.noContact.title.replace("{n}", String(view.noContact.length))}
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">{M.noContact.body}</p>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {view.noContact.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5">
                <span className="font-medium">{c.domain}</span>
                {(c.hook ?? c.why) ? (
                  <span className="text-muted-foreground">{c.hook ?? c.why}</span>
                ) : null}
                {c.pageUrl ? (
                  <a
                    href={c.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit underline underline-offset-4"
                  >
                    {M.noContact.open}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
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
