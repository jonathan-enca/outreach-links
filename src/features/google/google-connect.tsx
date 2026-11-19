"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";

const g = t.mailboxes.google;

function Result() {
  const code = useSearchParams().get("google");
  if (!code) return null;
  const ok = code === "ok";
  const text = ok ? g.ok : (g.errors[code as keyof typeof g.errors] ?? g.errors.invalide);
  return (
    <p role={ok ? "status" : "alert"} className={ok ? "text-sm" : "text-sm text-destructive"}>
      {text}
    </p>
  );
}

/** Bouton « Connecter avec Google » (G1) : un lien, l'autorisation se fait sur l'écran de Google. */
export function GoogleConnect({ siteId }: { siteId: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <h3 className="font-semibold">{g.title}</h3>
      <p className="text-sm text-muted-foreground">{g.hint}</p>
      <div>
        <Button asChild>
          <a href={`/api/google/start?site=${encodeURIComponent(siteId)}`}>{g.button}</a>
        </Button>
      </div>
      <Suspense fallback={null}>
        <Result />
      </Suspense>
    </div>
  );
}
