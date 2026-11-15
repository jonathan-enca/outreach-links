import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/features/classification/types";
import { listInbox } from "@/features/inbox/service";
import { isInboxView, VIEWS, type InboxView } from "@/features/inbox/views";
import { NAV_ITEMS } from "@/lib/navigation";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.pages.inbox.title };

async function Inbox({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const { vue } = await searchParams;
  const view: InboxView = isInboxView(vue) ? vue : "chaud";
  const { rows, counts } = await listInbox(supabase);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    const copy = t.pages.inbox;
    const Icon = NAV_ITEMS.find((i) => i.key === "inbox")!.icon;
    return (
      <EmptyState icon={Icon} title={copy.emptyTitle} body={copy.emptyBody} hint={copy.emptyHint} />
    );
  }
  const shown = rows.filter((r) => r.view === view);
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Vues" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={`/app/inbox?vue=${v}`}
            aria-current={v === view ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${v === view ? "bg-primary text-primary-foreground" : ""}`}
          >
            {t.inbox.views[v]} ({counts[v]})
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="text-muted-foreground">{t.inbox.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.fromEmail ?? r.toEmail}</span>
                  <Badge tone="neutral">{CATEGORY_LABELS[r.validatedCategory ?? r.category]}</Badge>
                  {r.needsReview ? <Badge tone="warning">{t.inbox.toReview}</Badge> : null}
                  {r.draftStatus === "brouillon" ? (
                    <Badge tone="neutral">{t.inbox.drafts}</Badge>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{r.excerpt}</p>
                <Link href={`/app/inbox/${r.id}`} className="text-sm underline">
                  {t.inbox.open}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Page(props: { searchParams: Promise<{ vue?: string }> }) {
  return (
    <>
      <PageHeader title={t.pages.inbox.title} description={t.inbox.intro} />
      <Suspense>
        <Inbox searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
