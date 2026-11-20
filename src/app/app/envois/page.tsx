import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { env } from "@/env";
import { cancelEnvoiAction, setSendingPausedAction } from "@/features/envois/actions";
import { EnvoisScreen } from "@/features/envois/envois-view";
import {
  fromLabel,
  hoursLabel,
  nextLabel,
  scheduledRows,
  sentRows,
} from "@/features/envois/format";
import { loadEnvois } from "@/features/envois/service";
import { selectedSiteId } from "@/features/shell/current-site";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.envois.title };

/** « Emails » : l'état des envois et les quotas, ce qui est programmé, ce qui est parti. */
async function Envois() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const now = new Date();
  const view = await loadEnvois(supabase, {
    now,
    realSending: !env.EMAIL_DRY_RUN && env.OUTREACH_SENDING_ENABLED,
    siteId: await selectedSiteId(supabase),
  });
  return (
    <EnvoisScreen
      state={view.state}
      scheduled={scheduledRows(view.scheduled, view.timezone, now)}
      sent={sentRows(view.sent, view.timezone, now)}
      sentTotal={view.sentTotal}
      hours={view.window ? hoursLabel(view.window) : null}
      from={fromLabel(view.provider, view.fromEmail)}
      next={view.nextAt ? nextLabel(view.nextAt, view.timezone) : null}
      day={view.day}
      dayLimited={view.dayLimited}
      warmingUp={view.warmingUp}
      week={view.week}
      month={view.month}
      actions={{ cancel: cancelEnvoiAction, setPaused: setSendingPausedAction }}
    />
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title={t.envois.title} description={t.envois.description} />
      <Suspense>
        <Envois />
      </Suspense>
    </>
  );
}
