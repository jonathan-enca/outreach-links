"use client";

import { useActionState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { PlanView } from "./service";

type Act = (prev: AuditActionState, form: FormData) => Promise<AuditActionState>;

const tone = (p: string): BadgeTone =>
  p === "haute" ? "success" : p === "moyenne" ? "warning" : "neutral";

function RowActions({
  id,
  retained,
  first,
  last,
  select,
  move,
}: {
  id: string;
  retained: boolean;
  first: boolean;
  last: boolean;
  select: Act;
  move: Act;
}) {
  const p = t.plan;
  const [, selAction, selPending] = useActionState(select, { status: "idle" });
  const [, moveAction, movePending] = useActionState(move, { status: "idle" });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={selAction}>
        <input type="hidden" name="opportunityId" value={id} />
        <input type="hidden" name="selected" value={retained ? "0" : "1"} />
        <Button
          type="submit"
          size="sm"
          variant={retained ? "outline" : "default"}
          disabled={selPending}
        >
          {retained ? p.discard : p.retain}
        </Button>
      </form>
      {retained ? (
        <form action={moveAction} className="flex gap-1">
          <input type="hidden" name="opportunityId" value={id} />
          <Button
            type="submit"
            name="dir"
            value="up"
            size="sm"
            variant="outline"
            disabled={movePending || first}
            aria-label={p.up}
          >
            ↑
          </Button>
          <Button
            type="submit"
            name="dir"
            value="down"
            size="sm"
            variant="outline"
            disabled={movePending || last}
            aria-label={p.down}
          >
            ↓
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Écran Plan de liens (M2.3) : retenir, ordonner, valider. Rien ne part sans validation. */
export function PlanEditor({
  view,
  select,
  move,
  validate,
}: {
  view: PlanView;
  select: Act;
  move: Act;
  validate: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const p = t.plan;
  const [state, validateAction, pending] = useActionState(validate, { status: "idle" });
  const retained = view.items.filter((i) => i.status === "retenu");
  const lastVersion = view.versions[0];

  if (!view.ready) return <Card className="p-6 text-muted-foreground">{p.notReady}</Card>;
  if (view.items.length === 0) return <Card className="p-6">{p.none}</Card>;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold">{p.summary.title}</h2>
        <p className="text-muted-foreground">{p.summary.body}</p>
        <p>
          <strong>{retained.length}</strong> {p.summary.retained} / {view.items.length}{" "}
          {p.summary.proposed}
        </p>
        {lastVersion ? (
          <p className="text-sm text-muted-foreground">
            {p.summary.lastVersion
              .replace("{version}", String(lastVersion.version))
              .replace("{count}", String(lastVersion.itemCount))
              .replace("{date}", new Date(lastVersion.validatedAt).toLocaleDateString("fr-FR"))}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{p.summary.neverValidated}</p>
        )}
        <form action={validateAction} className="flex flex-col gap-2">
          <Button type="submit" className="self-start" disabled={pending || retained.length === 0}>
            {pending ? p.validating : p.validate}
          </Button>
          {state.message ? (
            <p role="status" className={state.status === "error" ? "text-danger" : "text-success"}>
              {state.message}
            </p>
          ) : null}
        </form>
        <p className="text-xs text-muted-foreground">{p.summary.note}</p>
      </Card>

      <Card className="flex flex-col gap-2 p-6">
        <ol className="flex flex-col divide-y divide-border">
          {view.items.map((i) => {
            const isRetained = i.status === "retenu";
            const idx = retained.findIndex((r) => r.id === i.id);
            return (
              <li key={i.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isRetained ? <span className="font-semibold">{idx + 1}.</span> : null}
                  <span className="font-medium">{i.domain}</span>
                  <Badge tone="neutral">
                    {t.opportunities.types[i.type as keyof typeof t.opportunities.types] ?? i.type}
                  </Badge>
                  <Badge tone={tone(i.priority)}>
                    {t.opportunities.priorities[
                      i.priority as keyof typeof t.opportunities.priorities
                    ] ?? i.priority}
                  </Badge>
                  {i.status === "ecarte" ? <Badge tone="neutral">{p.discarded}</Badge> : null}
                  {i.urlExact ? null : <Badge tone="neutral">{p.partialUrl}</Badge>}
                </div>
                <p className="text-sm">{i.rationale}</p>
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  <dt className="text-muted-foreground">{p.target}</dt>
                  <dd className="break-all">{i.targetPageUrl}</dd>
                  <dt className="text-muted-foreground">{p.anchor}</dt>
                  <dd>
                    « {i.anchor.text} »{" "}
                    <span className="text-muted-foreground">({p.anchorKinds[i.anchor.kind]})</span>
                  </dd>
                  <dt className="text-muted-foreground">{p.offer}</dt>
                  <dd>{i.offer ?? p.noOffer}</dd>
                </dl>
                <RowActions
                  id={i.id}
                  retained={isRetained}
                  first={idx === 0}
                  last={idx === retained.length - 1}
                  select={select}
                  move={move}
                />
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
