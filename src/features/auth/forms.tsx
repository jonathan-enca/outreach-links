"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { forgotPasswordAction, resetPasswordAction, signInAction, signUpAction } from "./actions";
import { CheckInbox } from "./check-inbox";
import { Field, inputClass, PasswordField } from "./fields";
import { PASSWORD_MIN_LENGTH, type AuthState } from "./service";

const idle: AuthState = { status: "idle" };

function Message({ state, fallback }: { state: AuthState; fallback?: string }) {
  const text = state.message ?? fallback;
  if (!text) return null;
  const good = state.status === "ok" || state.status === "confirm";
  return (
    <p role={good ? "status" : "alert"} className={good ? "text-success" : "text-danger"}>
      {text}
    </p>
  );
}

const submitClass = "h-12 w-full text-base";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, idle);
  const [dismissed, setDismissed] = useState<AuthState | null>(null);
  const f = t.signup.fields;
  if (state.status === "confirm" && state.email && dismissed !== state) {
    return (
      <CheckInbox email={state.email} kind="signup" onOtherAddress={() => setDismissed(state)} />
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field id="name" label={f.name}>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          placeholder={f.namePlaceholder}
          className={inputClass}
        />
      </Field>
      <Field id="email" label={f.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={f.emailPlaceholder}
          className={inputClass}
        />
      </Field>
      <PasswordField
        label={f.password}
        placeholder={f.passwordPlaceholder}
        hint={f.passwordHint}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
      />
      <Button type="submit" disabled={pending} className={submitClass}>
        {t.signup.submit}
      </Button>
      <Message state={state} />
    </form>
  );
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(signInAction, idle);
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field id="email" label={t.auth.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <PasswordField label={t.auth.password} autoComplete="current-password" />
        <Link
          href="/mot-de-passe-oublie"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.auth.forgotLink}
        </Link>
      </div>
      <Button type="submit" disabled={pending} className={submitClass}>
        {t.auth.submit}
      </Button>
      <Message state={state} fallback={initialError} />
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, idle);
  const [dismissed, setDismissed] = useState<AuthState | null>(null);
  if (state.status === "ok" && state.email && dismissed !== state) {
    return (
      <CheckInbox email={state.email} kind="reset" onOtherAddress={() => setDismissed(state)} />
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field id="email" label={t.auth.email}>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </Field>
      <Button type="submit" disabled={pending} className={submitClass}>
        {t.auth.forgot.submit}
      </Button>
      <Message state={state} />
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, idle);
  return (
    <form action={action} className="flex flex-col gap-5">
      <PasswordField
        label={t.auth.reset.password}
        hint={t.signup.fields.passwordHint}
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
      />
      <Button type="submit" disabled={pending} className={submitClass}>
        {t.auth.reset.submit}
      </Button>
      <Message state={state} />
    </form>
  );
}
