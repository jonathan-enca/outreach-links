import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  cancelFollowUpAction,
  completeFollowUpAction,
  completeTaskAction,
  skipTaskAction,
} from "@/features/tasks/actions";
import { selectedSiteId } from "@/features/shell/current-site";
import { listTasks } from "@/features/tasks/service";
import { TasksSection } from "@/features/tasks/tasks-section";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.pages.taches.title };

async function Tasks() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const rows = await listTasks(supabase, await selectedSiteId(supabase));
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-6">
        <h2 className="font-display text-lg font-semibold">{t.pages.taches.emptyTitle}</h2>
        <p className="text-muted-foreground">{t.pages.taches.emptyBody}</p>
      </div>
    );
  }
  return (
    <TasksSection
      rows={rows}
      now={new Date()}
      actions={{
        complete: completeTaskAction,
        followUp: completeFollowUpAction,
        cancel: cancelFollowUpAction,
        skip: skipTaskAction,
      }}
    />
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title={t.pages.taches.title} description={t.pages.taches.description} />
      <Suspense>
        <Tasks />
      </Suspense>
    </>
  );
}
