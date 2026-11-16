"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import type { StartState } from "./service";

const inputClass =
  "h-12 w-full rounded-control border border-border bg-card px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";

/** Le seul champ de l'onboarding : l'adresse du site. */
export function UrlForm({
  action,
  defaultUrl = "",
}: {
  action: (prev: StartState, formData: FormData) => Promise<StartState>;
  defaultUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const o = t.onboarding;
  const invalid = state.status === "error";
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <label htmlFor="url" className="text-sm font-medium">
        {o.urlLabel}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="url"
          name="url"
          required
          defaultValue={defaultUrl}
          autoFocus
          autoComplete="url"
          inputMode="url"
          placeholder={o.urlPlaceholder}
          className={inputClass}
          aria-invalid={invalid}
          aria-describedby={invalid ? "url-error" : "url-hint"}
        />
        <Button type="submit" disabled={pending} className="h-12 px-6 text-base sm:shrink-0">
          {pending ? o.submitting : o.submit}
        </Button>
      </div>
      <p id="url-hint" className="text-sm text-muted-foreground">
        {o.urlHint}
      </p>
      {invalid && state.message ? (
        <p id="url-error" role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
