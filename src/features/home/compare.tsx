import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

/** Comparatif descriptif et sobre : aucune note, aucune marque, aucun prix. */
export function Compare() {
  const s = t.home.compare;
  const headingId = `${HOME_SECTIONS.compare}-titre`;
  return (
    <section
      id={HOME_SECTIONS.compare}
      aria-labelledby={headingId}
      className="scroll-mt-20 bg-muted px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <div
          className="overflow-x-auto rounded-panel border border-border bg-card"
          tabIndex={0}
          role="region"
          aria-label={s.title}
        >
          <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{s.label}</span>
                </th>
                {s.columns.slice(1).map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 font-semibold">
                    {c}
                  </th>
                ))}
                <th scope="col" className="bg-primary/10 px-4 py-3 font-semibold text-primary">
                  {s.usColumn}
                </th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r, i) => (
                <tr key={r.label} className="border-t border-border">
                  <th scope="row" className="px-4 py-3.5 font-medium">
                    {r.label}
                  </th>
                  {r.values.map((v) => (
                    <td key={v} className="px-4 py-3.5 text-muted-foreground">
                      {v}
                    </td>
                  ))}
                  <td className="bg-primary/5 px-4 py-3.5 font-medium">{s.usValues[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{s.note}</p>
      </div>
    </section>
  );
}
