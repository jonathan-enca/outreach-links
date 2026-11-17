"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import {
  LIVE_NOTIFICATIONS,
  NOTIFICATION_KEYS,
  type NotificationKey,
  type NotificationPrefs,
} from "./notification-keys";

const N = t.notifications;

/** Un interrupteur par notification, enregistré dès qu'on le change. */
export function NotificationToggles({
  prefs,
  save,
}: {
  prefs: NotificationPrefs;
  save: (key: string, on: boolean) => Promise<AuditActionState>;
}) {
  const [values, setValues] = useState(prefs);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const toggle = (k: NotificationKey) => {
    const next = !values[k];
    setValues((v) => ({ ...v, [k]: next }));
    start(async () => {
      const r = await save(k, next);
      if (r.status === "error") {
        setValues((v) => ({ ...v, [k]: !next }));
        setError(r.message ?? N.messages.saveError);
      } else setError(null);
    });
  };
  return (
    <>
      <Card className="max-w-3xl px-5 py-1">
        <ul>
          {NOTIFICATION_KEYS.map((k) => (
            <li
              key={k}
              className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {N.items[k].title}{" "}
                  {LIVE_NOTIFICATIONS.includes(k) ? null : (
                    <Badge tone="neutral" className="ml-1 align-middle">
                      {N.soon}
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{N.items[k].body}</p>
                <p className="text-sm">{N.items[k].when}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={values[k]}
                aria-label={N.items[k].title}
                onClick={() => toggle(k)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
                  values[k] ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white transition-[left] motion-reduce:transition-none ${
                    values[k] ? "left-[1.375rem]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {error ? (
        <p role="status" className="text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">{N.note}</p>
    </>
  );
}
