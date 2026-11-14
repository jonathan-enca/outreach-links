"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import type { VerifyState } from "./service";
import { FILE_PATH, metaTag } from "./verification-constants";

export function VerificationPanel({
  domain,
  token,
  verified,
  action,
}: {
  domain: string;
  token: string;
  verified: boolean;
  action: (prev: VerifyState) => Promise<VerifyState>;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const v = t.sites.verify;
  const isVerified = verified || state.status === "verified";

  if (isVerified) {
    return (
      <Card className="flex flex-col gap-1 p-6">
        <h2 className="font-display text-xl font-semibold text-success">{v.done}</h2>
        <p className="text-muted-foreground">{v.doneBody}</p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-display text-xl font-semibold">{v.title}</h2>
      <p className="text-muted-foreground">{v.body}</p>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{v.metaTitle}</h3>
        <p className="text-sm text-muted-foreground">{v.metaBody}</p>
        <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">
          {metaTag(token)}
        </code>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{v.fileTitle}</h3>
        <p className="text-sm text-muted-foreground">{v.fileBody}</p>
        <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">
          https://{domain}
          {FILE_PATH}
        </code>
        <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">{token}</code>
      </div>
      <form action={formAction} className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="self-start">
          {v.button}
        </Button>
        {state.message ? (
          <p
            role="status"
            className={
              state.status === "failed" || state.status === "error" ? "text-danger" : "text-success"
            }
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
