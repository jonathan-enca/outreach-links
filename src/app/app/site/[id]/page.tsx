import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { MailboxSection, type MailboxView } from "@/features/mailboxes/mailbox-section";
import { updateSiteAction } from "@/features/sites/actions";
import { SiteForm } from "@/features/sites/site-form";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.sites.editTitle };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Site({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { data: site } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  if (!site) notFound();
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
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <SiteForm
          action={updateSiteAction.bind(null, site.id)}
          submitLabel={t.sites.save}
          defaults={{
            domain: site.domain,
            niche: site.niche ?? "",
            country: site.country ?? "FR",
            language: site.language,
            signatureFirstName: site.signature_first_name ?? "",
            offeredAsset: site.offered_asset ?? "",
            senderEmail: site.sender_email ?? "",
            priorityQueries: site.priority_queries,
          }}
        />
      </Card>
      <MailboxSection siteId={site.id} boxes={boxes} />
    </div>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title={t.sites.editTitle} description={t.sites.description} />
      <Suspense>
        <Site params={props.params} />
      </Suspense>
      <p className="mt-4">
        <Link href="/app/site" className="text-primary underline">
          {t.sites.back}
        </Link>
      </p>
    </>
  );
}
