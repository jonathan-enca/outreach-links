import { Check } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { t } from "@/lib/messages";
import { HOME_SECTIONS } from "./sections";
import { SectionHeading } from "./section-heading";

type Block = (typeof t.home.quality.blocks)[number];

/** Les maquettes sont décoratives (données de démonstration) : masquées aux lecteurs d'écran. */
function Window({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-panel border border-border bg-card p-4 text-[13px] shadow-float sm:p-5"
    >
      {children}
    </div>
  );
}

function TargetsMock({ m }: { m: Extract<Block, { id: "cibles" }>["mockup"] }) {
  return (
    <Window>
      <div className="grid gap-3">
        {m.cards.map((c) => (
          <div key={c.domain} className="rounded-card border border-border p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{c.domain}</p>
                <p className="text-xs text-muted-foreground">{c.kind}</p>
              </div>
              <Badge tone={c.tone as BadgeTone}>
                {c.tone === "success" ? m.retained : m.discarded}
              </Badge>
            </div>
            <ul className="grid gap-1 text-muted-foreground">
              {c.lines.map((l) => (
                <li key={l} className="flex items-start gap-1.5">
                  {c.tone === "success" ? (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                  ) : null}
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Window>
  );
}

function MessageMock({ m }: { m: Extract<Block, { id: "message" }>["mockup"] }) {
  return (
    <Window>
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border pb-3">
        <dt className="text-muted-foreground">{m.from}</dt>
        <dd>{m.fromValue}</dd>
        <dt className="text-muted-foreground">{m.to}</dt>
        <dd className="break-all">{m.toValue}</dd>
        <dt className="text-muted-foreground">{m.subject}</dt>
        <dd className="font-medium">{m.subjectValue}</dd>
      </dl>
      <p className="leading-relaxed">
        {m.before}
        <span className="mark-hook">{m.hook}</span>
        {m.after}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="warning">{m.hookLabel}</Badge>
        <Badge tone="success">{m.urlLabel}</Badge>
      </div>
    </Window>
  );
}

function FollowMock({ m }: { m: Extract<Block, { id: "suivi" }>["mockup"] }) {
  return (
    <Window>
      <p className="mb-3 font-semibold">{m.title}</p>
      <ul className="divide-y divide-border">
        {m.rows.map((r) => (
          <li key={r.who} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium">{r.who}</p>
              <p className="truncate text-xs text-muted-foreground">{r.what}</p>
            </div>
            <Badge tone={r.tone as BadgeTone}>{r.status}</Badge>
          </li>
        ))}
      </ul>
    </Window>
  );
}

function Mock({ block }: { block: Block }) {
  if (block.id === "cibles") return <TargetsMock m={block.mockup} />;
  if (block.id === "message") return <MessageMock m={block.mockup} />;
  return <FollowMock m={block.mockup} />;
}

/** Qualité des cibles, message, suivi : trois blocs texte + maquette, alternés. */
export function Quality() {
  const s = t.home.quality;
  const headingId = `${HOME_SECTIONS.quality}-titre`;
  return (
    <section
      id={HOME_SECTIONS.quality}
      aria-labelledby={headingId}
      className="scroll-mt-20 bg-muted px-4 py-16 sm:px-7 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading id={headingId} label={s.label} title={s.title} intro={s.intro} />
        <div className="grid gap-16">
          {s.blocks.map((b, i) => (
            <article key={b.id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                <h3 className="text-2xl font-bold leading-tight">{b.title}</h3>
                <p className="mt-3 text-muted-foreground">{b.text}</p>
                <ul className="mt-5 grid gap-2.5">
                  {b.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <Mock block={b} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
