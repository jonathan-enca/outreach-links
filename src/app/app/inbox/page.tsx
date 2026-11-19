import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { approveReplyAction, editReplyAction } from "@/features/approvals/actions";
import {
  cancelSendAction,
  markReadAction,
  setArchivedAction,
  setTagAction,
} from "@/features/conversations/actions";
import { Conversations } from "@/features/conversations/conversations";
import { loadConversations } from "@/features/conversations/service";
import { queueNoteText } from "@/features/sending/queue-note";
import { selectedSiteId } from "@/features/shell/current-site";
import { env } from "@/env";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const C = t.conversations;
export const metadata: Metadata = { title: C.title };
const noteLink =
  "rounded-control font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** « Conversations » : tous les fils de la personne, avec filtres, non lus et étiquettes. */
async function Threads() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const view = await loadConversations(supabase, {
    now: new Date(),
    realSending: !env.EMAIL_DRY_RUN && env.OUTREACH_SENDING_ENABLED,
    siteId: await selectedSiteId(supabase),
  });
  const note = view.queue;
  return (
    <>
      {note ? (
        <div className="rounded-card border border-info/30 bg-info/10 p-4 text-sm">
          <p className="font-medium text-info">{queueNoteText(note)}</p>
          {note.state === "sans_boite" ? (
            <p className="mt-1">
              <Link href="/app/reglages/boite" className={noteLink}>
                {C.queue.connect}
              </Link>
            </p>
          ) : !("hours" in note) ? null : (
            <p className="mt-1 text-muted-foreground">
              {C.queue.rhythm(note.hours)}{" "}
              <Link href="/app/reglages/boite" className={noteLink}>
                {C.queue.edit}
              </Link>
            </p>
          )}
        </div>
      ) : null}
      <Conversations
        view={view}
        actions={{
          markRead: markReadAction,
          setArchived: setArchivedAction,
          setTag: setTagAction,
          approveReply: approveReplyAction,
          editReply: editReplyAction,
          cancelSend: cancelSendAction,
        }}
      />
    </>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {C.eyebrow}
        </p>
        <h1 className="font-display text-2xl font-bold">{C.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{C.description}</p>
      </div>
      <Suspense>
        <Threads />
      </Suspense>
    </div>
  );
}
