import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AuditContent } from "@/features/audits/audit-content";
import { loadSiteWithAudit, siteHref, UUID_RE } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.audits.analysisTitle };

async function Analyse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const found = await loadSiteWithAudit(supabase, id);
  if (!found) notFound();
  // Pas encore d'analyse : la personne est en cours d'onboarding.
  if (!found.audit) redirect(siteHref.relecture(id));
  return <AuditContent id={found.audit.id} />;
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <Analyse params={props.params} />
    </Suspense>
  );
}
