import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  moveOpportunityAction,
  saveTargetKeywordsAction,
  selectOpportunityAction,
  validatePlanAction,
} from "@/features/plan/actions";
import { loadKeywordChoice } from "@/features/plan/keywords";
import { KeywordsSection } from "@/features/plan/keywords-section";
import { PlanEditor } from "@/features/plan/plan-editor";
import { loadPlan } from "@/features/plan/service";
import { ContactsSection } from "@/features/contacts/contacts-section";
import { DraftsSection } from "@/features/drafting/drafts-section";
import { startDraftsAction } from "@/features/drafting/actions";
import { loadDrafts } from "@/features/drafting/service";
import { startContactsAction } from "@/features/contacts/actions";
import { loadContacts } from "@/features/contacts/service";
import { startTriageAction } from "@/features/triage/actions";
import { loadTriage } from "@/features/triage/service";
import { TriageSection } from "@/features/triage/triage-section";
import { BatchesSection } from "@/features/batches/batches-section";
import { loadBatches } from "@/features/batches/service";
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
  const keywordChoice = await loadKeywordChoice(supabase, id);
  const triage = await loadTriage(supabase, id);
  const contacts = await loadContacts(supabase, id);
  const drafts = await loadDrafts(supabase, id);
  const batches = await loadBatches(supabase, id);
  return (
    <>
      <PageHeader title={t.plan.title} description={t.plan.description} />
      <p className="mb-4">
        <Link href={`/app/audit/${id}`} className="underline underline-offset-4">
          {t.plan.back}
        </Link>
      </p>
      {keywordChoice ? (
        <div className="mb-6">
          <KeywordsSection view={keywordChoice} save={saveTargetKeywordsAction.bind(null, id)} />
        </div>
      ) : null}
      <PlanEditor
        view={view}
        select={selectOpportunityAction.bind(null, id)}
        move={moveOpportunityAction.bind(null, id)}
        validate={validatePlanAction.bind(null, id)}
      />
      {triage ? (
        <div className="mt-6">
          <TriageSection view={triage} startAction={startTriageAction.bind(null, id)} />
        </div>
      ) : null}
      {contacts && contacts.triageDone ? (
        <div className="mt-6">
          <ContactsSection view={contacts} startAction={startContactsAction.bind(null, id)} />
        </div>
      ) : null}
      {drafts && drafts.contactsDone ? (
        <div className="mt-6">
          <DraftsSection view={drafts} startAction={startDraftsAction.bind(null, id)} />
        </div>
      ) : null}
      {batches && batches.draftsDone ? (
        <div className="mt-6">
          <BatchesSection view={batches} auditId={id} />
        </div>
      ) : null}
    </>
  );
}
