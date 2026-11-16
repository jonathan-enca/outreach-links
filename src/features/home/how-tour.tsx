"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface TourStep {
  title: string;
  text: string;
  /** Libellé de la pastille (« À vous » / « Automatique »). */
  roleLabel: string;
  /** Étape où l'utilisateur agit : pastille mise en avant. */
  byUser: boolean;
  screen: ReactNode;
}

const AUTO_MS = 5000;

/**
 * Parcours interactif : la liste des étapes à gauche, l'écran de l'étape choisie à droite (sous
 * l'étape ouverte sur mobile). Sur bureau, les étapes défilent seules tant que la section est visible
 * et que personne n'a cliqué ; jamais avec « réduire les animations », jamais sur mobile.
 */
export function HowTour({ steps, caption }: { steps: TourStep[]; caption: string }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!auto || !el) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)), {
      threshold: 0.4,
    });
    io.observe(el);
    const id = window.setInterval(() => {
      if (visible && wide.matches && !calm.matches) setActive((i) => (i + 1) % steps.length);
    }, AUTO_MS);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [auto, steps.length]);

  const pick = (i: number) => {
    setAuto(false);
    setActive(i);
  };

  return (
    <div
      ref={root}
      className="grid gap-8 lg:min-h-[570px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10"
    >
      <ol className="grid gap-2">
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <li
              key={s.title}
              className={`rounded-card border transition-colors ${on ? "border-primary/50 bg-card" : "border-transparent hover:bg-card/60"}`}
            >
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`etape-${i + 1}`}
                onClick={() => pick(i)}
                className="flex w-full items-center gap-4 rounded-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors ${on ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
                >
                  {i + 1}
                </span>
                <span className="flex flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-semibold">{s.title}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.byUser ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {s.roleLabel}
                  </span>
                </span>
              </button>
              <div id={`etape-${i + 1}`} hidden={!on} className="px-4 pb-4 sm:pl-16">
                <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                <div aria-hidden className="mt-4 lg:hidden">
                  {s.screen}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <figure aria-hidden className="hidden lg:block">
        {steps[active]?.screen}
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">
          {caption}
        </figcaption>
      </figure>
    </div>
  );
}
