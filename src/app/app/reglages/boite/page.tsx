import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { googleConfig } from "@/features/google/config";
import { loadMailboxes } from "@/features/mailboxes/load";
import { MailboxSection } from "@/features/mailboxes/mailbox-section";
import { saveMessagesAction } from "@/features/settings/actions";
import { SettingsHeader } from "@/features/settings/header";
import { pickSite, SiteTabs } from "@/features/settings/site-pick";
import { SignatureSection } from "@/features/settings/signature-section";
import { START_HREF } from "@/features/shell/next-step";
import { isFounderRole } from "@/features/targets/types";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const S = t.settings.mailbox;
export const metadata: Metadata = { title: S.title };

/** Boîte d'envoi : la boîte connectée, puis la signature du site (celle que reçoivent les éditeurs). */
async function Mailbox({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { site, sites } = await pickSite(supabase, (await searchParams).site);
  if (!site) redirect(START_HREF);
  const { boxes, available } = await loadMailboxes(supabase, site.id);
  return (
    <>
      <SiteTabs sites={sites} current={site.id} base="/app/reglages/boite" />
      <MailboxSection
        siteId={site.id}
        boxes={boxes}
        available={available}
        googleEnabled={googleConfig() !== null}
      />
      <SignatureSection
        key={site.id}
        domain={site.domain}
        firstName={site.signature_first_name ?? ""}
        lastName={site.signature_last_name ?? ""}
        role={isFounderRole(site.founder_role) ? site.founder_role : null}
        showSite={site.signature_show_site}
        linkedinUrl={site.signature_linkedin_url ?? ""}
        phone={site.signature_phone ?? ""}
        logoUrl={site.signature_logo_token ? `/api/logo/${site.signature_logo_token}` : null}
        save={saveMessagesAction.bind(null, site.id)}
      />
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
