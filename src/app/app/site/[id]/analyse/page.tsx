import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AuditContent } from "@/features/audits/audit-content";
import { loadSiteWithAudit, siteHref, UUID_RE } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.audits.analysisTitle };

async function Analyse({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapes?: string }>;
}) {
  const { id } = await params;
  const { etapes } = await searchParams;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const found = await loadSiteWithAudit(supabase, id);
  if (!found) notFound();
  // Pas encore d'analyse : la personne est en cours d'onboarding.
  if (!found.audit) redirect(siteHref.relecture(id));
  return <AuditContent id={found.audit.id} showSteps={etapes === "1"} />;
}

export default function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapes?: string }>;
}) {
  return (
    <Suspense>
      <Analyse params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
