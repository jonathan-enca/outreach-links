import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import { EXCLUSION_REASONS, type CleanStats } from "./clean";
import { ConfirmBacklinksPanel } from "./confirm-backlinks-panel";

export interface BacklinksView {
  status: string;
  /** Estimation avant lancement (null si hors plafond). */
  estimate: {
    totalUsd: number;
    perCompetitorUsd: number;
    competitors: number;
    limit: number;
  } | null;
  stats: CleanStats | null;
  costUsd: number | null;
  errorMessage: string | null;
  sample: {
    sourceDomain: string;
    sourceUrl: string;
    anchor: string | null;
    spamScore: number | null;
    dofollow: boolean | null;
  }[];
  exportKeptHref: string;
  exportAllHref: string;
}

const nf = new Intl.NumberFormat("fr-FR");

/** Étape « backlinks des concurrents » d'un audit terminé (rendu pur, testable). */
export function BacklinksSection({
  view,
  startAction,
}: {
  view: BacklinksView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const r = t.backlinks.result;
  const s = view.stats;

  if (view.status === "aucun" || view.status === "confirme" || view.status === "echoue") {
    return (
      <div className="flex flex-col gap-4">
        {view.status === "echoue" ? (
          <Card className="flex flex-col gap-1 p-6">
            <h2 className="font-display text-xl font-semibold text-danger">
              {t.backlinks.failed.title}
            </h2>
            <p className="text-muted-foreground">{t.backlinks.failed.body}</p>
            {view.errorMessage ? <p className="text-sm">{view.errorMessage}</p> : null}
          </Card>
        ) : null}
        <ConfirmBacklinksPanel
          estimate={view.estimate}
          confirmed={view.status === "confirme"}
          action={startAction}
        />
      </div>
    );
  }

  if (view.status === "en_cours") {
    return (
      <Card className="flex flex-col gap-1 p-6">
        <h2 className="font-display text-xl font-semibold">{t.backlinks.running.title}</h2>
        <p className="text-muted-foreground">{t.backlinks.running.body}</p>
      </Card>
    );
  }

  if (!s) return null;
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="font-display text-xl font-semibold">{r.title}</h2>
        <p className="text-muted-foreground">{r.body}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
        <dt className="text-muted-foreground">{r.before}</dt>
        <dd>{nf.format(s.before)}</dd>
        <dt className="text-muted-foreground">{r.excluded}</dt>
        <dd>{nf.format(s.excluded)}</dd>
        <dt className="text-muted-foreground">{r.after}</dt>
        <dd className="font-semibold">{nf.format(s.after)}</dd>
        <dt className="text-muted-foreground">{r.domainsBefore}</dt>
        <dd>{nf.format(s.domainsBefore)}</dd>
        <dt className="text-muted-foreground">{r.domainsAfter}</dt>
        <dd>{nf.format(s.domainsAfter)}</dd>
        <dt className="text-muted-foreground">{r.cost}</dt>
        <dd>{formatUsd(view.costUsd)}</dd>
      </dl>

      <div>
        <h3 className="font-medium">{r.reasonsTitle}</h3>
        <ul className="mt-1 flex flex-col gap-1 text-sm sm:max-w-md">
          {EXCLUSION_REASONS.map((code) => (
            <li key={code} className="flex justify-between gap-4">
              <span>{t.backlinks.reasons[code]}</span>
              <span className="text-muted-foreground">{nf.format(s.byReason[code] ?? 0)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground">{r.reasonsNote}</p>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-medium">{r.perCompetitorTitle}</h3>
        <table className="mt-1 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{r.competitor}</th>
              <th className="py-2 pr-4 font-medium">{r.before}</th>
              <th className="py-2 font-medium">{r.after}</th>
            </tr>
          </thead>
          <tbody>
            {s.perCompetitor.map((c) => (
              <tr key={c.domain} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 font-medium">{c.domain}</td>
                <td className="py-2 pr-4">{nf.format(c.before)}</td>
                <td className="py-2">{nf.format(c.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-medium">{r.sampleTitle}</h3>
        {view.sample.length === 0 ? (
          <p className="mt-1">{r.noneKept}</p>
        ) : (
          <table className="mt-1 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{r.source}</th>
                <th className="py-2 pr-4 font-medium">{r.anchor}</th>
                <th className="py-2 pr-4 font-medium">{r.spam}</th>
                <th className="py-2 font-medium">{r.follow}</th>
              </tr>
            </thead>
            <tbody>
              {view.sample.map((b) => (
                <tr key={b.sourceUrl} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{b.sourceDomain}</td>
                  <td className="py-2 pr-4">{b.anchor ?? "-"}</td>
                  <td className="py-2 pr-4">{b.spamScore ?? "-"}</td>
                  <td className="py-2">{b.dofollow === null ? "-" : b.dofollow ? r.yes : r.no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <a className="text-primary underline" href={view.exportKeptHref} download>
          {r.exportKept}
        </a>
        <a className="text-primary underline" href={view.exportAllHref} download>
          {r.exportAll}
        </a>
      </div>
    </Card>
  );
}
