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
        {/* Mobile : une carte par question, notre réponse en premier. */}
        <div className="grid gap-3 sm:hidden">
          {s.rows.map((r, i) => (
            <div key={r.label} className="rounded-card border border-border bg-card px-4 py-3.5">
              <h3 className="text-[15px] font-semibold">{r.label}</h3>
              <p className="mt-2 rounded-control bg-accent px-2.5 py-2 text-[15px] font-semibold text-primary">
                <span className="block text-xs">{s.usColumn}</span>
                {s.usValues[i]}
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
                <dt className="font-semibold">{s.short.platform}</dt>
                <dd>{r.values[0]}</dd>
                <dt className="font-semibold">{s.short.byHand}</dt>
                <dd>{r.values[1]}</dd>
              </dl>
            </div>
          ))}
        </div>
        <div
          className="hidden overflow-x-auto rounded-panel border border-border bg-card sm:block"
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
