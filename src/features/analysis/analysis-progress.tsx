"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Loader2, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { StepStatus } from "./steps";
import { buildAnalysisView, type AnalysisSnapshot, type FunnelView, type StepView } from "./view";

const POLL_MS = 3000;
/** Analyse finie, lecture des autres sites encore en cours : on regarde moins souvent. */
const BACKGROUND_POLL_MS = 10_000;
/** Délai avant d'ouvrir « Vos cibles » : le temps de voir que c'est fini. */
const REDIRECT_MS = 4000;
const S = t.analysis.screen;

/** La pastille d'une étape : la FORME change avec l'état (numéro, anneau, coche, tiret, point d'exclamation), pas seulement la couleur. */
function StepDot({
  status,
  position,
  soft = false,
}: {
  status: StepStatus;
  position: number;
  soft?: boolean;
}) {
  const base =
    "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 bg-card text-xs font-semibold tabular-nums transition-colors duration-300 motion-reduce:transition-none";
  if (status === "termine")
    return (
      <span aria-hidden className={cn(base, "border-success bg-success/10 text-success")}>
        <Check className="size-4" />
      </span>
    );
  if (status === "en_cours")
    return (
      <span aria-hidden className={cn(base, "border-primary text-primary")}>
        <Loader2 className="size-4 motion-safe:animate-spin" />
      </span>
    );
  if (status === "echoue")
    return (
      <span
        aria-hidden
        className={cn(
          base,
          soft
            ? "border-warning bg-warning/10 text-warning"
            : "border-danger bg-danger/10 text-danger",
        )}
      >
        <AlertTriangle className="size-3.5" />
      </span>
    );
  if (status === "saute")
    return (
      <span aria-hidden className={cn(base, "border-dashed border-border text-muted-foreground")}>
        <Minus className="size-4" />
      </span>
    );
  return (
    <span aria-hidden className={cn(base, "border-border text-muted-foreground")}>
      {position}
    </span>
  );
}

function StepRowView({
  step,
  last,
  onRestart,
  busy,
}: {
  step: StepView;
  last: boolean;
  onRestart: (key: string) => void;
  busy: boolean;
}) {
  const active = step.status === "en_cours";
  // L'étape parallèle qui n'aboutit pas n'arrête rien : un avertissement, pas une alerte.
  const soft = step.status === "echoue" && step.parallel;
  const failed = step.status === "echoue" && !soft;
  const idle = step.status === "attente" || step.status === "saute";
  const [armed, setArmed] = useState(false);
  return (
    <li
      data-step={step.key}
      data-status={step.status}
      aria-current={active && !step.parallel ? "step" : undefined}
      className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3"
    >
      {/* Le fil qui relie les étapes : vert une fois l'étape faite. */}
      {last ? null : (
        <span
          aria-hidden
          className={cn(
            "absolute top-7 bottom-0 left-[0.8125rem] w-0.5 transition-colors duration-300 motion-reduce:transition-none",
            step.status === "termine" ? "bg-success/40" : "bg-border",
          )}
        />
      )}
      <StepDot status={step.status} position={step.position} soft={soft} />
      <div
        className={cn(
          "min-w-0 pt-0.5 pb-4",
          active && "mb-3 rounded-lg border border-primary/30 bg-card px-3 py-2.5 shadow-card",
          failed && "mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5",
          soft && "mb-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span
            className={cn(
              "font-medium",
              idle && "font-normal text-muted-foreground",
              failed && "text-danger",
            )}
          >
            {step.label}
            {step.parallel ? (
              <Badge tone="info" className="ml-2 align-middle font-normal">
                {S.parallel}
              </Badge>
            ) : null}
          </span>
          <span
            className={cn(
              "text-xs whitespace-nowrap text-muted-foreground",
              active && "font-semibold text-primary",
              failed && "font-semibold text-danger",
              soft && "font-semibold text-warning",
            )}
          >
            {soft ? S.parallelFailed : S.stepState[step.status]}
          </span>
        </div>
        {step.counter ? (
          <p className="mt-0.5 text-sm tabular-nums" data-counter>
            {step.counter}
          </p>
        ) : null}
        {step.progress !== null ? (
          <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.max(step.progress, 3)}%` }}
            />
          </div>
        ) : null}
        {step.example ? (
          <p className="mt-1 line-clamp-2 text-sm break-words text-muted-foreground" data-example>
            {step.example}
          </p>
        ) : null}
        {step.notes.map((note) => (
          <p key={note} className="mt-1 text-sm text-muted-foreground" data-note>
            {note}
          </p>
        ))}
        {step.missed ? (
          <p className="mt-1 text-sm text-warning" data-missed>
            {step.missed}
          </p>
        ) : null}
        {step.error ? (
          <p className={cn("mt-1 text-sm", soft ? "text-warning" : "text-danger")}>{step.error}</p>
        ) : null}
        {step.canRestart ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {armed ? (
              <>
                <p className="w-full text-sm text-muted-foreground">{S.restartConfirm}</p>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setArmed(false);
                    onRestart(step.key);
                  }}
                >
                  {busy ? S.restarting : S.restartFrom}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setArmed(false)}>
                  {S.restartCancel}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                data-restart={step.key}
                onClick={() => setArmed(true)}
              >
                {S.restartFrom}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Du plus large au plus précis : quatre lignes toujours présentes (« à venir »), donc aucun saut quand elles se remplissent. */
function FunnelCard({ funnel, provisional }: { funnel: FunnelView; provisional: boolean }) {
  const rows: [string, number | null][] = [
    [S.funnelRows.found, funnel.found],
    [S.funnelRows.read, funnel.read],
    [S.funnelRows.kept, funnel.kept],
    [provisional ? S.funnelRows.targetsSoFar : S.funnelRows.targets, funnel.targets],
  ];
  const max = Math.max(1, funnel.found);
  return (
    <Card className="flex flex-col gap-3 p-5" data-block="funnel">
      <h3 className="font-medium">{S.funnelTitle}</h3>
      <dl className="flex flex-col gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
            <dt className={cn("text-sm", value === null && "text-muted-foreground")}>{label}</dt>
            <dd
              className={cn(
                "text-sm tabular-nums",
                value === null ? "text-muted-foreground" : "font-semibold",
              )}
            >
              {value === null ? S.funnelPending : value.toLocaleString("fr-FR")}
            </dd>
            <div
              aria-hidden
              className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              {/* Racine carrée : les petits nombres restent visibles à côté des grands. */}
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
                style={{
                  width: value ? `${Math.max(3, Math.round(100 * Math.sqrt(value / max)))}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/**
 * L'écran « Analyse en cours » (MU.3) : les huit étapes avancent en direct (route d'état interrogée
 * toutes les 3 secondes, sans rechargement), ce qui se passe maintenant, l'avancement et le temps
 * restant en fourchette, du plus large au plus précis en chiffres, les premières cibles ; en échec, ce qui a marché et un bouton « Reprendre » ; à la fin,
 * ouverture automatique de « Vos cibles ». Fermer puis rouvrir la page retrouve l'état (tout est en base).
 */
export function AnalysisProgress({
  initial,
  resumeAction,
  restartAction,
  relaunchAction,
  emailEnabled,
  autoOpen = true,
  variant = "page",
}: {
  initial: AnalysisSnapshot;
  resumeAction: (prev: AuditActionState) => Promise<AuditActionState>;
  /** « Reprendre à partir d'ici » (chantier A.2). */
  restartAction: (stepKey: string) => Promise<AuditActionState>;
  /** Démarrage bloqué : relance l'événement (chantier A.4). */
  relaunchAction: () => Promise<AuditActionState>;
  emailEnabled: boolean;
  /** Faux : on revoit les étapes d'une analyse finie, « Vos cibles » ne s'ouvre pas seul. */
  autoOpen?: boolean;
  /**
   * « stage » : dans l'étape 4 du parcours en une page (maquette du 20/11), en une colonne, sans
   * cartes imbriquées ni entonnoir : avancement, étapes, premières cibles, puis l'encadré de fin.
   */
  variant?: "page" | "stage";
}) {
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [offline, setOffline] = useState(false);
  const inFlight = useRef(false);
  const view = useMemo(() => buildAnalysisView(snap), [snap]);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/analysis/${initial.auditId}/status`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/connexion");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setSnap((await res.json()) as AnalysisSnapshot);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      inFlight.current = false;
    }
  }, [initial.auditId, router]);

  // Interroge la route légère tant que l'analyse tourne ; s'arrête à l'échec, ou à la fin une fois la
  // lecture des autres sites trouvés finie elle aussi (interrogée moins souvent).
  const pollMs = view.active ? POLL_MS : view.backgroundPending ? BACKGROUND_POLL_MS : 0;
  useEffect(() => {
    if (!pollMs) return;
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, refresh]);

  // Fin : on laisse voir « terminée », puis « Vos cibles » s'ouvre seul.
  useEffect(() => {
    if (snap.status !== "termine" || !autoOpen || view.backgroundPending) return;
    const timer = setTimeout(() => router.push(siteHref.cibles(snap.siteId)), REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [snap.status, snap.siteId, router, autoOpen, view.backgroundPending]);

  // Après « Reprendre », on relit l'état tout de suite : l'interrogation repart d'elle-même.
  const resume = async (prev: AuditActionState) => {
    const next = await resumeAction(prev);
    if (next.status === "ok") void refresh();
    return next;
  };
  const [resumeState, resumeForm, resuming] = useActionState(resume, { status: "idle" });

  const [restartNote, setRestartNote] = useState<AuditActionState | null>(null);
  const [restarting, setRestarting] = useState(false);
  const restart = async (key: string) => {
    setRestarting(true);
    try {
      setRestartNote(await restartAction(key));
      void refresh();
    } finally {
      setRestarting(false);
    }
  };
  const relaunch = async () => {
    setRestarting(true);
    try {
      setRestartNote(await relaunchAction());
      void refresh();
    } finally {
      setRestarting(false);
    }
  };

  const failed = snap.status === "echoue";
  // « Fini » pour l'écran : la première liste ET la lecture des autres sites trouvés.
  const finished = snap.status === "termine" && !view.backgroundPending;
  const noTargets = finished && view.targetsCount === 0;

  const failedCard = (
    <Card className="flex flex-col gap-4 border-danger/40 p-5 sm:p-6" data-block="failed">
      <div>
        <h2 role="alert" className="font-display text-xl font-semibold text-balance text-danger">
          {view.failedStep ? S.failedTitleAt(view.failedStep.position) : S.failedTitle}
        </h2>
        <p className="mt-1 text-muted-foreground">{S.failedBody}</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">{S.failedWorked}</dt>
          <dd className="mt-1 text-muted-foreground">
            {view.doneLabels.length ? view.doneLabels.join(", ") : S.failedNothing}
          </dd>
        </div>
        <div>
          <dt className="font-medium">{S.failedStopped}</dt>
          <dd className="mt-1 text-muted-foreground">
            {view.failedStep ? `${view.failedStep.label}. ` : ""}
            {view.failedStep?.error ?? snap.error ?? S.failedGeneric}
          </dd>
        </div>
      </dl>
      <form action={resumeForm} className="flex flex-col gap-2">
        <Button type="submit" disabled={resuming} className="h-12 self-start px-6 text-base">
          {resuming ? S.resuming : S.resume}
        </Button>
        {resumeState.message ? (
          <p
            role="status"
            className={resumeState.status === "error" ? "text-danger" : "text-success"}
          >
            {resumeState.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
  const notes = (
    <>
      {view.slowStart ? (
        <Card
          className="flex flex-col gap-2 border-warning/40 bg-warning/5 p-5"
          data-block="slow-start"
        >
          <h3 className="font-medium">{S.slowStart}</h3>
          <p className="text-sm text-muted-foreground">{S.slowStartBody}</p>
          <Button type="button" disabled={restarting} onClick={relaunch} className="self-start">
            {restarting ? S.restarting : S.slowStartCta}
          </Button>
        </Card>
      ) : null}

      {restartNote?.message ? (
        <p
          role="status"
          className={restartNote.status === "error" ? "text-danger" : "text-success"}
        >
          {restartNote.message}
        </p>
      ) : null}

      {/* Toujours dans la page (vide hors panne) : son apparition ne décale rien et elle est annoncée. */}
      <p role="status" className={cn("text-sm text-muted-foreground", !offline && "sr-only")}>
        {offline ? S.offline : ""}
      </p>
    </>
  );
  const stepsList = (
    <ol className="flex flex-col" aria-label={S.stepsLabel}>
      {view.steps.map((step, i) => (
        <StepRowView
          key={step.key}
          step={step}
          last={i === view.steps.length - 1}
          onRestart={restart}
          busy={restarting}
        />
      ))}
    </ol>
  );

  if (variant === "stage") {
    const funnel = view.funnel;
    return (
      <div className="flex flex-col gap-5" data-analysis-status={snap.status}>
        {failed ? (
          failedCard
        ) : (
          <div className="flex flex-col gap-3" data-block={finished ? "done-bar" : "running"}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3
                role="status"
                aria-live="polite"
                className="font-display text-lg font-semibold text-balance"
              >
                {finished ? t.onboarding.flow.done : view.headline}
              </h3>
              <p className="text-sm text-muted-foreground tabular-nums">
                {S.percent(finished ? 100 : view.percent)}
                {!finished && view.remainingRange && !view.slowStart
                  ? ` · ${S.remaining(view.remainingRange[0], view.remainingRange[1]).toLowerCase()}`
                  : null}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={finished ? 100 : view.percent}
              aria-label={S.progressLabel(finished ? 100 : view.percent)}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
                style={{ width: `${Math.max(finished ? 100 : view.percent, 2)}%` }}
              />
            </div>
          </div>
        )}
        {notes}
        {stepsList}
        {view.targets.length > 0 ? (
          <div className="flex flex-col gap-2" data-block="targets">
            <h3 className="text-[15px] font-semibold">{S.targetsTitle}</h3>
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {view.targets.map((target) => (
                <li
                  key={target.domain}
                  className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 rounded-control border border-border px-3 py-2.5 text-[14.5px]"
                >
                  <span className="min-w-0 font-semibold break-words">{target.domain}</span>
                  {target.why ? (
                    <span className="line-clamp-2 text-right text-[13.5px] text-muted-foreground">
                      {target.why}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {finished ? (
          <div
            className="flex flex-col gap-2.5 rounded-[10px] border border-[#a7dcc6] bg-[#ecfdf5] p-4"
            data-block="done"
          >
            <p className="font-semibold">{t.onboarding.flow.readyTitle(view.targetsCount)}</p>
            <p className="text-sm text-muted-foreground">
              {funnel && funnel.kept !== null && funnel.targets !== null
                ? t.onboarding.flow.readyFunnel(funnel.found, funnel.kept, funnel.targets)
                : S.doneBody(view.targetsCount)}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="h-12 px-6 text-base">
                <Link href={siteHref.cibles(snap.siteId)}>{t.onboarding.flow.readyCta}</Link>
              </Button>
              {autoOpen ? (
                <span className="text-sm text-muted-foreground">{S.redirecting}</span>
              ) : null}
            </div>
          </div>
        ) : failed ? null : view.backgroundPending ? (
          <>
            <p className="text-sm text-muted-foreground" data-continuing>
              {S.continuingBody(view.targetsCount)}
            </p>
            <Button asChild variant="outline" className="self-start">
              <Link href={siteHref.cibles(snap.siteId)}>
                {S.continuingCta}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {emailEnabled ? S.closeWithEmail : S.closeNoEmail}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-analysis-status={snap.status}>
      {finished ? (
        <Card
          className="flex flex-col items-start gap-3 border-success/40 bg-success/5 p-5 sm:p-6"
          data-block="done"
        >
          <h2 role="status" className="font-display text-xl font-semibold text-balance">
            {S.doneTitle(view.targetsCount)}
          </h2>
          <p className="text-muted-foreground">{S.doneBody(view.targetsCount)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="h-12 px-6 text-base">
              <Link href={siteHref.cibles(snap.siteId)}>
                {S.doneCta}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            {autoOpen ? (
              <span className="text-sm text-muted-foreground">{S.redirecting}</span>
            ) : null}
          </div>
        </Card>
      ) : failed ? (
        failedCard
      ) : (
        <Card className="flex flex-col gap-3 p-5 sm:p-6" data-block="running">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            {/* Seule cette phrase est annoncée : elle ne change qu'au passage d'une étape à l'autre. */}
            <h2
              role="status"
              aria-live="polite"
              className="font-display text-xl font-semibold text-balance"
            >
              {view.headline}
            </h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">{S.percent(view.percent)}</span>
              {view.remainingRange && !view.slowStart
                ? ` · ${S.remaining(view.remainingRange[0], view.remainingRange[1])}`
                : null}
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.percent}
            aria-label={S.progressLabel(view.percent)}
            className="h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.max(view.percent, 2)}%` }}
            />
          </div>
          {view.backgroundPending ? (
            <>
              <p className="text-sm text-muted-foreground" data-continuing>
                {S.continuingBody(view.targetsCount)}
              </p>
              <Button asChild variant="outline" className="self-start">
                <Link href={siteHref.cibles(snap.siteId)}>
                  {S.continuingCta}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {emailEnabled ? S.closeWithEmail : S.closeNoEmail}
            </p>
          )}
        </Card>
      )}

      {notes}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {stepsList}

        <div className="flex min-w-0 flex-col gap-6">
          {view.funnel ? (
            <FunnelCard funnel={view.funnel} provisional={view.backgroundPending} />
          ) : null}

          <Card className="flex flex-col gap-3 p-5" data-block="targets">
            <h3 className="font-medium">
              {view.targets.length > 0 ? S.targetsTitle : S.targetsTitleEmpty}
            </h3>
            {view.targets.length === 0 ? (
              noTargets ? (
                <p className="text-sm text-muted-foreground">{S.targetsNone}</p>
              ) : failed ? (
                <p className="text-sm text-muted-foreground">{S.targetsAfterResume}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{S.targetsEmpty}</p>
                  {/* Emplacement réservé : la carte garde sa place en attendant les cibles. */}
                  <div aria-hidden className="flex flex-col gap-2.5 pt-1">
                    <span className="h-3 w-2/3 rounded-full bg-muted" />
                    <span className="h-3 w-11/12 rounded-full bg-muted" />
                    <span className="h-3 w-1/2 rounded-full bg-muted" />
                  </div>
                </>
              )
            ) : (
              <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {view.targets.map((target) => (
                  <li key={target.domain} className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 font-medium break-words">{target.domain}</span>
                      {target.siteType && target.siteType in t.targets.siteTypes ? (
                        <Badge tone="neutral">
                          {t.targets.siteTypes[target.siteType as keyof typeof t.targets.siteTypes]}
                        </Badge>
                      ) : null}
                    </div>
                    {target.why ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {target.why}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
