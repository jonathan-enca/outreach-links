import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { env } from "@/env";
import { cancelEnvoiAction, setSendingPausedAction } from "@/features/envois/actions";
import { EnvoisScreen, type EnvoiRow } from "@/features/envois/envois-view";
import { loadEnvois } from "@/features/envois/service";
import { selectedSiteId } from "@/features/shell/current-site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Envois" };

const dateLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/** « Envois » : ce qui est programmé, ce qui est parti, et la suspension. */
async function Envois() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const view = await loadEnvois(supabase, {
    now: new Date(),
    realSending: !env.EMAIL_DRY_RUN && env.OUTREACH_SENDING_ENABLED,
    siteId: await selectedSiteId(supabase),
  });
  const scheduled: EnvoiRow[] = view.scheduled.map((s) => ({
    id: s.draftId,
    draftId: s.draftId,
    primary: s.when,
    secondary: `${s.email} · ${s.domain}${s.campaign ? ` · ${s.campaign}` : ""}`,
    subject: s.subject,
  }));
  const sent: EnvoiRow[] = view.sent.map((s) => ({
    id: s.id,
    primary: s.email,
    secondary: `Envoyé le ${dateLabel(s.sentAt)}`,
    subject: s.subject,
  }));
  return (
    <EnvoisScreen
      scheduled={scheduled}
      sent={sent}
      paused={view.paused}
      boxes={view.boxes}
      queueNote={view.queueNote}
      actions={{ cancel: cancelEnvoiAction, setPaused: setSendingPausedAction }}
    />
  );
}

export default function Page() {
  return (
    <>
      <PageHeader
        title="Envois"
        description="Les emails programmés, leur heure de départ, ce qui est parti. Vous pouvez annuler ou suspendre à tout moment."
      />
      <Suspense>
        <Envois />
      </Suspense>
    </>
  );
}
