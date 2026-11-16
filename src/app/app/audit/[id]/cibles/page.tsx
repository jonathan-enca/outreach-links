import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  setFounderRoleAction,
  startCollectionAction,
  startFindingsAction,
  startQualificationAction,
  validateRequestsAction,
} from "@/features/targets/actions";
import { loadTargets } from "@/features/targets/service";
import { TargetsScreen } from "@/features/targets/targets-screen";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: t.targets.title };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TargetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const view = await loadTargets(supabase, createServiceClient, id);
  if (!view) notFound();
  return (
    <>
      <PageHeader title={t.targets.title} description={t.targets.description} />
      <p className="mb-4">
        <Link href={`/app/audit/${id}`} className="underline underline-offset-4">
          {t.targets.back}
        </Link>
      </p>
      <TargetsScreen
        view={view}
        auditId={id}
        actions={{
          startCollection: startCollectionAction.bind(null, id),
          startQualification: startQualificationAction.bind(null, id),
          startFindings: startFindingsAction.bind(null, id),
          saveFounder: setFounderRoleAction.bind(null, id),
          validate: validateRequestsAction.bind(null, id),
        }}
      />
    </>
  );
}
