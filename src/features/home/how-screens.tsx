import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { t } from "@/lib/messages";

/** Fenêtre claire (posée dans la bande nuit) : une barre de titre, puis l'écran de l'étape. */
function Screen({ bar, children }: { bar: string; children: ReactNode }) {
  return (
    <div className="light-window overflow-hidden rounded-panel border border-border bg-background text-[13px] text-foreground shadow-float">
      <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-2.5 rounded-full bg-border" />
          ))}
        </span>
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          {t.app.name} · {bar}
        </span>
      </div>
      <div className="p-4 sm:p-5 lg:min-h-[400px]">{children}</div>
    </div>
  );
}

function FakeButton({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-control bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground">
      {children}
    </span>
  );
}

function Stats({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-[10px] border border-border px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{s.label}</p>
          <p className="text-lg font-bold tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function Rows({
  rows,
}: {
  rows: readonly { who: string; what: string; status: string; tone: string }[];
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.who} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{r.who}</p>
            <p className="truncate text-xs text-muted-foreground">{r.what}</p>
          </div>
          <Badge tone={r.tone as BadgeTone}>{r.status}</Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * Les six écrans du parcours (« Comment ça marche »), dans l'ordre des étapes. Maquettes HTML/CSS avec
 * des données de démonstration : elles suivent les vrais écrans (démarrage en un champ, analyse, « Vos
 * cibles », « À valider », envois, « Conversations ») et reprennent leurs libellés. Décoratives : le
 * texte de l'étape porte le sens.
 */
export function howScreens(): ReactNode[] {
  const m = t.home.how.mockup;
  const [start, audit, targets, draft, sending, inbox] = m.bars;
  return [
    <Screen key="start" bar={start}>
      <p className="text-xs font-medium text-muted-foreground">{m.start.fieldLabel}</p>
      <div className="mt-1.5 flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2.5">
        <span className="font-medium">{m.start.fieldValue}</span>
        <Check className="size-4 text-success" />
      </div>
      <div className="mt-5 rounded-card border border-border p-4">
        <p className="font-semibold">{m.start.understood}</p>
        <dl className="mt-3 grid gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">{m.start.themeLabel}</dt>
            <dd className="mt-0.5 font-medium">{m.start.theme}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{m.start.queriesLabel}</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {m.start.queries.map((q) => (
                <Badge key={q}>{q}</Badge>
              ))}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-5 flex justify-end">
        <FakeButton>{m.start.button}</FakeButton>
      </div>
    </Screen>,
    <Screen key="audit" bar={audit}>
      <p className="mb-3 text-base font-bold">{m.audit.title}</p>
      <Stats items={m.audit.stats} />
      <p className="mb-1 mt-5 text-xs font-medium text-muted-foreground">
        {m.audit.competitorsLabel}
      </p>
      <ul className="divide-y divide-border">
        {m.audit.competitors.map((c) => (
          <li key={c.domain} className="flex items-center justify-between gap-3 py-2.5">
            <span className="truncate font-medium">{c.domain}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{c.note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-control bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
        {m.audit.gap}
      </p>
    </Screen>,
    <Screen key="targets" bar={targets}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold">{m.targets.title}</p>
          <p className="text-xs text-muted-foreground">{m.targets.count}</p>
        </div>
        <FakeButton>{m.targets.button}</FakeButton>
      </div>
      <ul className="grid gap-2.5">
        {m.targets.cards.map((c) => (
          <li key={c.domain} className="flex gap-3 rounded-card border border-border p-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
              {c.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="truncate font-semibold">{c.domain}</p>
                <Badge tone={c.tone as BadgeTone}>{c.tactic}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{c.why}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-success" />
                {c.kind} · {c.contact}
              </p>
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 rounded-card border border-dashed border-border px-3 py-2.5 text-muted-foreground">
          <span className="truncate line-through">{m.targets.discarded.domain}</span>
          <Badge tone="danger">{m.targets.discarded.reason}</Badge>
        </li>
      </ul>
    </Screen>,
    <Screen key="draft" bar={draft}>
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-border pb-3">
        <dt className="text-muted-foreground">{m.draft.from}</dt>
        <dd>{m.draft.fromValue}</dd>
        <dt className="text-muted-foreground">{m.draft.to}</dt>
        <dd className="break-all">{m.draft.toValue}</dd>
        <dt className="text-muted-foreground">{m.draft.subject}</dt>
        <dd className="font-medium">{m.draft.subjectValue}</dd>
      </dl>
      <p className="text-sm leading-relaxed">
        {m.draft.before}
        <span className="mark-hook">{m.draft.hook}</span>
        {m.draft.after}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="warning">{m.draft.hookLabel}</Badge>
        <Badge tone="success">{m.draft.urlLabel}</Badge>
      </div>
      <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
        <span className="rounded-control border border-border px-3.5 py-2 text-xs font-semibold">
          {m.draft.edit}
        </span>
        <FakeButton>{m.draft.button}</FakeButton>
      </div>
    </Screen>,
    <Screen key="sending" bar={sending}>
      <p className="mb-3 text-base font-bold">{m.sending.title}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {m.sending.stats.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Rows rows={m.sending.rows} />
      </div>
    </Screen>,
    <Screen key="inbox" bar={inbox}>
      <p className="mb-1 text-base font-bold">{m.inbox.title}</p>
      <Rows rows={m.inbox.rows} />
    </Screen>,
  ];
}
