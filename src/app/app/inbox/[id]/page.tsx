import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { getThread } from "@/features/inbox/service";
import { ThreadView } from "@/features/inbox/thread-view";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: t.pages.inbox.title };

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const thread = await getThread(supabase, id);
  if (!thread) notFound();
  const { data: inb } = await supabase
    .from("inbound_messages")
    .select("body_excerpt")
    .eq("sent_message_id", thread.row.sentMessageId)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return <ThreadView thread={thread} theirBody={inb?.body_excerpt ?? thread.row.excerpt} />;
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title={t.pages.inbox.title} description={t.inbox.intro} />
      <Link href="/app/inbox" className="mb-4 inline-block text-sm underline">
        {t.inbox.back}
      </Link>
      <Suspense>
        <Thread params={props.params} />
      </Suspense>
    </>
  );
}
