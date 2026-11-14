import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  moveOpportunityAction,
  selectOpportunityAction,
  validatePlanAction,
} from "@/features/plan/actions";
import { PlanEditor } from "@/features/plan/plan-editor";
import { loadPlan } from "@/features/plan/service";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.plan.title };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const view = await loadPlan(supabase, id);
  if (!view) notFound();
  return (
    <>
      <PageHeader title={t.plan.title} description={t.plan.description} />
      <p className="mb-4">
        <Link href={`/app/audit/${id}`} className="underline underline-offset-4">
          {t.plan.back}
        </Link>
      </p>
      <PlanEditor
        view={view}
        select={selectOpportunityAction.bind(null, id)}
        move={moveOpportunityAction.bind(null, id)}
        validate={validatePlanAction.bind(null, id)}
      />
    </>
  );
}
