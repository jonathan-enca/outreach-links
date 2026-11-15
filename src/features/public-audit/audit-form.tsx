"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { startPublicAuditAction, type PublicActionState } from "./actions";

const initial: PublicActionState = { status: "idle" };
const input =
  "h-10 rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Champ « ton site » de l'accueil : lance l'audit gratuit (aucun compte requis). */
export function AuditForm({
  fixedDomain,
  variant = "page",
}: { fixedDomain?: string; variant?: "page" | "hero" } = {}) {
  const f = t.publicAudit.form;
  const [state, action, pending] = useActionState(startPublicAuditAction, initial);
  if (variant === "hero" && !fixedDomain)
    return <HeroForm action={action} pending={pending} state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {fixedDomain ? (
        <input type="hidden" name="domain" value={fixedDomain} />
      ) : (
        <>
          <label htmlFor="domain" className="text-sm font-medium">
            {f.domainLabel}
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            inputMode="url"
            required
            autoComplete="url"
            placeholder={f.domainPlaceholder}
            className={input}
          />
        </>
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{f.queriesLabel}</legend>
        <p className="text-sm text-muted-foreground">{f.queriesHint}</p>
        {["q1", "q2", "q3"].map((name, i) => (
          <input
            key={name}
            name={name}
            type="text"
            maxLength={100}
            aria-label={`${f.queriesLabel} ${i + 1}`}
            placeholder={i === 0 ? f.queryPlaceholder : undefined}
            className={input}
          />
        ))}
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="niche" className="text-sm font-medium">
          {f.nicheLabel}
        </label>
        <p id="niche-hint" className="text-sm text-muted-foreground">
          {f.nicheHint}
        </p>
        <input
          id="niche"
          name="niche"
          type="text"
          maxLength={60}
          aria-describedby="niche-hint"
          placeholder={f.nichePlaceholder}
          className={input}
        />
      </div>
      {/* Champ piège : invisible pour un humain, rempli par les robots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="site_web">Site web</label>
        <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? f.pending : fixedDomain ? f.retrySubmit : f.submit}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-danger">
          {state.message}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">{f.fineprint}</p>
    </form>
  );
}

const honeypot = (
  /* Champ piège : invisible pour un humain, rempli par les robots. */
  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label htmlFor="site_web">Site web</label>
    <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
  </div>
);

/** Version du hero de la home : champ et bouton dans un même cadre, réglages facultatifs repliés. */
function HeroForm({
  action,
  pending,
  state,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  state: PublicActionState;
}) {
  const f = t.publicAudit.form;
  return (
    <form
      action={action}
      className="mx-auto flex w-full max-w-xl flex-col gap-3 text-left"
      noValidate
    >
      <label htmlFor="domain" className="sr-only">
        {f.domainLabel}
      </label>
      <div className="flex flex-col gap-2 rounded-panel border border-border bg-card p-1.5 shadow-card focus-within:border-primary sm:flex-row">
        <input
          id="domain"
          name="domain"
          type="text"
          inputMode="url"
          required
          autoComplete="url"
          placeholder={f.domainPlaceholder}
          aria-describedby={state.status === "error" ? "domain-error" : undefined}
          className="h-11 min-w-0 flex-1 rounded-control bg-transparent px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none"
        />
        <Button type="submit" disabled={pending} className="h-11 px-5 text-base">
          {pending ? f.pending : f.submit}
        </Button>
      </div>
      {state.status === "error" ? (
        <p id="domain-error" role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <details className="group text-sm">
        <summary className="mx-auto w-fit cursor-pointer rounded-control px-2 py-1 text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {t.home.hero.refine}
        </summary>
        <div className="mt-3 flex flex-col gap-3 rounded-card border border-border bg-card p-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium">{f.queriesLabel}</legend>
            <p className="text-muted-foreground">{f.queriesHint}</p>
            {["q1", "q2", "q3"].map((name, i) => (
              <input
                key={name}
                name={name}
                type="text"
                maxLength={100}
                aria-label={`${f.queriesLabel} ${i + 1}`}
                placeholder={i === 0 ? f.queryPlaceholder : undefined}
                className={input}
              />
            ))}
          </fieldset>
          <div className="flex flex-col gap-2">
            <label htmlFor="niche" className="font-medium">
              {f.nicheLabel}
            </label>
            <input
              id="niche"
              name="niche"
              type="text"
              maxLength={60}
              placeholder={f.nichePlaceholder}
              className={input}
            />
          </div>
        </div>
      </details>
      {honeypot}
    </form>
  );
}
