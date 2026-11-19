"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import type { SearchConsoleStatus } from "./load";

const s = t.searchConsole;

function Result() {
  const code = useSearchParams().get("sc");
  if (!code) return null;
  const ok = code === "ok";
  const text = ok ? s.ok : (s.errors[code as keyof typeof s.errors] ?? s.errors.invalide);
  return (
    <p role={ok ? "status" : "alert"} className={ok ? "text-sm" : "text-sm text-destructive"}>
      {text}
    </p>
  );
}

/**
 * MQ.2 : carte « Search Console » de la page du site, juste avant la boîte d'envoi (même place, même
 * formulation : facultatif, fortement conseillé). Lecture seule. Affichée seulement si le drapeau est ouvert.
 */
export function SearchConsoleConnect({
  siteId,
  status,
}: {
  siteId: string;
  status: SearchConsoleStatus | null;
}) {
  return (
    <div id="search-console" className="flex flex-col gap-2 rounded-md border border-border p-4">
      <h3 className="font-semibold">{s.title}</h3>
      {status ? (
        <>
          <p className="text-sm">{s.connected}</p>
          <p className="text-xs text-muted-foreground">
            {s.connectedBy(status.property, status.googleEmail)}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{s.hint}</p>
          <div>
            <Button asChild>
              <a
                href={`/api/google/start?site=${encodeURIComponent(siteId)}&purpose=search_console`}
              >
                {s.button}
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{s.safe}</p>
        </>
      )}
      <Suspense fallback={null}>
        <Result />
      </Suspense>
    </div>
  );
}
