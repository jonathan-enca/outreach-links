import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setPrefAction } from "@/features/settings/actions";
import { SettingsHeader } from "@/features/settings/header";
import { NotificationToggles } from "@/features/settings/notification-toggles";
import { loadPrefs } from "@/features/settings/notifications";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const N = t.notifications;
export const metadata: Metadata = { title: N.title };

async function Prefs() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { prefs } = await loadPrefs(supabase);
  return <NotificationToggles prefs={prefs} save={setPrefAction} />;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title={N.title} description={N.description} />
      <Suspense>
        <Prefs />
      </Suspense>
    </div>
  );
}
