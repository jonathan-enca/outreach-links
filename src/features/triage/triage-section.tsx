"use client";

import { useActionState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { TriageView } from "./service";

const TONES: Record<string, BadgeTone> = {
  ok: "success",
  non_verifiable: "warning",
  pending: "neutral",
};

/** Résumé chiffré du tri : à contacter / écartées / à relire. */
export function summarizeView(view: Pick<TriageView, "rows">) {
  const ok = view.rows.filter((r) => r.verdict === "ok").length;
  return {
    ok,
    excluded: view.rows.length - ok,
    review: view.rows.filter((r) => r.needsReview).length,
  };
}

export function TriageSection({
  view,
  startAction,
}: {
  view: TriageView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const m = t.triage;
  const [state, formAction, pending] = useActionState(startAction, { status: "idle" });
  const byItem = new Map(view.rows.map((r) => [r.itemId, r]));
  const canStart = view.status === "aucun" || view.status === "echoue";
  const sum = summarizeView(view);

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{m.title}</h2>
      <p className="text-muted-foreground">{m.body}</p>
      <p className="text-sm text-muted-foreground">
        {m.version.replace("{version}", String(view.version))}
      </p>
      {view.status === "echoue" ? (
        <p className="text-danger">
          {m.failed}
          {view.error ? ` : ${view.error}` : ""}
        </p>
      ) : null}
      {view.status === "en_cours" ? <p role="status">{m.running}</p> : null}
      {canStart ? (
        <form action={formAction} className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? m.starting : m.start}
          </Button>
          {state.message ? (
            <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
      {view.rows.length > 0 ? (
        <>
          <p className="font-semibold">
            {m.summary
              .replace("{ok}", String(sum.ok))
              .replace("{excluded}", String(sum.excluded))
              .replace("{review}", String(sum.review))}
          </p>
          {view.costUsd > 0 ? (
            <p className="text-sm text-muted-foreground">
              {m.cost.replace("{cost}", view.costUsd.toFixed(4))}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {view.items.map((item) => {
              const r = byItem.get(item.id);
              const key = r?.verdict ?? "pending";
              return (
                <li key={item.id} className="flex flex-col gap-1 border-t pt-3 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.domain}</span>
                    <Badge tone={TONES[key] ?? "danger"}>
                      {m.verdicts[key as keyof typeof m.verdicts]}
                    </Badge>
                    {r?.needsReview ? <Badge tone="warning">{m.review}</Badge> : null}
                  </div>
                  {r ? <p className="text-sm">{r.reason}</p> : null}
                  {r?.hook ? (
                    <p className="text-sm text-muted-foreground">
                      {m.hook} : « {r.hook} »
                    </p>
                  ) : null}
                  {r?.urlOrigin === "accueil" && r.verdict === "ok" ? (
                    <p className="text-sm text-muted-foreground">{m.pageFallback}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
