import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.sites.title };

async function Sites() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { data: sites } = await supabase
    .from("sites")
    .select("id, domain, niche")
    .order("created_at", { ascending: true });

  if (!sites?.length) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState icon={Globe} title={t.sites.listEmptyTitle} body={t.sites.listEmptyBody} />
        <Button asChild>
          <Link href="/app/site/nouveau">{t.sites.add}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {sites.map((s) => (
          <li key={s.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-col gap-1">
                <strong>{s.domain}</strong>
                <span className="text-sm text-muted-foreground">{s.niche}</span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/site/${s.id}`}>{t.sites.manage}</Link>
              </Button>
            </Card>
          </li>
        ))}
      </ul>
      <Button asChild className="self-start">
        <Link href="/app/site/nouveau">{t.sites.add}</Link>
      </Button>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <PageHeader title={t.sites.title} description={t.sites.description} />
      <Suspense>
        <Sites />
      </Suspense>
    </>
  );
}
