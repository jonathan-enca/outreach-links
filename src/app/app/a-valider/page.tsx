import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  approveMessagesAction,
  approveReplyAction,
  completeFormAction,
  editMessageAction,
  editReplyAction,
  rejectReplyAction,
} from "@/features/approvals/actions";
import { ApprovalQueue } from "@/features/approvals/queue";
import { loadQueue } from "@/features/approvals/service";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

const V = t.toValidate;
export const metadata: Metadata = { title: V.title };

/** « À valider » : la file unique de ce qui attend l'accord de la personne, toutes campagnes confondues. */
async function Queue() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  return (
    <ApprovalQueue
      view={await loadQueue(supabase)}
      actions={{
        approveMessages: approveMessagesAction,
        editMessage: editMessageAction,
        approveReply: approveReplyAction,
        editReply: editReplyAction,
        rejectReply: rejectReplyAction,
        completeForm: completeFormAction,
      }}
    />
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {V.eyebrow}
        </p>
        <h1 className="font-display text-2xl font-bold">{V.title}</h1>
        <p className="max-w-2xl text-muted-foreground">{V.description}</p>
      </div>
      <Suspense>
        <Queue />
      </Suspense>
    </div>
  );
}
