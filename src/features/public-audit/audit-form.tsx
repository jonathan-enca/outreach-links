"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { startPublicAuditAction, type PublicActionState } from "./actions";

const initial: PublicActionState = { status: "idle" };
const input =
  "h-10 rounded-md border border-border bg-card px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Champ « ton site » de l'accueil : lance l'audit gratuit (aucun compte requis). */
export function AuditForm({ fixedDomain }: { fixedDomain?: string } = {}) {
  const f = t.publicAudit.form;
  const [state, action, pending] = useActionState(startPublicAuditAction, initial);
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
