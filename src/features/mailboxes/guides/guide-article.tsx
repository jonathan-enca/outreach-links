import Link from "next/link";
import { ChevronRight, Clock, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/messages";
import type { ProviderGuide } from "../../../../messages/mailbox-guides";
import { GUIDES_BASE, guideTitle } from "../providers";
import { GuideShell } from "./guide-shell";

const ui = t.mailboxGuides.ui;
const external =
  "inline-flex items-center gap-1 rounded-control font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-3.5";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10 scroll-mt-6">
      <h2 id={id} className="text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Numbered({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </li>
  );
}

/** Tableau des réglages : ce qui sera écrit dans le formulaire, valeur par valeur. */
function Settings({ p }: { p: ProviderGuide }) {
  const s = ui.guide.settings;
  const host = (value: string | undefined, port: number | undefined) =>
    value && port ? (
      <>
        <code className="rounded bg-muted px-1.5 py-0.5 text-[0.95em]">{value}</code>,{" "}
        {s.port(port)}
      </>
    ) : (
      <span className="text-muted-foreground">{s.toRead}</span>
    );
  const rows: Array<[string, React.ReactNode]> = [
    [s.username, p.username],
    [s.password, p.password === "application" ? s.passwordApplication : s.passwordBoite],
    [s.smtp, host(p.server?.smtpHost, p.server?.smtpPort)],
    [s.imap, host(p.server?.imapHost, p.server?.imapPort)],
  ];
  return (
    <>
      <p className="mt-2 text-muted-foreground">
        {p.server ? ui.guide.settingsPrefilled(p.name) : ui.guide.settingsManual}
      </p>
      {p.serverHint ? <p className="mt-2">{p.serverHint}</p> : null}
      <dl className="mt-4 divide-y divide-border rounded-card border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="font-medium">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Guide d'un fournisseur : ce qu'il faut, les étapes chez lui, les réglages, la fin dans l'application, les pannes. */
export function GuideArticle({ p }: { p: ProviderGuide }) {
  const gd = ui.guide;
  return (
    <GuideShell>
      <nav aria-label={gd.breadcrumbLabel} className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href={GUIDES_BASE}
              className="rounded-control underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {ui.index.title}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="text-foreground">
            {p.name}
          </li>
        </ol>
      </nav>

      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{guideTitle(p)}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={p.compatible ? "success" : "warning"}>
          {p.compatible ? ui.index.compatible : ui.index.notCompatible}
        </Badge>
        {p.compatible ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock aria-hidden className="size-4" />
            {gd.duration} : {p.duration}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground">{p.scope}</span>
      </div>
      <p className="mt-4 text-lg text-muted-foreground">{p.intro}</p>

      {p.needs.length > 0 ? (
        <Section id="ce-qu-il-faut" title={p.compatible ? gd.needsTitle : gd.whyTitle}>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            {p.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {p.steps.length > 0 ? (
        <Section id="etapes" title={gd.stepsTitle(p.name)}>
          <ol className="mt-5 space-y-6">
            {p.steps.map((step, n) => (
              <Numbered key={step.title} n={n + 1}>
                <h3 className="font-semibold">{step.title}</h3>
                {step.body.map((line) => (
                  <p key={line} className="mt-1.5 text-muted-foreground">
                    {line}
                  </p>
                ))}
                {step.link ? (
                  <p className="mt-2">
                    <a
                      href={step.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={external}
                    >
                      {step.link.label}
                      <ExternalLink aria-hidden />
                    </a>
                  </p>
                ) : null}
              </Numbered>
            ))}
          </ol>
        </Section>
      ) : null}

      {p.compatible ? (
        <>
          <Section id="reglages" title={gd.settingsTitle}>
            <Settings p={p} />
          </Section>

          <Section id="dans-l-application" title={gd.appTitle(t.app.name)}>
            <ol className="mt-5 space-y-4">
              {gd.appSteps(p.name).map((line, n) => (
                <Numbered key={line} n={p.steps.length + n + 1}>
                  <p>{line}</p>
                </Numbered>
              ))}
            </ol>
            <p className="mt-6">
              <Button asChild>
                <Link href="/app/reglages/boite">{gd.open}</Link>
              </Button>
            </p>
          </Section>
        </>
      ) : null}

      {p.alternatives && p.alternatives.length > 0 ? (
        <Section id="a-la-place" title={gd.alternativesTitle}>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            {p.alternatives.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="mt-4">
            <Link href={GUIDES_BASE} className={external}>
              {gd.all}
            </Link>
          </p>
        </Section>
      ) : null}

      {p.errors.length > 0 ? (
        <Section id="si-le-test-echoue" title={gd.errorsTitle}>
          <dl className="mt-4 space-y-4">
            {p.errors.map((e) => (
              <div key={e.symptom} className="rounded-card border border-border p-4">
                <dt className="font-medium">{e.symptom}</dt>
                <dd className="mt-1 text-muted-foreground">{e.fix}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {p.notes && p.notes.length > 0 ? (
        <Section id="a-savoir" title={gd.notesTitle}>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted-foreground">
            {p.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {p.sources.length > 0 ? (
        <Section id="sources" title={gd.sourcesTitle}>
          <ul className="mt-3 space-y-1.5 text-sm">
            {p.sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={external}>
                  {s.label}
                  <ExternalLink aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">{ui.checkedOn}</p>
        </Section>
      ) : null}
    </GuideShell>
  );
}
