"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import type { SiteFormState } from "./service";

export interface SiteFormDefaults {
  domain: string;
  niche: string;
  country: string;
  language: string;
  signatureFirstName: string;
  offeredAsset: string;
  senderEmail: string;
  priorityQueries: string[];
}

export const EMPTY_DEFAULTS: SiteFormDefaults = {
  domain: "",
  niche: "",
  country: "FR",
  language: "fr",
  signatureFirstName: "",
  offeredAsset: "",
  senderEmail: "",
  priorityQueries: [],
};

const inputClass =
  "h-10 w-full rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[invalid=true]:border-danger";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
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
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SiteForm({
  action,
  defaults = EMPTY_DEFAULTS,
  submitLabel,
}: {
  action: (prev: SiteFormState, formData: FormData) => Promise<SiteFormState>;
  defaults?: SiteFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const e = state.errors ?? {};
  const f = t.sites.fields;
  const describe = (id: string, hasHint: boolean, hasError: boolean) =>
    [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field id="domain" label={f.domain} hint={f.domainHint} error={e.domain}>
        <input
          id="domain"
          name="domain"
          required
          defaultValue={defaults.domain}
          autoComplete="url"
          inputMode="url"
          className={inputClass}
          aria-invalid={Boolean(e.domain)}
          aria-describedby={describe("domain", true, Boolean(e.domain))}
        />
      </Field>
      <Field id="niche" label={f.niche} hint={f.nicheHint} error={e.niche}>
        <input
          id="niche"
          name="niche"
          required
          defaultValue={defaults.niche}
          className={inputClass}
          aria-invalid={Boolean(e.niche)}
          aria-describedby={describe("niche", true, Boolean(e.niche))}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="country" label={f.country} error={e.country}>
          <select
            id="country"
            name="country"
            defaultValue={defaults.country}
            className={inputClass}
          >
            {Object.entries(t.sites.countries).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="language" label={f.language} error={e.language}>
          <select
            id="language"
            name="language"
            defaultValue={defaults.language}
            className={inputClass}
          >
            {Object.entries(t.sites.languages).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        id="signatureFirstName"
        label={f.signatureFirstName}
        hint={f.signatureHint}
        error={e.signatureFirstName}
      >
        <input
          id="signatureFirstName"
          name="signatureFirstName"
          required
          defaultValue={defaults.signatureFirstName}
          autoComplete="given-name"
          className={inputClass}
          aria-invalid={Boolean(e.signatureFirstName)}
          aria-describedby={describe("signatureFirstName", true, Boolean(e.signatureFirstName))}
        />
      </Field>
      <Field
        id="offeredAsset"
        label={f.offeredAsset}
        hint={f.offeredAssetHint}
        error={e.offeredAsset}
      >
        <textarea
          id="offeredAsset"
          name="offeredAsset"
          required
          rows={3}
          defaultValue={defaults.offeredAsset}
          className={`${inputClass} h-auto py-2`}
          aria-invalid={Boolean(e.offeredAsset)}
          aria-describedby={describe("offeredAsset", true, Boolean(e.offeredAsset))}
        />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">{f.queries}</legend>
        <p id="queries-hint" className="text-sm text-muted-foreground">
          {f.queriesHint}
        </p>
        {[1, 2, 3].map((n) => (
          <input
            key={n}
            name={`query${n}`}
            aria-label={`${f.query} ${n}`}
            aria-describedby="queries-hint"
            aria-invalid={Boolean(e.priorityQueries)}
            defaultValue={defaults.priorityQueries[n - 1] ?? ""}
            className={inputClass}
          />
        ))}
        {e.priorityQueries ? <p className="text-sm text-danger">{e.priorityQueries}</p> : null}
      </fieldset>
      <Field id="senderEmail" label={f.senderEmail} hint={f.senderEmailHint} error={e.senderEmail}>
        <input
          id="senderEmail"
          name="senderEmail"
          type="email"
          defaultValue={defaults.senderEmail}
          autoComplete="email"
          className={inputClass}
          aria-invalid={Boolean(e.senderEmail)}
          aria-describedby={describe("senderEmail", true, Boolean(e.senderEmail))}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending} className="self-start">
          {submitLabel}
        </Button>
        {state.message ? (
          <p role="status" className={state.status === "saved" ? "text-success" : "text-danger"}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
