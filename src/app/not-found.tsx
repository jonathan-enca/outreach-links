import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-6xl font-semibold text-primary">404</p>
      <h1 className="font-display text-2xl font-semibold">{t.errors.notFoundTitle}</h1>
      <p className="text-muted-foreground">{t.errors.notFoundBody}</p>
      <Button asChild>
        <Link href="/">{t.errors.backHome}</Link>
      </Button>
    </main>
  );
}
