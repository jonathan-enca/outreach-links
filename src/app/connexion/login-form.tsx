"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);
  const message = state.message ?? initialError;
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        {t.auth.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="h-10 rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <Button type="submit" disabled={pending}>
        {t.auth.submit}
      </Button>
      {message ? (
        <p role="status" className={state.status === "sent" ? "text-success" : "text-danger"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
