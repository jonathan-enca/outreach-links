"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import { MAX_PUBLISHER_TYPES, type PublisherType } from "./schema";

/**
 * « Qui peut vous citer » en étiquettes (chantier H) : les types de sites que la recherche visera,
 * déduits du site. Chaque étiquette se désactive ou se retire ; on peut en ajouter. L'état part dans
 * le formulaire par un champ caché (`profile_publishers`, JSON) : rien n'est enregistré sans le
 * bouton du formulaire.
 */
export function PublisherTags({
  initial,
  themeTerms,
  inline = false,
}: {
  initial: PublisherType[];
  themeTerms: string[];
  /** Dans la fiche de l'étape 2 (maquette du 20/11) : étiquettes seules, « + Ajouter » ouvre le champ. */
  inline?: boolean;
}) {
  const b = t.onboarding.brand.publishers;
  const [types, setTypes] = useState<PublisherType[]>(initial);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const add = () => {
    const label = draft.replace(/\s+/g, " ").trim().slice(0, 80);
    if (label.length < 2 || types.length >= MAX_PUBLISHER_TYPES) return;
    if (types.some((x) => x.label.toLowerCase() === label.toLowerCase())) return setDraft("");
    setTypes([
      ...types,
      {
        label,
        category: "autre",
        terms: [label.toLowerCase().slice(0, 40)],
        origin: "utilisateur",
      },
    ]);
    setDraft("");
  };
  const addRow = (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="publisher_add" className="sr-only">
        {b.addLabel}
      </label>
      <input
        id="publisher_add"
        value={draft}
        maxLength={80}
        placeholder={b.addPlaceholder}
        autoFocus={inline}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        className="h-9 min-w-0 flex-1 rounded-control border border-border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <Button type="button" size="sm" variant="outline" onClick={add}>
        {b.add}
      </Button>
    </div>
  );
  if (inline) {
    return (
      <div className="flex flex-col gap-2" data-field="publishers">
        <input type="hidden" name="profile_publishers" value={JSON.stringify(types)} />
        <input type="hidden" name="profile_theme_terms" value={JSON.stringify(themeTerms)} />
        <ul className="flex flex-wrap gap-1.5">
          {types.map((x, i) => {
            const on = x.active !== false;
            return (
              <li key={x.label}>
                <button
                  type="button"
                  aria-pressed={on}
                  title={on ? b.turnOff : b.turnOn}
                  onClick={() =>
                    setTypes(types.map((y, j) => (j === i ? { ...y, active: !on } : y)))
                  }
                  className={`rounded-full border px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring ${on ? "border-[#bfe3fb] bg-accent text-primary" : "border-border bg-card text-muted-foreground line-through"}`}
                >
                  {x.label}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={adding}
              onClick={() => setAdding(!adding)}
              className="rounded-full border border-dashed border-border bg-card px-2.5 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t.onboarding.flow.addTag}
            </button>
          </li>
        </ul>
        {adding ? addRow : null}
      </div>
    );
  }
  return (
    <div
      className="flex flex-col gap-2 rounded-control border border-border p-3"
      data-field="publishers"
    >
      <input type="hidden" name="profile_publishers" value={JSON.stringify(types)} />
      <input type="hidden" name="profile_theme_terms" value={JSON.stringify(themeTerms)} />
      <p className="text-sm font-medium">{b.title}</p>
      <p className="text-sm text-muted-foreground">{b.hint}</p>
      <ul className="flex flex-wrap gap-2">
        {types.map((x, i) => {
          const on = x.active !== false;
          return (
            <li
              key={x.label}
              className={`flex items-center gap-1 rounded-full border px-1 py-0.5 text-sm ${on ? "border-primary bg-primary/10" : "border-border text-muted-foreground"}`}
            >
              <button
                type="button"
                aria-pressed={on}
                title={on ? b.turnOff : b.turnOn}
                className="rounded-full px-2 py-1 focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setTypes(types.map((y, j) => (j === i ? { ...y, active: !on } : y)))}
              >
                <span className={on ? undefined : "line-through"}>{x.label}</span>
                {x.origin === "voisin" ? (
                  <span className="ml-1 text-xs text-muted-foreground">({b.suggested})</span>
                ) : null}
              </button>
              <button
                type="button"
                aria-label={b.remove(x.label)}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setTypes(types.filter((_, j) => j !== i))}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {types.length === 0 ? <p className="text-sm text-muted-foreground">{b.none}</p> : null}
      {addRow}
    </div>
  );
}
