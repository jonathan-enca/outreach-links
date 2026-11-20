import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { JourneySteps } from "@/features/shell/journey-steps";
import type { JourneyStep } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { cn } from "@/lib/utils";

export type StageState = "current" | "done" | "todo";

/** Ancre de chaque étape sur la page : la barre du haut y mène, la navigation d'une étape à l'autre aussi. */
export const stageAnchor = (n: number) => `etape-${n}`;

const STAGE_KEYS = ["site", "verification", "vous", "analyse"] as const;

/**
 * Le haut commun aux quatre étapes (maquette du 20/11) : barre d'étapes collante, titre et phrase
 * d'introduction. Les étapes finies de la barre mènent à leur bloc sur la page.
 */
export function JourneyTop({ current }: { current: 1 | 2 | 3 | 4 }) {
  const links: Partial<Record<JourneyStep, string>> = {};
  STAGE_KEYS.forEach((key, i) => {
    if (i + 1 < current) links[key] = `#${stageAnchor(i + 1)}`;
  });
  return (
    <>
      <div className="sticky top-0 z-10 -mt-3 bg-background pt-3 pb-1">
        <JourneySteps current={STAGE_KEYS[current - 1]!} links={links} />
      </div>
      <PageHeader title={t.onboarding.title} description={t.onboarding.flow.lead} />
    </>
  );
}

/**
 * Un bloc d'étape : en cours (ouvert), fait (une ligne de résumé et « Modifier ») ou à venir (titre
 * grisé, bordure en pointillés). `keepMounted` garde le contenu dans la page quand le bloc est replié :
 * les champs d'un formulaire partagé entre deux étapes restent envoyés.
 */
export function Stage({
  n,
  state,
  summary,
  editHref,
  onEdit,
  keepMounted = false,
  children,
}: {
  n: number;
  state: StageState;
  summary?: string;
  editHref?: string;
  onEdit?: () => void;
  keepMounted?: boolean;
  children?: ReactNode;
}) {
  const f = t.onboarding.flow;
  const title = t.journey.steps[STAGE_KEYS[n - 1]!];
  const headingId = `${stageAnchor(n)}-titre`;
  const editClass =
    "inline-flex h-[34px] shrink-0 items-center rounded-control border border-border bg-card px-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  return (
    <section
      id={stageAnchor(n)}
      aria-labelledby={headingId}
      data-stage={n}
      data-stage-state={state}
      className={cn(
        "scroll-mt-16 rounded-[14px] border",
        state === "todo" && "border-dashed border-border",
        state === "done" && "border-border bg-card",
        state === "current" &&
          "border-[#b8c6dc] bg-card shadow-[0_10px_30px_-22px_rgb(0_48_112/0.5)]",
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4">
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold",
            state === "todo" && "bg-muted text-muted-foreground",
            state === "done" && "bg-primary text-primary-foreground",
            state === "current" && "bg-primary/10 text-primary ring-2 ring-primary",
          )}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={headingId}
            className={cn(
              "text-[17px]",
              state === "todo" ? "font-medium text-muted-foreground" : "font-semibold",
            )}
          >
            {title}
          </h2>
          {state === "done" && summary ? (
            <p className="mt-0.5 text-sm break-words text-muted-foreground" data-stage-summary>
              {summary}
            </p>
          ) : null}
        </div>
        {state === "done" && editHref ? (
          <Link href={editHref} className={editClass}>
            {f.edit}
          </Link>
        ) : state === "done" && onEdit ? (
          <button type="button" onClick={onEdit} className={editClass}>
            {f.edit}
          </button>
        ) : null}
      </div>
      {state === "current" || keepMounted ? (
        <div hidden={state !== "current"} className="flex flex-col gap-5 px-5 pb-6 sm:pl-[60px]">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Une ligne de la fiche : libellé, valeur, et « Modifier » qui ouvre le champ (le champ reste envoyé). */
export function FactList({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-[10px] border border-border">
      {children}
    </div>
  );
}
