"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import {
  isLocked,
  NOTIFICATION_GROUPS,
  type NotificationKey,
  type NotificationPrefs,
} from "./notification-keys";

const N = t.notifications;

/**
 * Les notifications par famille (maquette validée : docs/mockups/notifications.html). Un interrupteur
 * par email, enregistré dès qu'on le change ; les emails de fonctionnement du compte n'en ont pas.
 */
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
    <div className="flex max-w-3xl flex-col gap-6">
      {NOTIFICATION_GROUPS.map((group) => (
        <section key={group.key} aria-labelledby={`notif-${group.key}`}>
          <h2 id={`notif-${group.key}`} className="font-semibold">
            {N.groups[group.key].title}
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">{N.groups[group.key].body}</p>
          <Card className="px-5 py-1">
            <ul>
              {group.rows.map((k) => (
                <li
                  key={k}
                  className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{N.items[k].title}</p>
                    <p className="text-sm text-muted-foreground">{N.items[k].body}</p>
                    <p className="text-sm">{N.items[k].when}</p>
                  </div>
                  {isLocked(k) ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">
                      {N.always}
                    </span>
                  ) : (
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
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
      {error ? (
        <p role="status" className="text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">{N.note}</p>
    </div>
  );
}
