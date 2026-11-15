"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import { alertText, detailFlags, statusLabel, type LinkRowView } from "./view";

const L = t.links;

export function LinksSection({
  rows,
  sites,
  declareAction,
}: {
  rows: LinkRowView[];
  sites: { id: string; domain: string }[];
  declareAction: (prev: AuditActionState, formData: FormData) => Promise<AuditActionState>;
}) {
  const [state, formAction, pending] = useActionState(declareAction, { status: "idle" });
  const alerts = rows.filter((r) => r.alert);
  const input = "h-10 rounded-md border border-border bg-card px-3 text-sm";
  return (
    <div className="flex flex-col gap-6">
      {alerts.length > 0 ? (
        <Card className="flex flex-col gap-2 p-4" role="alert">
          <h2 className="font-display text-lg font-semibold">{L.alertsTitle}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {alerts.map((r) => (
              <li key={r.id}>
                <Badge tone="danger">{alertText(r.alert)}</Badge> {r.sourceUrl}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="font-display text-lg font-semibold">{L.declareTitle}</h2>
        <p className="text-sm text-muted-foreground">{L.declareHelp}</p>
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {L.fields.site}
            <select name="site_id" required className={input}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {L.fields.anchor}
            <input name="anchor" maxLength={200} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {L.fields.sourceUrl}
            <input name="source_url" type="url" required className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {L.fields.targetUrl}
            <input name="target_url" type="url" required className={input} />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {L.submit}
            </Button>
            {state.message ? (
              <p role="status" className={state.status === "error" ? "text-danger" : "text-sm"}>
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{L.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const s = statusLabel(r);
            return (
              <li key={r.id}>
                <Card className="flex flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.sourceDomain}</span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    {detailFlags(r).map((f) => (
                      <Badge key={f} tone="neutral">
                        {f}
                      </Badge>
                    ))}
                  </div>
                  <p className="break-all text-sm text-muted-foreground">
                    {r.sourceUrl} → {r.targetUrl}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {L.columns.checks} : {r.checksDone}/3 ·{" "}
                    {r.nextCheckAt
                      ? `${L.columns.next} : ${new Date(r.nextCheckAt).toLocaleDateString("fr-FR")}`
                      : L.done}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
