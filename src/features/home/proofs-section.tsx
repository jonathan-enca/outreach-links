import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { PROOF_SITES, PROOFS_ARE_ILLUSTRATIVE, proofSummary, type ProofSite } from "./proofs";

const nf = new Intl.NumberFormat("fr-FR");
const ARROW = "→";

/** Courbe d'autorité : aire légère sous la ligne, sans axe (le début et la fin sont écrits dessous). */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 300;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 4 - ((v - min) / span) * (h - 12),
  ]);
  const line = pts.map(([x, y]) => `${x!.toFixed(1)},${y!.toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
      className="mt-3 h-14 w-full"
    >
      <polygon points={`0,${h} ${line} ${w},${h}`} className="fill-primary/10" />
      <polyline
        points={line}
        fill="none"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        className="stroke-primary"
      />
    </svg>
  );
}

function SiteCard({ site }: { site: ProofSite }) {
  const p = t.home.proofs;
  const kind = p.kinds[site.kind];
  const label = `${p.authority} ${site.authority.from} ${ARROW} ${site.authority.to}`;
  return (
    <article className="flex flex-col rounded-card border border-border bg-card p-6 shadow-card">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 place-items-center rounded-control bg-primary text-sm font-semibold text-primary-foreground"
        >
          {site.domain[0]!.toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{site.domain}</h3>
          <p className="text-sm text-muted-foreground">{kind}</p>
        </div>
      </header>

      <p className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-primary">
        {p.authority}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-4xl font-bold tracking-tight">
        <span>
          {site.authority.from} {ARROW} {site.authority.to}
        </span>
        <span className="text-sm font-normal text-muted-foreground">{site.period}</span>
      </p>
      <Sparkline values={site.series} label={label} />

      <dl className="mt-4">
        {site.metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-baseline justify-between gap-4 border-t border-border py-3"
          >
            <dt className="text-[15px]">{p.metrics[m.label]}</dt>
            <dd className="text-right font-semibold">
              {m.from !== undefined
                ? `${nf.format(m.from)} ${ARROW} ${nf.format(m.to)}`
                : nf.format(m.to)}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-primary">
        {p.linkedFrom}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {site.linkedFrom.map((l) => (
          <li
            key={l.domain}
            className="rounded-control border border-border bg-muted px-2.5 py-1 font-mono text-xs"
          >
            {l.domain} <span className="text-primary">{l.authority}</span>
          </li>
        ))}
      </ul>
      <p className="mt-auto pt-5 font-mono text-xs text-muted-foreground">{p.footnote}</p>
    </article>
  );
}

/** Preuves : les sites du fondateur, liens demandés à la main (voir proofs.ts : chiffres d'illustration). */
export function Proofs() {
  const p = t.home.proofs;
  const headingId = `${HOME_SECTIONS.proofs}-titre`;
  const sum = proofSummary();
  const stats = [
    {
      label: p.summary.authority,
      value: `${sum.best.authority.from} ${ARROW} ${sum.best.authority.to}`,
      note: `${sum.best.domain}, ${sum.best.period}`,
    },
    {
      label: p.summary.traffic,
      value: `×${String(sum.trafficRatio).replace(".", ",")}`,
      note: `${sum.bestTraffic.domain}, ${sum.bestTraffic.period}`,
    },
    { label: p.summary.links, value: nf.format(sum.links), note: p.summary.linksNote },
  ];
  return (
    <section
      id={HOME_SECTIONS.proofs}
      aria-labelledby={headingId}
      className="scroll-mt-20 px-4 py-16 sm:px-7 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="flex items-center gap-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {p.label}
              <span aria-hidden className="h-px flex-1 bg-border" />
            </p>
            <h2
              id={headingId}
              className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
            >
              {p.title}
            </h2>
          </div>
          <p className="text-lg text-muted-foreground lg:pt-10">{p.intro}</p>
        </div>

        {PROOFS_ARE_ILLUSTRATIVE ? (
          <p
            role="note"
            className="mt-8 rounded-control border border-dashed border-border bg-muted px-4 py-3 text-sm"
          >
            {p.illustrative}
          </p>
        ) : null}

        <div className="mt-10 grid gap-8 rounded-card border border-border bg-card p-6 shadow-card sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-2 text-5xl font-bold tracking-tight text-primary">{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {PROOF_SITES.map((site) => (
            <SiteCard key={site.domain} site={site} />
          ))}
        </div>
      </div>
    </section>
  );
}
