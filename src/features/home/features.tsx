import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

export function Features() {
  const s = t.home.features;
  const headingId = `${HOME_SECTIONS.features}-titre`;
  return (
    <section
      id={HOME_SECTIONS.features}
      aria-labelledby={headingId}
      className="scroll-mt-20 px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {s.items.map((item, i) => (
            <li
              key={item.title}
              className="rounded-card border border-border bg-card p-5 shadow-card"
            >
              <span className="mb-3 grid size-8 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <h3 className="text-[19px] font-semibold leading-snug">{item.title}</h3>
              <p className="mt-1.5 text-[15px] text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
