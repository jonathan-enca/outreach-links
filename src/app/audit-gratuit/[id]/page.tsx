import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportCookieName } from "@/features/public-audit/cookie";
import { AuditForm } from "@/features/public-audit/audit-form";
import { AutoRefresh } from "@/features/public-audit/auto-refresh";
import { EmailGate } from "@/features/public-audit/email-gate";
import { projectReport } from "@/features/public-audit/report";
import { ReportView } from "@/features/public-audit/report-view";
import { loadPublicAudit } from "@/features/public-audit/service";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";

// Page privée par son identifiant : jamais indexée.
export const metadata: Metadata = {
  title: t.publicAudit.report.title,
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const token = (await cookies()).get(reportCookieName(id))?.value;
  const audit = await loadPublicAudit(createServiceClient(), id, token);
  if (!audit) notFound();
  const p = t.publicAudit;

  if (audit.status === "en_attente" || audit.status === "en_cours") {
    return (
      <Card className="flex flex-col gap-1 p-6">
        <AutoRefresh />
        <h2 className="font-display text-xl font-semibold">{p.wait.title}</h2>
        <p className="text-muted-foreground">{p.wait.body}</p>
      </Card>
    );
  }

  if (audit.status === "echoue" || !audit.result) {
    const reasons = p.failed.reasons as Record<string, string>;
    return (
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold text-danger">{p.failed.title}</h2>
        <p className="text-muted-foreground">
          {reasons[audit.errorCode ?? ""] ?? p.failed.reasons.defaut}
        </p>
        {audit.errorCode === "aucun_mot_cle" ? <AuditForm fixedDomain={audit.domain} /> : null}
        <div>
          <Button asChild variant="outline">
            <Link href="/">{p.failed.back}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const view = projectReport(audit.result, audit.unlocked);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{p.report.period}</p>
      <ReportView view={view} />
      {view.unlocked ? null : <EmailGate auditId={audit.id} />}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold">{p.cta.title}</h2>
        <p className="text-muted-foreground">{p.cta.body}</p>
        <div>
          <Button asChild>
            <Link href="/connexion">{p.cta.signIn}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

async function Title({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return null;
  const audit = await loadPublicAudit(createServiceClient(), id, undefined);
  return audit ? <span>{audit.domain}</span> : null;
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <Link href="/" className="font-display text-lg font-semibold text-primary">
          {t.app.name}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t.publicAudit.report.title}{" "}
          <Suspense>
            <Title params={props.params} />
          </Suspense>
        </h1>
      </header>
      <Suspense>
        <Report params={props.params} />
      </Suspense>
    </main>
  );
}
