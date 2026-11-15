import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

export function Problem() {
  const s = t.home.problem;
  const headingId = `${HOME_SECTIONS.problem}-titre`;
  return (
    <section
      id={HOME_SECTIONS.problem}
      aria-labelledby={headingId}
      className="scroll-mt-20 bg-muted px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <ul className="flex flex-wrap gap-2.5">
          {s.items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-border bg-card px-4 py-2 text-[15px] shadow-card"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
