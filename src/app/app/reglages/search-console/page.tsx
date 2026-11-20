import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { disconnectSearchConsoleAction } from "@/features/search-console/actions";
import { readSearchConsoleStatus, searchConsoleEnabled } from "@/features/search-console/load";
import { SettingsHeader } from "@/features/settings/header";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const S = t.settings.searchConsole;
export const metadata: Metadata = { title: S.title };

/** Une carte par site : connecter, changer de compte ou déconnecter. Une connexion par site. */
async function Sites() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { data } = await supabase
    .from("sites")
    .select("id, domain")
    .order("created_at", { ascending: true });
  const sites = data ?? [];
  if (sites.length === 0) return <p className="text-sm text-muted-foreground">{S.noSite}</p>;
  const enabled = searchConsoleEnabled();
  const db = createServiceClient();
  const statuses = await Promise.all(
    sites.map((s) => (enabled ? readSearchConsoleStatus(db, s.id) : Promise.resolve(null))),
  );
  return (
    <div className="flex flex-col gap-3">
      {enabled ? null : <p className="text-sm text-muted-foreground">{S.unavailable}</p>}
      {sites.map((s, i) => {
        const st = statuses[i] ?? null;
        return (
          <Card key={s.id} className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{s.domain}</p>
                <p className="text-sm text-muted-foreground">
                  {st ? S.connected(st.property, st.googleEmail) : S.notConnected}
                </p>
              </div>
              <div className="flex gap-2">
                {enabled ? (
                  <Button asChild size="sm" variant={st ? "outline" : "default"}>
                    <a href={`/api/google/start?site=${s.id}&purpose=search_console`}>
                      {st ? S.reconnect : S.connect}
                    </a>
                  </Button>
                ) : null}
                {st ? (
                  <form action={disconnectSearchConsoleAction.bind(null, s.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      {S.disconnect}
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/** Retour de Google (`?sc=…`) : même formulation que la carte du site. */
function Result({ code }: { code: string | undefined }) {
  if (!code) return null;
  const ok = code === "ok";
  const text = ok
    ? t.searchConsole.ok
    : (t.searchConsole.errors[code as keyof typeof t.searchConsole.errors] ??
      t.searchConsole.errors.invalide);
  return (
    <p role={ok ? "status" : "alert"} className={ok ? "text-sm" : "text-sm text-destructive"}>
      {text}
    </p>
  );
}

export default async function Page(props: { searchParams: Promise<{ sc?: string }> }) {
  const { sc } = await props.searchParams;
  return (
    <div className="flex flex-col gap-5">
      <SettingsHeader title={S.title} description={S.description} />
      <Result code={sc} />
      <Suspense>
        <Sites />
      </Suspense>
    </div>
  );
}
