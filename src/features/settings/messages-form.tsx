"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AuditActionState } from "@/features/audits/service";
import { FOUNDER_ROLES, type FounderRole } from "@/features/targets/types";
import { t } from "@/lib/messages";

const S = t.settings.yourMessages;
const F = t.targets.founder;
const INPUT = "rounded-control border border-border bg-card px-3 py-2 text-sm";

/** « Vos messages » : qui écrit et ce qu'il propose. L'aperçu à droite suit ce qui est saisi. */
export function MessagesForm({
  domain,
  firstName,
  role,
  offer,
  save,
}: {
  domain: string;
  firstName: string;
  role: FounderRole | null;
  offer: string;
  save: (prev: AuditActionState, fd: FormData) => Promise<AuditActionState>;
}) {
  const [state, action, pending] = useActionState(save, { status: "idle" } as AuditActionState);
  const [name, setName] = useState(firstName);
  const [r, setR] = useState<FounderRole | null>(role);
  const signature = `${name.trim() || S.previewName}${r ? `, ${F.shortRoles[r]} ${S.of} ${domain}` : ""}`;
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card className="p-5">
        <form action={action} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="firstName">
            {F.firstName}
            <input
              id="firstName"
              name="firstName"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${INPUT} font-normal md:max-w-xs`}
            />
            <span className="font-normal text-muted-foreground">{S.firstNameHint}</span>
          </label>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-semibold">{S.role}</legend>
            {FOUNDER_ROLES.map((x) => (
              <label key={x} className="flex min-h-10 items-center gap-2 text-sm md:min-h-8">
                <input
                  type="radio"
                  name="role"
                  value={x}
                  required
                  checked={r === x}
                  onChange={() => setR(x)}
                  className="size-4 accent-primary"
                />
                {F.roles[x].replace("{site}", domain)}
              </label>
            ))}
            <span className="text-sm text-muted-foreground">{S.roleHint}</span>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="offer">
            {S.offer}
            <textarea
              id="offer"
              name="offer"
              rows={3}
              maxLength={300}
              defaultValue={offer}
              className={`${INPUT} font-normal`}
            />
            <span className="font-normal text-muted-foreground">{S.offerHint}</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? F.saving : F.save}
            </Button>
            {state.message ? (
              <p
                role="status"
                className={state.status === "error" ? "text-danger" : "text-success"}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <h2 className="mb-2 font-semibold">{S.previewTitle}</h2>
          <p className="whitespace-pre-line rounded-control bg-muted px-3 py-2.5 text-sm">
            {S.previewBody}
            {"\n\n"}
            {signature}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 font-semibold">{S.neverTitle}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {S.never.map((x) => (
              <li key={x} className="flex items-start gap-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check aria-hidden className="size-3.5" />
                </span>
                {x}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
