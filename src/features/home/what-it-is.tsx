import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";

/**
 * « C'est quoi » : le titre à gauche, les réponses à droite (phrase d'accroche puis six couples
 * libellé / réponse sur deux colonnes). Sous le bureau, tout passe en une colonne.
 */
export function WhatItIs() {
  const s = t.home.whatItIs;
  const headingId = `${HOME_SECTIONS.whatItIs}-titre`;
  return (
    <section
      id={HOME_SECTIONS.whatItIs}
      aria-labelledby={headingId}
      className="scroll-mt-20 px-4 py-16 sm:px-7 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div>
          <p className="flex items-center gap-4 text-sm font-semibold text-primary">
            {s.label}
            <span aria-hidden className="h-px flex-1 bg-border" />
          </p>
          <h2
            id={headingId}
            className="mt-6 text-balance text-[32px] font-bold leading-[1.1] tracking-tight sm:text-6xl sm:leading-[1.05]"
          >
            {s.title}
          </h2>
        </div>
        <div>
          <p className="text-balance text-[19px] font-medium leading-snug sm:text-3xl">{s.intro}</p>
          {/* Mobile : une question par ligne, la première ouverte. */}
          <div className="mt-6 sm:hidden">
            {s.items.map((item, i) => (
              <details key={item.q} open={i === 0} className="group border-t border-border py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden className="text-xl leading-none group-open:hidden">
                    +
                  </span>
                  <span aria-hidden className="hidden text-xl leading-none group-open:inline">
                    –
                  </span>
                </summary>
                <p className="mt-2 leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
          <dl className="mt-12 hidden gap-x-12 sm:grid sm:grid-cols-2">
            {s.items.map((item) => (
              <div key={item.q} className="border-t border-border py-6">
                <dt className="text-sm font-semibold text-primary">{item.q}</dt>
                <dd className="mt-3 text-lg leading-relaxed text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
