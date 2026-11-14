"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as { digest?: string }).digest)
      : "";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold">{t.errors.errorTitle}</h1>
      <p className="text-muted-foreground">{t.errors.errorBody}</p>
      {digest ? (
        <p className="text-sm text-muted-foreground">
          {t.errors.reference} : <code>{digest}</code>
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button onClick={() => retry()}>{t.errors.retry}</Button>
        <Button asChild variant="outline">
          <Link href="/">{t.errors.backHome}</Link>
        </Button>
      </div>
    </main>
  );
}
