"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import { t } from "@/lib/messages";
import type { LaunchPreview, LaunchState } from "./service";

const inputClass =
  "h-10 w-full rounded-control border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Écran « ce que nous avons compris + coût total » : thème et recherches modifiables, puis UNE
 * confirmation qui lance tout le parcours. Le coût affiché est renvoyé au serveur, qui refuse de
 * lancer si le coût recalculé le dépasse.
 */
export function LaunchPanel({
  preview,
  action,
  saveAction,
}: {
  preview: LaunchPreview;
  action: (prev: LaunchState, formData: FormData) => Promise<LaunchState>;
  /** Utilisée tant qu'aucune recherche n'est connue : enregistre, puis l'écran affiche le coût. */
  saveAction: (prev: LaunchState, formData: FormData) => Promise<LaunchState>;
}) {
  const r = t.onboarding.review;
  const needsInput = preview.queries.length === 0;
  const [state, formAction, pending] = useActionState(needsInput ? saveAction : action, {
    status: "idle",
  });
  const nothingDeduced = needsInput;
  const slots = [0, 1, 2].map((i) => preview.queries[i] ?? "");
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-xl font-semibold">{r.title}</h2>
          <p className="mt-1 text-muted-foreground">{nothingDeduced ? r.emptyDeduction : r.body}</p>
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
          <dt className="text-muted-foreground">{r.domain}</dt>
          <dd className="font-medium">{preview.domain}</dd>
        </dl>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="theme" className="text-sm font-medium">
            {r.theme}
          </label>
          <input
            id="theme"
            name="theme"
            required
            defaultValue={preview.theme}
            className={inputClass}
            aria-describedby="theme-hint"
          />
          <p id="theme-hint" className="text-sm text-muted-foreground">
            {r.themeHint}
          </p>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">{r.queries}</legend>
          {slots.map((q, i) => (
            <input
              key={i}
              name={`query${i + 1}`}
              defaultValue={q}
              aria-label={`${r.query} ${i + 1}`}
              className={inputClass}
            />
          ))}
          <p className="text-sm text-muted-foreground">{r.queriesHint}</p>
        </fieldset>
      </Card>

      {needsInput ? (
        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="h-12 self-start px-6 text-base">
            {r.seeCost}
          </Button>
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
        </div>
      ) : (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-xl font-semibold">{r.cost.title}</h2>
          <p className="text-muted-foreground">{r.cost.body}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:max-w-md">
            <dt className="text-muted-foreground">{t.audits.chain.discovery}</dt>
            <dd>{formatUsd(preview.chain.discoveryUsd)}</dd>
            <dt className="text-muted-foreground">{t.audits.chain.backlinks}</dt>
            <dd>{formatUsd(preview.chain.backlinksUsd)}</dd>
            <dt className="text-muted-foreground">{t.audits.chain.profile}</dt>
            <dd>{formatUsd(preview.chain.profileUsd)}</dd>
            <dt className="text-muted-foreground">{t.audits.chain.opportunities}</dt>
            <dd>{formatUsd(preview.chain.opportunitiesUsd)}</dd>
            <dt className="font-medium">{r.cost.total}</dt>
            <dd className="font-semibold">{formatUsd(preview.totalUsd)}</dd>
            <dt className="text-muted-foreground">{r.cost.capNote}</dt>
            <dd>{formatUsd(preview.capUsd)}</dd>
          </dl>
          {preview.chain.uncovered.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.audits.chain.uncovered} (
              {preview.chain.uncovered.map((k) => t.audits.chain.stage[k]).join(", ")})
            </p>
          ) : null}
          <input type="hidden" name="acceptedUsd" value={preview.totalUsd} />
          <Button type="submit" disabled={pending} className="mt-1 h-12 self-start px-6 text-base">
            {pending ? r.launching : r.launch}
          </Button>
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          ) : null}
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-medium">{r.later.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{r.later.body}</p>
      </Card>
    </form>
  );
}
