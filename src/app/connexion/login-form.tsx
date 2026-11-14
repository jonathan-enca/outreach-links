"use client";

import { useActionState } from "react";
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
        className="rounded border border-zinc-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-2 text-white disabled:opacity-60"
      >
        {t.auth.submit}
      </button>
      {message ? (
        <p role="status" className={state.status === "sent" ? "text-green-700" : "text-red-700"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
