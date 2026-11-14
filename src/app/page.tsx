import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuditForm } from "@/features/public-audit/audit-form";
import { t } from "@/lib/messages";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-5 px-4 py-10">
      <p className="font-display text-lg font-semibold text-primary">{t.app.name}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">{t.home.title}</h1>
      <p className="text-lg text-muted-foreground">{t.home.subtitle}</p>
      <AuditForm />
      <div>
        <Button asChild variant="outline">
          <Link href="/connexion">{t.home.signIn}</Link>
        </Button>
      </div>
    </main>
  );
}
