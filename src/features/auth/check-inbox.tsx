"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { resendLinkAction } from "./actions";
import type { AuthState } from "./service";

const idle: AuthState = { status: "idle" };

/** Écran qui remplace le formulaire une fois l'email parti : on sait quoi faire ensuite. */
export function CheckInbox({
  email,
  kind,
  onOtherAddress,
}: {
  email: string;
  kind: "signup" | "reset";
  onOtherAddress: () => void;
}) {
  const c = t.auth.checkInbox;
  const [before, after] = c[kind].split("{email}");
  const [resent, resend, pending] = useActionState(resendLinkAction, idle);
  return (
    <div role="status" className="flex flex-col gap-5">
      <span
        aria-hidden
        className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"
      >
        <Mail className="size-6" />
      </span>
      <h2 className="text-3xl font-bold leading-tight tracking-tight">
        {kind === "signup" ? c.signupTitle : c.title}
      </h2>
      <p className="text-lg text-muted-foreground">
        {before}
        <strong className="break-words text-foreground">{email}</strong>
        {after}
      </p>
      <p className="text-sm text-muted-foreground">{c.spam}</p>
      <div className="flex flex-col gap-3 border-t border-border pt-5 text-sm">
        <div className="flex flex-wrap gap-3">
          <form action={resend}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="kind" value={kind} />
            <Button type="submit" variant="outline" disabled={pending} className="h-11">
              {c.resend}
            </Button>
          </form>
          <Button type="button" variant="outline" onClick={onOtherAddress} className="h-11">
            {c.otherAddress}
          </Button>
        </div>
        {resent.message ? (
          <p
            role={resent.status === "error" ? "alert" : "status"}
            className={resent.status === "error" ? "text-danger" : "text-success"}
          >
            {resent.message}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          {c.haveAccount}{" "}
          <Link href="/connexion" className="font-medium text-primary underline underline-offset-4">
            {c.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
