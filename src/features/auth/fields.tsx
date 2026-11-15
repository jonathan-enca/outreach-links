"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/messages";

export const inputClass =
  "h-12 w-full rounded-control border border-border bg-card px-4 text-base placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Champ mot de passe avec l'œil : affiche ou masque la saisie. */
export function PasswordField({
  id = "password",
  label,
  placeholder,
  hint,
  autoComplete,
  minLength,
}: {
  id?: string;
  label: string;
  placeholder?: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Field id={id} label={label} hint={hint}>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={shown ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          aria-label={shown ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          {shown ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      </div>
    </Field>
  );
}
