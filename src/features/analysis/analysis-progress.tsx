"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Circle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { StepStatus } from "./steps";
import { buildAnalysisView, type AnalysisSnapshot, type StepView } from "./view";

const POLL_MS = 3000;
/** Délai avant d'ouvrir « Vos cibles » : le temps de voir que c'est fini. */
const REDIRECT_MS = 4000;
const S = t.analysis.screen;

function StepIcon({ status }: { status: StepStatus }) {
  const base = "size-5 shrink-0";
  if (status === "termine") return <Check aria-hidden className={cn(base, "text-success")} />;
  if (status === "en_cours")
    return <Loader2 aria-hidden className={cn(base, "text-primary motion-safe:animate-spin")} />;
  if (status === "echoue") return <AlertTriangle aria-hidden className={cn(base, "text-danger")} />;
  return <Circle aria-hidden className={cn(base, "text-muted-foreground/50")} />;
}

function StepRowView({
  step,
  onRestart,
  busy,
}: {
  step: StepView;
  onRestart: (key: string) => void;
  busy: boolean;
}) {
  const active = step.status === "en_cours";
  const [armed, setArmed] = useState(false);
  return (
    <li
      data-step={step.key}
      data-status={step.status}
      className={cn(
        "flex gap-3 rounded-lg px-3 py-3",
        active && "bg-primary/5 ring-1 ring-primary/20",
        step.status === "echoue" && "bg-danger/5 ring-1 ring-danger/30",
      )}
    >
      <span className="mt-0.5">
        <StepIcon status={step.status} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span
            className={cn(
              "font-medium",
              step.status === "attente" && "text-muted-foreground",
              step.status === "echoue" && "text-danger",
            )}
          >
            {step.label}
          </span>
          <span className="text-sm text-muted-foreground">{S.stepState[step.status]}</span>
        </div>
        {step.counter ? <p className="mt-0.5 text-sm tabular-nums">{step.counter}</p> : null}
        {step.example && step.status !== "echoue" ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{step.example}</p>
        ) : null}
        {step.missed ? (
          <p className="mt-1 text-sm text-warning" data-missed>
            {step.missed}
          </p>
        ) : null}
        {step.error ? <p className="mt-1 text-sm text-danger">{step.error}</p> : null}
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

/**
 * L'écran « Analyse en cours » (MU.3) : les huit étapes avancent en direct (route d'état interrogée
 * toutes les 3 secondes, sans rechargement), l'avancement global et le temps restant, le tri en
 * chiffres, les premières cibles ; en échec, ce qui a marché et un bouton « Reprendre » ; à la fin,
 * ouverture automatique de « Vos cibles ». Fermer puis rouvrir la page retrouve l'état (tout est en base).
 */
export function AnalysisProgress({
  initial,
  resumeAction,
  restartAction,
  relaunchAction,
  emailEnabled,
}: {
  initial: AnalysisSnapshot;
  resumeAction: (prev: AuditActionState) => Promise<AuditActionState>;
  /** « Reprendre à partir d'ici » (chantier A.2). */
  restartAction: (stepKey: string) => Promise<AuditActionState>;
  /** Démarrage bloqué : relance l'événement (chantier A.4). */
  relaunchAction: () => Promise<AuditActionState>;
  emailEnabled: boolean;
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

  // Interroge la route légère tant que l'analyse tourne ; s'arrête à la fin ou à l'échec.
  useEffect(() => {
    if (!view.active) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [view.active, refresh]);

  // Fin : on laisse voir « terminée », puis « Vos cibles » s'ouvre seul.
  useEffect(() => {
    if (snap.status !== "termine") return;
    const timer = setTimeout(() => router.push(siteHref.cibles(snap.siteId)), REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [snap.status, snap.siteId, router]);

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
  const finished = snap.status === "termine";
  const waiting =
    view.active && view.percent === 0 && snap.steps.every((s) => s.status === "attente");
  const hidden = Math.max(0, view.targetsCount - view.targets.length);

  return (
    <div className="flex flex-col gap-6" data-analysis-status={snap.status}>
      {finished ? (
        <Card className="flex flex-col items-start gap-3 border-success/40 bg-success/5 p-6">
          <h2 className="font-display text-xl font-semibold">{S.doneTitle}</h2>
          <p className="text-muted-foreground">{S.doneBody(view.targetsCount)}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="h-12 px-6 text-base">
              <Link href={siteHref.cibles(snap.siteId)}>
                {S.doneCta}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <span role="status" className="text-sm text-muted-foreground">
              {S.redirecting}
            </span>
          </div>
        </Card>
      ) : failed ? (
        <Card className="flex flex-col gap-4 border-danger/40 p-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-danger">{S.failedTitle}</h2>
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
      ) : (
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p role="status" aria-live="polite" className="font-display text-xl font-semibold">
              {waiting ? S.starting : S.percent(view.percent)}
            </p>
            {view.remainingMinutes !== null ? (
              <p className="text-sm text-muted-foreground">{S.remaining(view.remainingMinutes)}</p>
            ) : null}
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.percent}
            aria-label={S.percent(view.percent)}
            className="h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${Math.max(view.percent, 2)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {emailEnabled ? S.closeWithEmail : S.closeNoEmail}
          </p>
        </Card>
      )}

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

      {offline ? (
        <p role="status" className="text-sm text-muted-foreground">
          {S.offline}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ol className="flex flex-col gap-1" aria-label={t.analysis.screen.intro}>
          {view.steps.map((step) => (
            <StepRowView key={step.key} step={step} onRestart={restart} busy={restarting} />
          ))}
        </ol>

        <div className="flex flex-col gap-6">
          {view.funnel ? (
            <Card className="flex flex-col gap-3 p-5" data-block="funnel">
              <h3 className="font-medium">{S.funnelTitle}</h3>
              <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <li className="tabular-nums">{S.funnelExamined(view.funnel.examined)}</li>
                {view.funnel.afterSort !== null ? (
                  <>
                    <li aria-hidden className="text-muted-foreground">
                      →
                    </li>
                    <li className="tabular-nums">{S.funnelAfterSort(view.funnel.afterSort)}</li>
                  </>
                ) : null}
                {view.funnel.targets !== null ? (
                  <>
                    <li aria-hidden className="text-muted-foreground">
                      →
                    </li>
                    <li className="font-medium tabular-nums">
                      {S.funnelTargets(view.funnel.targets)}
                    </li>
                  </>
                ) : null}
              </ul>
            </Card>
          ) : null}

          <Card className="flex flex-col gap-3 p-5" data-block="targets">
            <h3 className="font-medium">{S.targetsTitle}</h3>
            {view.targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{S.targetsEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {view.targets.map((target) => (
                  <li key={target.domain} className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{target.domain}</span>
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
            {hidden > 0 ? (
              <p className="text-sm text-muted-foreground">{S.targetsMore(hidden)}</p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
