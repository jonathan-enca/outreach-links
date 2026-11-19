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
export function GoogleConnect({ siteId, upgrade = false }: { siteId: string; upgrade?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <h3 className="font-semibold">{upgrade ? g.upgradeTitle : g.title}</h3>
      <p className="text-sm text-muted-foreground">{upgrade ? g.upgradeHint : g.hint}</p>
      <div>
        <Button asChild>
          <a href={`/api/google/start?site=${encodeURIComponent(siteId)}`}>
            <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.7 7l7.3 5.7c4.3-4 6.8-9.9 6.8-17.2z"
              />
              <path
                fill="#FBBC05"
                d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.300-5.700c-2 1.400-4.700 2.200-8.600 2.200-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"
              />
            </svg>
            {g.button}
          </a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{g.safe}</p>
      <Suspense fallback={null}>
        <Result />
      </Suspense>
    </div>
  );
}
