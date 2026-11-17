import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MailboxSection, type MailboxView } from "@/features/mailboxes/mailbox-section";
import { checkDomainAuth, type AuthCheck } from "@/features/settings/domain-auth";
import { SettingsHeader } from "@/features/settings/header";
import { pickSite, SiteTabs } from "@/features/settings/site-pick";
import { START_HREF } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const S = t.settings.mailbox;
export const metadata: Metadata = { title: S.title };

function Line({ name, state }: { name: "spf" | "dkim" | "dmarc"; state: AuthCheck }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-sm">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
          state === "ok" ? "bg-primary text-primary-foreground" : "bg-warning/15 text-warning"
        }`}
      >
        {state === "ok" ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <TriangleAlert aria-hidden className="size-3" />
        )}
      </span>
      <span>
        <strong>{S.auth[name].name}</strong> : {S.auth[name][state]}
      </span>
    </li>
  );
}

/** Boîte d'envoi : la boîte connectée (ou le formulaire de connexion) et les contrôles anti-spam du domaine. */
async function Mailbox({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { site, sites } = await pickSite(supabase, (await searchParams).site);
  if (!site) redirect(START_HREF);
  const { data: rows } = await supabase
    .from("mailboxes")
    .select(
      "id, email, status, smtp_ok, imap_ok, last_error, smtp_host, health, hourly_cap, daily_cap",
    )
    .eq("site_id", site.id)
    .order("created_at");
  const boxes: MailboxView[] = (rows ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    status: r.status as MailboxView["status"],
    smtpOk: r.smtp_ok,
    imapOk: r.imap_ok,
    lastError: r.last_error,
    smtpHost: r.smtp_host,
    health: (r.health as MailboxView["health"]) ?? null,
    hourlyCap: r.hourly_cap,
    dailyCap: r.daily_cap,
  }));
  // Le domaine contrôlé est celui de la boîte connectée ; à défaut, celui du site.
  const domain = boxes[0]?.email.split("@")[1] ?? site.domain;
  const authState = await checkDomainAuth(domain);
  return (
    <>
      <SiteTabs sites={sites} current={site.id} base="/app/reglages/boite" />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <MailboxSection siteId={site.id} boxes={boxes} />
        <Card className="p-5">
          <h2 className="mb-2 font-semibold">{S.authTitle(domain)}</h2>
          <ul>
            <Line name="spf" state={authState.spf} />
            <Line name="dkim" state={authState.dkim} />
            <Line name="dmarc" state={authState.dmarc} />
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">{S.authNote}</p>
        </Card>
      </div>
    </>
  );
}

export default function Page(props: { searchParams: Promise<{ site?: string }> }) {
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title={S.title} description={S.description} />
      <Suspense>
        <Mailbox searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
