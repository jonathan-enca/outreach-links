"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Globe, Link2, Mail, MessageSquareText, Tag } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import {
  cardTactics,
  countStates,
  eligibleIds,
  isEligible,
  primaryRequest,
  primaryTactic,
} from "./cards";
import { remainingMinutes, roundedMinutes } from "./live";
import {
  FOUNDER_ROLES,
  type FindingView,
  type MessageState,
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
  const ref = useRef<HTMLDialogElement>(null);
  // Fenêtre modale native : le focus y reste, Échap la ferme (retour de Jonathan, 18/11 : cette
  // question n'a pas sa place comme section de la page).
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="message-settings-title"
      data-testid="message-settings"
      className="m-auto w-full max-w-[30rem] rounded-panel border border-border bg-card p-5 text-foreground shadow-float backdrop:bg-foreground/45 max-sm:mb-0 max-sm:max-w-none max-sm:rounded-b-none sm:p-6"
    >
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <h2 id="message-settings-title" className="font-display text-xl font-semibold">
          {M.founder.title}
        </h2>
        <p className="text-muted-foreground text-pretty">{M.founder.body}</p>
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
            className="h-11 rounded-control border border-border bg-card px-3 text-base font-normal sm:h-10 sm:text-sm"
          />
        </label>
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-sm font-medium">{M.founder.roleLegend}</legend>
          {FOUNDER_ROLES.map((r) => (
            <label key={r} className="flex min-h-11 items-center gap-2.5 sm:min-h-9">
              <input
                type="radio"
                name="role"
                value={r}
                defaultChecked={role === r}
                required
                className="size-5 shrink-0 accent-primary sm:size-[1.125rem]"
              />
              <span>{M.founder.roles[r].replace("{site}", site)}</span>
            </label>
          ))}
        </fieldset>
        <p className="text-sm text-muted-foreground">{M.founder.hint}</p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" disabled={pending} className="h-11 w-full sm:h-10 sm:w-auto">
            {pending ? M.validate.busy : M.founder.saveAndValidate(count)}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full sm:h-10 sm:w-auto"
            onClick={onCancel}
          >
            {M.founder.cancel}
          </Button>
        </div>
      </form>
    </dialog>
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
/** Sites sans contact : pas de case, et la colonne « Contact » porte le bouton « Ouvrir la page ». */
const COLS_PAGE = "xl:grid-cols-[1.75rem_19rem_minmax(0,1fr)_9.5rem_9.75rem_2.25rem]";

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
  pageAction = false,
  onOpen,
  onToggle,
}: {
  card: TargetCard;
  index: number;
  open: boolean;
  selected: boolean;
  isNew?: boolean;
  /** Site sans contact : ni case ni contact, un bouton qui ouvre la page lue. */
  pageAction?: boolean;
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
        className={`grid cursor-pointer items-start gap-x-3 gap-y-1.5 px-3 py-3 hover:bg-muted/60 xl:items-center xl:px-4 xl:py-2.5 ${pageAction ? `grid-cols-[minmax(0,1fr)_2.5rem] ${COLS_PAGE}` : `grid-cols-[1.25rem_minmax(0,1fr)_2.5rem] ${COLS}`}`}
        onClick={(e) => {
          // Un clic sur la case, un lien ou la flèche garde son propre effet.
          if ((e.target as HTMLElement).closest("input,a,button")) return;
          onOpen(card.id);
        }}
      >
        {pageAction ? null : eligible ? (
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
          className={`${pageAction ? "col-start-1" : "col-start-2"} min-w-0 text-sm xl:col-auto xl:text-[13.5px] ${open ? "xl:invisible xl:line-clamp-1" : "line-clamp-2"}`}
        >
          {card.why ?? card.hook ?? req.lines[0] ?? ""}
        </p>
        <div
          className={`${pageAction ? "col-span-2 col-start-1" : "col-start-2"} flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 xl:contents`}
        >
          <span>
            <Badge tone={REQUEST_TONE[req.kind]}>{TB.requestTags[req.kind]}</Badge>
          </span>
          {pageAction ? (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-fit">
              <a
                href={card.pageUrl ?? `https://${card.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                title={card.pageUrl ?? undefined}
                aria-label={M.noContact.openLabel.replace("{domain}", card.domain)}
              >
                {M.noContact.open}
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              <span aria-hidden="true" className="xl:hidden">
                ·{" "}
              </span>
              {contactShort(card)}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={`${open ? TB.close : TB.open} : ${card.domain}`}
          onClick={() => onOpen(card.id)}
          className={`${pageAction ? "col-start-2" : "col-start-3"} row-start-1 flex size-10 items-center justify-center justify-self-end rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:col-auto xl:row-auto xl:size-8`}
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
          className={`flex flex-col gap-3 px-3 pb-4 xl:pb-5 xl:pr-4 ${pageAction ? "xl:pl-[3.5rem]" : "xl:pl-[5.75rem]"}`}
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

/** Case maîtresse de l'en-tête : cochée, à moitié cochée (indeterminate) ou vide. */
function MasterCheck({
  checked,
  indeterminate,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onToggle}
      aria-label={label}
      className="size-4 accent-primary disabled:opacity-50"
    />
  );
}

/** Le tableau des cibles : en-têtes de colonnes sur écran large seulement, cartes sur téléphone. */
export function TargetsTable({
  cards,
  open,
  selected,
  fresh = NONE,
  pageAction = false,
  master,
  onOpen,
  onToggle,
}: {
  cards: readonly TargetCard[];
  open: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  /** Cibles arrivées depuis la dernière visite (pastille « Nouveau »). */
  fresh?: ReadonlySet<string>;
  /** Sites sans contact : pas de case, bouton « Ouvrir la page » à la place du contact. */
  pageAction?: boolean;
  /** Case maîtresse avant le #, qui agit sur les sites affichés. */
  master?: { checked: boolean; indeterminate: boolean; disabled: boolean; onToggle: () => void };
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0" data-testid="targets-table">
      <div
        aria-hidden={master ? undefined : true}
        className={`hidden gap-x-3 border-b border-border bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground xl:grid ${pageAction ? COLS_PAGE : COLS}`}
      >
        {pageAction ? null : master ? (
          <MasterCheck {...master} label={M.list.masterLabel} />
        ) : (
          <span />
        )}
        <span>#</span>
        <span>{TB.site}</span>
        <span>{TB.why}</span>
        <span>{TB.request}</span>
        <span>{pageAction ? M.noContact.column : TB.contact}</span>
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
            pageAction={pageAction}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </Card>
  );
}

/** Colonnes du tableau sur écran large : case, site, type de site, raison, demande, contact. */
const LIST_COLS =
  "xl:grid-cols-[2.75rem_minmax(12rem,1.5fr)_10rem_minmax(13rem,2.5fr)_9.5rem_9.5rem]";
/** Une cellule : sur écran large, un filet vertical léger la sépare de la suivante. */
const CELL =
  "min-w-0 xl:flex xl:items-center xl:border-r xl:border-border/60 xl:px-3 xl:py-2 xl:last:border-r-0";
/** Étiquette pastel : la couleur distingue les demandes, le texte dit toujours laquelle. */
const TAG = "inline-block max-w-full truncate rounded-[5px] px-1.5 text-[13px] leading-normal";
const REQUEST_TAG = {
  site_non_sollicite: "bg-success/10 text-success",
  page_ressources: "bg-info/10 text-info",
  lien_mort: "bg-warning/15 text-warning",
  lien_inadapte: "bg-warning/15 text-warning",
  mention_sans_lien: "bg-primary/10 text-primary",
} as const;
/** Teintes de la pastille à l'initiale du site (repère visuel, sans signification). */
const INITIAL_TINTS = ["bg-info/10", "bg-warning/15", "bg-primary/10", "bg-success/10"] as const;

function HeadCell({
  icon: Icon,
  className = "",
  children,
}: {
  icon: typeof Globe;
  className?: string;
  children: string;
}) {
  return (
    <div className={`${CELL} items-center gap-2 py-2 ${className}`}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0 opacity-80" />
      {children}
    </div>
  );
}

/**
 * Écran « Cibles » : un tableau simple, une ligne par site (retour de Jonathan, 20/11 : la liste de noms
 * seuls ne disait rien). Case, site, type de site, raison en une phrase, demande et contact ; un clic sur
 * la ligne affiche la raison en entier. Sur téléphone, chaque ligne devient une petite fiche.
 */
function TargetList({
  cards,
  selected,
  selectedCount,
  eligibleCount,
  master,
  onToggle,
}: {
  cards: readonly TargetCard[];
  selected: ReadonlySet<string>;
  selectedCount: number;
  eligibleCount: number;
  master: { checked: boolean; indeterminate: boolean; disabled: boolean; onToggle: () => void };
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <div className="flex flex-col gap-2">
      <p
        className="text-right text-sm text-muted-foreground tabular-nums"
        data-testid="selection-count"
      >
        {M.list.selectedCount(selectedCount, eligibleCount)}
      </p>
      <Card className="overflow-hidden p-0" data-testid="targets-list">
        <div
          className={`grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-border bg-muted/60 text-[13px] font-medium text-muted-foreground ${LIST_COLS}`}
        >
          <div className="flex items-center justify-center py-2 xl:border-r xl:border-border/60">
            <MasterCheck {...master} label={M.list.masterLabel} />
          </div>
          <HeadCell icon={Globe} className="flex">
            {TB.site}
          </HeadCell>
          <HeadCell icon={Tag} className="hidden">
            {TB.typeColumn}
          </HeadCell>
          <HeadCell icon={MessageSquareText} className="hidden">
            {TB.why}
          </HeadCell>
          <HeadCell icon={Link2} className="hidden">
            {TB.request}
          </HeadCell>
          <HeadCell icon={Mail} className="hidden">
            {TB.contact}
          </HeadCell>
        </div>
        <ul>
          {cards.map((c, i) => {
            const eligible = isEligible(c);
            const checked = selected.has(c.id);
            const req = primaryRequest(c);
            const type = c.publisher ?? (c.siteType ? M.siteTypes[c.siteType] : "");
            const why = c.why ?? c.hook ?? req.lines[0] ?? "";
            const isOpen = open.has(c.id);
            // Site décoché ou impossible à contacter : la ligne s'efface, la case reste nette.
            const dim = eligible && checked ? "" : "opacity-50";
            const ContactIcon = c.contact.kind === "formulaire" ? FileText : Mail;
            return (
              <li
                key={c.id}
                data-testid="target-row"
                className={`group grid cursor-pointer grid-cols-[2.75rem_minmax(0,1fr)] gap-y-1.5 border-b border-border py-3 pr-3 last:border-b-0 hover:bg-muted/50 xl:gap-y-0 xl:py-0 xl:pr-0 ${LIST_COLS}`}
                onClick={(e) => {
                  // Un clic sur la case ou sur un lien garde son propre effet.
                  if ((e.target as HTMLElement).closest("input,a")) return;
                  toggleOpen(c.id);
                }}
              >
                <div
                  className={`row-span-3 flex justify-center pt-0.5 xl:row-span-1 xl:border-r xl:border-border/60 xl:pt-0 ${isOpen ? "xl:items-start xl:pt-2.5" : "xl:items-center"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!eligible}
                    onChange={() => onToggle(c.id)}
                    aria-label={TB.selectSite(c.domain)}
                    className="size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-default disabled:opacity-50 xl:size-4"
                  />
                </div>
                <div className={`${CELL} relative flex items-center gap-2 xl:order-1 ${dim}`}>
                  <span
                    aria-hidden="true"
                    className={`flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-semibold uppercase ${INITIAL_TINTS[i % INITIAL_TINTS.length]}`}
                  >
                    {c.domain.charAt(0)}
                  </span>
                  <span className="min-w-0 font-medium break-words xl:truncate" title={c.domain}>
                    {c.domain}
                  </span>
                  <a
                    href={c.pageUrl ?? `https://${c.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={TB.openSiteLabel(c.domain)}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:absolute xl:right-2 xl:opacity-0 xl:group-hover:opacity-100 xl:focus-visible:opacity-100"
                  >
                    {TB.openSite}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </div>
                <div
                  className={`${CELL} xl:order-3 ${isOpen ? "xl:items-start" : ""} ${dim}`}
                  title={isOpen ? undefined : why}
                >
                  <span className={`text-sm ${isOpen ? "" : "xl:truncate"}`}>{why}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 xl:contents">
                  <div className={`${CELL} xl:order-2 ${dim}`}>
                    {type ? (
                      <span className={`${TAG} bg-muted text-foreground`} title={type}>
                        {type}
                      </span>
                    ) : null}
                  </div>
                  <div className={`${CELL} xl:order-4 ${dim}`}>
                    <span className={`${TAG} ${REQUEST_TAG[req.kind]}`}>
                      {TB.requestTags[req.kind]}
                    </span>
                  </div>
                  <div
                    className={`${CELL} flex items-center gap-1.5 text-sm xl:order-5 ${dim} ${c.contact.kind === "email" && !c.contact.verified ? "text-warning" : "text-muted-foreground"}`}
                  >
                    {c.contact.kind === "aucun" ? null : (
                      <ContactIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{contactShort(c)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/**
 * Après la lecture des autres sites (automatique, sans bouton tant qu'elle tourne : voir `LiveBanner`) :
 * ce qui s'est passé. Le nombre de sites restant à lire n'est plus affiché (retour de Jonathan, 20/11).
 */
export function MoreSites({ more }: { more: TargetsView["more"] }) {
  const R = M.more;
  const auto = more.auto;
  const running =
    more.status === "demande" || more.status === "en_cours" || auto.status === "en_cours";
  // Le suivi de la recherche en cours est dans `LiveBanner` (bandeau du haut), qui rafraîchit l'écran.
  if (running) return null;
  const doneLine = auto.status === "aucun" && more.status === "termine" && more.added !== null;
  const failed = more.status === "echoue" && auto.status === "aucun";
  if (!doneLine && !failed) return null;
  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5" data-testid="more-sites">
      <div role="status" className="flex flex-col gap-1.5">
        {doneLine ? <p className="font-medium">{R.done(more.added ?? 0)}</p> : null}
        {failed ? <p className="font-medium text-pretty">{R.failedLine}</p> : null}
      </div>
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
    // Arrêtée alors qu'il reste des sites à lire : « terminée » serait faux, on ne dit rien.
    return auto.status === "termine" && auto.added > 0 && (view.funnel?.stock ?? 0) === 0 ? (
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
  const stock = view.funnel?.stock ?? 0;
  // Avancement : les sites trouvés qui ne sont plus à lire. Affiché seulement quand le compte a un sens.
  const total = view.funnel?.candidates ?? 0;
  const examined = total - stock;
  const percent =
    running && stock > 0 && examined > 0 ? Math.floor((100 * examined) / total) : null;
  return (
    <Card
      className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center md:gap-x-4"
      data-testid="live-banner"
    >
      {running ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:min-w-[18rem]">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2.5 shrink-0 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
            />
            <div className="flex min-w-0 flex-col gap-1">
              {/* Seul le changement d'état est annoncé : les compteurs bougent toutes les 8 secondes. */}
              <p className="text-sm text-pretty">
                <strong role="status">{L.running}</strong> {L.runningBody(stock)}
                {auto.added > 0 ? ` ${L.added(auto.added)}` : ""}
              </p>
              <p className="text-sm text-muted-foreground text-pretty">
                {minutes !== null ? `${L.eta(minutes)} ` : ""}
                {L.runningHint}
              </p>
            </div>
          </div>
          {percent !== null ? (
            <div className="flex flex-col gap-1 pl-[1.375rem]">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-valuetext={L.progress(examined, total)}
                aria-label={L.progressLabel}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums" aria-hidden="true">
                {L.progress(examined, total)}
              </p>
            </div>
          ) : null}
        </div>
      ) : stock === 0 ? (
        <p role="status" className="flex-1 text-sm">
          {L.done(view.cards.length + hidden)}
        </p>
      ) : null}
      {hidden > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start md:self-center"
          onClick={onReveal}
        >
          {L.reveal(hidden)}
        </Button>
      ) : null}
    </Card>
  );
}

const A = M.after;
const APPROVE_HREF = "/app/a-valider";
const EMAILS_HREF = "/app/envois";

/**
 * Carte d'avancement (maquette `docs/mockups/cibles-apres-validation.html`) : le lien entre « Cibles »
 * et « À approuver ». Pendant la rédaction, on peut relire les premiers messages sans attendre.
 */
export function ProgressCard({
  counts,
  total,
  toDecide,
  onDraftMissing,
  draftPending,
}: {
  counts: Record<MessageState, number>;
  total: number;
  toDecide: number;
  onDraftMissing: () => void;
  draftPending: boolean;
}) {
  const ready = counts.a_relire;
  const writing = counts.en_redaction;
  const waiting = counts.a_rediger;
  const written = total - writing - waiting;
  const done = writing === 0 && waiting === 0;
  const pct = (n: number) => `${(n / Math.max(total, 1)) * 100}%`;
  let title: string;
  let body: string;
  let action: React.ReactNode;
  const btn = "h-11 w-full shrink-0 sm:h-10 sm:w-auto";
  if (writing > 0) {
    title = A.writingTitle(written, total);
    body = A.writingBody;
    action =
      ready > 0 ? (
        <Button asChild className={btn}>
          <Link href={APPROVE_HREF}>{A.readSome(ready)}</Link>
        </Button>
      ) : (
        <Button type="button" disabled className={btn}>
          {A.firstSoon}
        </Button>
      );
  } else if (waiting > 0) {
    title = A.waitingTitle(waiting);
    body = A.waitingBody;
    action = (
      <Button type="button" className={btn} disabled={draftPending} onClick={onDraftMissing}>
        {draftPending ? M.validate.busy : A.draftMissing(waiting)}
      </Button>
    );
  } else if (ready > 0) {
    title = A.readyTitle(ready);
    body = A.readyBody;
    action = (
      <Button asChild className={btn}>
        <Link href={APPROVE_HREF}>{A.readAll}</Link>
      </Button>
    );
  } else {
    title = A.doneTitle;
    body = A.doneBody;
    action = (
      <Button asChild variant="outline" className={btn}>
        <Link href={EMAILS_HREF}>{A.seeEmails}</Link>
      </Button>
    );
  }
  const keys: { n: number; label: string; swatch: string }[] = [
    { n: ready, label: A.keys.ready, swatch: "bg-primary" },
    { n: counts.approuve, label: A.keys.approved, swatch: "bg-success" },
    { n: writing, label: A.keys.writing, swatch: "bg-primary/25" },
    { n: waiting, label: A.keys.waiting, swatch: "bg-muted-foreground/30" },
    { n: counts.refuse, label: A.keys.refused, swatch: "bg-warning/30" },
  ];
  const next: React.ReactNode[] = [];
  if (toDecide > 0)
    next.push(
      <span key="d">
        {A.nextDecide(toDecide)}{" "}
        <a href="#a-decider" className="font-medium text-primary hover:underline">
          {A.nextDecideLink}
        </a>
      </span>,
    );
  if (counts.refuse > 0)
    next.push(
      <span key="r">
        {A.nextRefused(counts.refuse)}{" "}
        <a href="#retenues" className="font-medium text-primary hover:underline">
          {A.nextRefusedLink}
        </a>
      </span>,
    );
  return (
    <Card
      role="region"
      aria-label={A.region}
      data-testid="drafting-progress"
      className={`grid gap-x-6 gap-y-3.5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5 ${done ? "border-success/30 bg-gradient-to-b from-success/5 to-card to-70%" : ""}`}
    >
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold" aria-live="polite">
          {title}
        </h2>
        <p className="mt-0.5 text-[14.5px] text-muted-foreground text-pretty">{body}</p>
      </div>
      {action}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <div
          role="progressbar"
          aria-label={A.bar}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={written}
          className="flex h-2 overflow-hidden rounded-full bg-muted"
        >
          <span className="h-full bg-primary" style={{ width: pct(ready + counts.approuve) }} />
          {writing > 0 ? (
            <span
              className="h-full animate-pulse bg-primary/25 motion-reduce:animate-none"
              style={{ width: pct(writing) }}
            />
          ) : null}
        </div>
        <p className="flex flex-wrap gap-x-[18px] gap-y-1 text-[13.5px] text-muted-foreground">
          {keys
            .filter((k) => k.n > 0)
            .map((k) => (
              <span key={k.label} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${k.swatch}`} />
                <strong className="font-semibold text-foreground tabular-nums">{k.n}</strong>
                {k.label}
              </span>
            ))}
        </p>
      </div>
      {next.length > 0 ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/60 pt-3 text-sm text-muted-foreground sm:col-span-2">
          {next}
        </p>
      ) : null}
    </Card>
  );
}

/** Colonnes de « Retenues » sur écran large : site, demande, contact, message. */
const KEPT_COLS = "xl:grid-cols-[minmax(10rem,1fr)_9.5rem_9.5rem_minmax(15rem,1.4fr)]";

const STATE_TAG: Record<MessageState, string> = {
  en_redaction: "",
  a_rediger: "bg-muted text-foreground",
  a_relire: "bg-info/10 text-info",
  approuve: "bg-success/10 text-success",
  refuse: "bg-warning/15 text-warning",
};

/** Le message d'une cible retenue : son état, et l'action qui va avec. */
function MessageCell({
  state,
  onAnyway,
  busy,
}: {
  state: MessageState;
  onAnyway: () => void;
  busy: boolean;
}) {
  const act =
    "ml-auto shrink-0 text-[13.5px] font-medium whitespace-nowrap text-primary hover:underline";
  return (
    <div className="flex w-full items-center gap-2.5 text-sm">
      {state === "en_redaction" ? (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-[7px] animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none"
          />
          {A.states.en_redaction}
        </span>
      ) : (
        <span className={`${TAG} ${STATE_TAG[state]}`}>{A.states[state]}</span>
      )}
      {state === "a_relire" ? (
        <Link href={APPROVE_HREF} className={act}>
          {A.review}
        </Link>
      ) : null}
      {state === "refuse" ? (
        <button
          type="button"
          className={`${act} disabled:opacity-50`}
          disabled={busy}
          onClick={onAnyway}
        >
          {A.anyway}
        </button>
      ) : null}
    </div>
  );
}

/** « Retenues » : chaque site retenu garde sa ligne, avec l'état de son message. */
export function RetainedList({
  cards,
  messages,
  onAnyway,
  busy,
}: {
  cards: readonly TargetCard[];
  messages: TargetsView["messages"];
  onAnyway: (itemId: string) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <Card className="overflow-hidden p-0" data-testid="retained-list">
      <div
        aria-hidden="true"
        className={`hidden border-b border-border bg-muted/60 text-[13px] font-medium text-muted-foreground xl:grid ${KEPT_COLS}`}
      >
        <HeadCell icon={Globe} className="flex">
          {TB.site}
        </HeadCell>
        <HeadCell icon={Link2} className="flex">
          {TB.request}
        </HeadCell>
        <HeadCell icon={Mail} className="flex">
          {TB.contact}
        </HeadCell>
        <HeadCell icon={MessageSquareText} className="flex">
          {A.messageColumn}
        </HeadCell>
      </div>
      <ul>
        {cards.map((c, i) => {
          const req = primaryRequest(c);
          const why = c.why ?? c.hook ?? req.lines[0] ?? "";
          const isOpen = open.has(c.id);
          const msg = messages[c.id];
          const state = msg?.state ?? "en_redaction";
          const ContactIcon = c.contact.kind === "formulaire" ? FileText : Mail;
          return (
            <li
              key={c.id}
              data-testid="retained-row"
              className={`group grid cursor-pointer grid-cols-2 gap-y-1.5 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-muted/50 xl:gap-y-0 xl:p-0 ${KEPT_COLS}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a,button")) return;
                toggleOpen(c.id);
              }}
            >
              <div className={`${CELL} relative col-span-2 flex items-center gap-2 xl:col-span-1`}>
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-semibold uppercase ${INITIAL_TINTS[i % INITIAL_TINTS.length]}`}
                >
                  {c.domain.charAt(0)}
                </span>
                <span className="min-w-0 font-medium break-words xl:truncate" title={c.domain}>
                  {c.domain}
                </span>
                <a
                  href={c.pageUrl ?? `https://${c.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={TB.openSiteLabel(c.domain)}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:absolute xl:right-2 xl:opacity-0 xl:group-hover:opacity-100 xl:focus-visible:opacity-100"
                >
                  {TB.openSite}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              </div>
              <div className={CELL}>
                <span className={`${TAG} ${REQUEST_TAG[req.kind]}`}>
                  {TB.requestTags[req.kind]}
                </span>
              </div>
              <div
                className={`${CELL} flex items-center gap-1.5 text-sm ${c.contact.kind === "email" && !c.contact.verified ? "text-warning" : "text-muted-foreground"}`}
              >
                <ContactIcon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{contactShort(c)}</span>
              </div>
              <div
                className={`${CELL} col-span-2 flex-col items-stretch xl:col-span-1 ${isOpen ? "xl:items-stretch" : ""}`}
              >
                <MessageCell
                  state={state}
                  busy={busy}
                  onAnyway={() => (msg ? onAnyway(msg.itemId) : undefined)}
                />
                {isOpen && why ? (
                  <span className="mt-1 block text-sm text-muted-foreground text-pretty">
                    {why}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Titre de section (« À décider », « Retenues ») avec son nombre et une consigne courte. */
function SectionHead({
  id,
  title,
  count,
  hint,
}: {
  id: string;
  title: string;
  count: number;
  hint: string;
}) {
  return (
    <div id={id} className="flex scroll-mt-4 flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <span className="rounded-full bg-muted px-2 text-[12.5px] text-muted-foreground tabular-nums">
        {count}
      </span>
      <p className="basis-full text-[13.5px] text-muted-foreground sm:ml-auto sm:basis-auto">
        {hint}
      </p>
    </div>
  );
}

/** Filtres : une rangée qui défile au doigt sur téléphone, qui passe à la ligne sur écran large. */
export function TargetsScreen({
  view,
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
    /** Après validation : relancer la rédaction des messages manquants, ou d'un message refusé. */
    draftMissing?: Act;
    draftAnyway?: (itemId: string) => Promise<AuditActionState>;
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligibleIds(view.cards)));
  const reveal = () => {
    setRevealed(new Set(hiddenCards.map((x) => x.id)));
    setSelected((prev) => new Set([...prev, ...eligibleIds(hiddenCards)]));
  };
  const [vState, setVState] = useState<AuditActionState>({ status: "idle" });
  const [vPending, startValidate] = useTransition();
  const router = useRouter();
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
      // Les cibles validées passent tout de suite dans « Déjà validées » et dans le lien vers « À approuver ».
      router.refresh();
    });
  // Les cibles déjà validées sortent de la liste : elles sont dans « À approuver ».
  const pending = useMemo(() => cards.filter((x) => !x.alreadyValidated), [cards]);
  const q = view.qualification;
  const f = view.findings;
  const chosen = [...selected].filter((id) => cards.some((c) => c.id === id && isEligible(c)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  // Compteur et case maîtresse : ne portent que sur les sites de la liste qui peuvent être cochés.
  const eligible = eligibleIds(pending);
  const eligibleSelected = eligible.filter((id) => selected.has(id));
  const allSelected = eligible.length > 0 && eligibleSelected.length === eligible.length;
  const selectAll = () => setSelected((prev) => new Set([...prev, ...eligible]));
  const clearAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of eligible) next.delete(id);
      return next;
    });
  // Cibles retenues : elles restent à l'écran, avec l'état de leur message (plus d'écran vide).
  const kept = useMemo(() => cards.filter((x) => x.alreadyValidated), [cards]);
  const states = countStates(kept, view.messages);
  const [dState, setDState] = useState<AuditActionState>({ status: "idle" });
  const [dPending, startDraft] = useTransition();
  const runDraft = (fn: (() => Promise<AuditActionState>) | undefined) =>
    fn
      ? startDraft(async () => {
          setDState(await fn());
          router.refresh();
        })
      : undefined;
  // Pendant la rédaction, l'écran se met à jour seul (comme « À approuver »).
  const drafting = view.drafting || states.en_redaction > 0;
  useEffect(() => {
    if (!drafting) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [drafting, router]);
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

      <section className="flex flex-col gap-4" aria-label={M.list.title}>
        {view.funnel ? (
          <LiveBanner view={{ ...view, cards }} hidden={hiddenCards.length} onReveal={reveal} />
        ) : null}
        {cards.length === 0 ? (
          <Card className="p-6 text-muted-foreground">{M.list.empty}</Card>
        ) : (
          <>
            {kept.length > 0 ? (
              <ProgressCard
                counts={states}
                total={kept.length}
                toDecide={pending.length}
                draftPending={dPending}
                onDraftMissing={() => runDraft(actions.draftMissing)}
              />
            ) : null}
            {pending.length === 0 ? null : (
              <>
                {kept.length > 0 ? (
                  <SectionHead
                    id="a-decider"
                    title={A.decideTitle}
                    count={pending.length}
                    hint={A.decideHint}
                  />
                ) : null}
                <TargetList
                  cards={pending}
                  selected={selected}
                  selectedCount={eligibleSelected.length}
                  eligibleCount={eligible.length}
                  master={{
                    checked: allSelected,
                    indeterminate: eligibleSelected.length > 0 && !allSelected,
                    disabled: eligible.length === 0,
                    onToggle: allSelected ? clearAll : selectAll,
                  }}
                  onToggle={toggle}
                />
                {/* Une seule action, collée en bas de la liste. */}
                <Card
                  role="region"
                  aria-label={M.validate.region}
                  data-testid="validate-bar"
                  className="sticky bottom-3 z-10 flex flex-col gap-3 border-foreground/15 p-3 shadow-[0_10px_30px_-10px_rgb(14_26_43/0.3),0_1px_2px_rgb(14_26_43/0.08)] sm:flex-row sm:items-center sm:gap-4 sm:py-3 sm:pr-3 sm:pl-4 md:bottom-4"
                >
                  <p className="sm:mr-auto">
                    <strong className="block" aria-live="polite">
                      {chosen.length === 0
                        ? M.validate.empty
                        : M.validate.willPrepare(chosen.length)}
                    </strong>
                    <span className="block text-sm text-muted-foreground">{M.validate.note}</span>
                  </p>
                  <Button
                    type="button"
                    className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
                    disabled={vPending || chosen.length === 0}
                    onClick={() => (settingsOk ? runValidate() : setAskSettings(true))}
                  >
                    {vPending ? M.validate.busy : M.validate.button(chosen.length)}
                  </Button>
                </Card>
              </>
            )}
            <Message state={vState} />
            {kept.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <SectionHead
                  id="retenues"
                  title={A.keptTitle}
                  count={kept.length}
                  hint={A.keptHint}
                />
                <RetainedList
                  cards={kept}
                  messages={view.messages}
                  busy={dPending}
                  onAnyway={(itemId) =>
                    runDraft(actions.draftAnyway ? () => actions.draftAnyway!(itemId) : undefined)
                  }
                />
                <p className="text-[13px] text-muted-foreground">{A.keptExplain}</p>
                <Message state={dState} />
              </div>
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
            {view.funnel ? <MoreSites more={view.more} /> : null}
          </>
        )}
      </section>
    </div>
  );
}
