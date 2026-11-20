"use client";

import { useState, type ReactNode } from "react";
import { t } from "@/lib/messages";

/**
 * Une ligne de la fiche « ce que nous avons compris » : libellé, valeur en une phrase, et « Modifier »
 * qui ouvre le champ en dessous. Le champ reste dans la page fermé : il part avec le formulaire.
 */
export function FactRow({
  field,
  label,
  value,
  editor,
  defaultOpen = false,
  toggle = true,
  hint,
}: {
  field: string;
  label: string;
  value: ReactNode;
  editor?: ReactNode;
  defaultOpen?: boolean;
  /** Faux : pas de lien « Modifier » (la valeur se modifie sur place). */
  toggle?: boolean;
  /** Phrase d'aide sous la ligne, toujours visible. */
  hint?: string;
}) {
  const f = t.onboarding.flow;
  const [open, setOpen] = useState(defaultOpen);
  const editorId = `fact-${field}-editeur`;
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5" data-fact={field}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 sm:flex-nowrap">
        <span className="w-full shrink-0 pt-px text-sm text-muted-foreground sm:w-[150px]">
          {label}
        </span>
        <div className="min-w-0 flex-1 whitespace-pre-line">{value}</div>
        {editor && toggle ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={editorId}
            onClick={() => setOpen(!open)}
            className="shrink-0 text-sm font-medium text-primary underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {open ? f.close : f.edit}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-sm text-muted-foreground sm:pl-[162px]">{hint}</p> : null}
      {editor ? (
        <div id={editorId} hidden={!open} className="flex flex-col gap-2 sm:pl-[162px]">
          {editor}
        </div>
      ) : null}
    </div>
  );
}
