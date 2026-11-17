import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { saveMessagesAction } from "@/features/settings/actions";
import { SettingsHeader } from "@/features/settings/header";
import { MessagesForm } from "@/features/settings/messages-form";
import { pickSite, SiteTabs } from "@/features/settings/site-pick";
import { isCounterpart } from "@/features/signature/signature";
import { START_HREF } from "@/features/shell/next-step";
import { isFounderRole } from "@/features/targets/types";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const S = t.settings.yourMessages;
export const metadata: Metadata = { title: S.title };

async function Messages({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { site, sites } = await pickSite(supabase, (await searchParams).site);
  if (!site) redirect(START_HREF);
  return (
    <>
      <SiteTabs sites={sites} current={site.id} base="/app/reglages/messages" />
      <MessagesForm
        key={site.id}
        domain={site.domain}
        firstName={site.signature_first_name ?? ""}
        lastName={site.signature_last_name ?? ""}
        role={isFounderRole(site.founder_role) ? site.founder_role : null}
        showSite={site.signature_show_site}
        linkedinUrl={site.signature_linkedin_url ?? ""}
        phone={site.signature_phone ?? ""}
        logoUrl={site.signature_logo_token ? `/api/logo/${site.signature_logo_token}` : null}
        counterparts={site.counterparts.filter(isCounterpart)}
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
        <Messages searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
