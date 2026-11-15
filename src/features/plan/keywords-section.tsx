"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { KeywordChoiceView } from "./keywords";

/**
 * MT.2a : objectif et mots-clés dans le Plan de liens. En autorité générale, une simple note ; en
 * mode mots-clés, le choix parmi les mots-clés réels du site (lus dans l'audit, 0 USD).
 */
export function KeywordsSection({
  view,
  save,
}: {
  view: KeywordChoiceView;
  save: (prev: AuditActionState, form: FormData) => Promise<AuditActionState>;
}) {
  const k = t.plan.keywords;
  const [state, action, pending] = useActionState(save, { status: "idle" });

  if (view.goal === "autorite_generale") {
    return (
      <Card className="flex flex-col gap-1 p-6">
        <h2 className="font-display text-xl font-semibold">{k.authority.title}</h2>
        <p className="text-muted-foreground">{k.authority.body}</p>
      </Card>
    );
  }

  const chosen = new Set(view.selected);
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold">{k.title}</h2>
        <p className="mt-1 text-muted-foreground">
          {k.body.replace("{max}", String(view.maxSelected))}
        </p>
      </div>
      {view.choices.length === 0 ? (
        <p className="text-muted-foreground">{k.empty}</p>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{k.title}</legend>
            <ul className="flex flex-col divide-y divide-border">
              {view.choices.map((c, i) => (
                <li key={c.keyword} className="py-2 first:pt-0 last:pb-0">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="keyword"
                      value={c.keyword}
                      defaultChecked={chosen.has(c.keyword)}
                      className="mt-1"
                      data-testid={`keyword-${i}`}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{c.keyword}</span>
                      <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge tone="neutral">
                          {k.position.replace("{n}", String(c.position))}
                        </Badge>
                        <span>{k.volume.replace("{n}", c.volume.toLocaleString("fr-FR"))}</span>
                        <span className="break-all">{c.url}</span>
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Button type="submit" className="self-start" disabled={pending}>
              {pending ? k.saving : k.save}
            </Button>
            {state.message ? (
              <p
                role="status"
                className={state.status === "error" ? "text-danger" : "text-success"}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      )}
    </Card>
  );
}
