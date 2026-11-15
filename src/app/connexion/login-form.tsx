"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

/** Formulaire d'email par lien magique, partagé par la connexion et l'inscription. */
export function LoginForm({
  initialError,
  submitLabel = t.auth.submit,
  placeholder,
  large = false,
}: {
  initialError?: string;
  submitLabel?: string;
  placeholder?: string;
  large?: boolean;
}) {
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
        placeholder={placeholder}
        className={`${large ? "h-12 rounded-control px-4 text-base" : "h-10 rounded-md px-3"} border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
      />
      <Button type="submit" disabled={pending} className={large ? "h-12 text-base" : undefined}>
        {submitLabel}
      </Button>
      {message ? (
        <p role="status" className={state.status === "sent" ? "text-success" : "text-danger"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
