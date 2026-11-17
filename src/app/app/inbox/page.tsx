import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { approveReplyAction, editReplyAction } from "@/features/approvals/actions";
import { markReadAction, setTagAction } from "@/features/conversations/actions";
import { Conversations } from "@/features/conversations/conversations";
import { loadConversations } from "@/features/conversations/service";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const C = t.conversations;
export const metadata: Metadata = { title: C.title };

/** « Conversations » : tous les fils de la personne, avec filtres, non lus et étiquettes. */
async function Threads() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  return (
    <Conversations
      view={await loadConversations(supabase)}
      actions={{
        markRead: markReadAction,
        setTag: setTagAction,
        approveReply: approveReplyAction,
        editReply: editReplyAction,
      }}
    />
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
