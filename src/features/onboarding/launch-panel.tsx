"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandFields } from "@/features/brand/brand-fields";
import { t } from "@/lib/messages";
import type { LaunchPreview, LaunchState } from "./service";

const inputClass =
  "h-10 w-full rounded-control border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const GOALS = [
  { value: "autorite_generale", key: "authority" },
  { value: "mots_cles", key: "keywords" },
] as const;

/**
 * Écran « ce que nous avons compris + coût total » : thème, objectif et profil modifiables, puis UNE
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
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">{r.goal.legend}</legend>
          {GOALS.map((g) => (
            <label
              key={g.value}
              className="flex cursor-pointer items-start gap-3 rounded-control border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-muted"
            >
              <input
                type="radio"
                name="goal"
                value={g.value}
                defaultChecked={preview.goal === g.value}
                className="mt-1"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {r.goal[g.key].label}
                  {g.key === "authority" ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({r.goal.authority.badge})
                    </span>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">{r.goal[g.key].body}</span>
              </span>
            </label>
          ))}
          <p className="text-sm text-muted-foreground">{r.goal.hint}</p>
        </fieldset>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">{r.queriesTitle}</h3>
          <p className="text-sm text-muted-foreground">{r.queriesNote}</p>
        </div>
      </Card>

      <BrandFields key={preview.brand?.version ?? 0} brand={preview.brand} />

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
          <h2 className="text-xl font-semibold">{r.launchCard.title}</h2>
          <p className="text-muted-foreground">{r.launchCard.body}</p>
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
