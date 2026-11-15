import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

export function WhatItIs() {
  const s = t.home.whatItIs;
  const headingId = `${HOME_SECTIONS.whatItIs}-titre`;
  return (
    <section
      id={HOME_SECTIONS.whatItIs}
      aria-labelledby={headingId}
      className="scroll-mt-20 px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {s.items.map((item) => (
            <div key={item.q} className="border-t border-border pt-4">
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1.5 text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
