import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/features/audits/format";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { AnchorKind } from "./compute";
import { ConfirmProfilePanel } from "./confirm-profile-panel";
import type { ProfileData } from "./run";

export interface ProfileView {
  status: string;
  estimate: { totalUsd: number; competitors: number; rows: number; pages: number } | null;
  data: ProfileData | null;
  summary: string | null;
  summarySource: "llm" | "modele" | null;
  costUsd: number | null;
  errorMessage: string | null;
  pages: {
    url: string;
    avgPosition: number | null;
    totalVolume: number;
    pageDomains: number | null;
    neededLow: number | null;
    neededHigh: number | null;
    neededEstimated: number | null;
    techStatus: string;
    techIssues: string[];
  }[];
  gap: {
    domain: string;
    competitorsCount: number;
    competitors: string[];
    sampleUrl: string | null;
  }[];
}

const nf = new Intl.NumberFormat("fr-FR");
const pct = (n: number | null) => (n === null ? "-" : `${Math.round(n * 100)} %`);
const num = (n: number | null | undefined) => (n === null || n === undefined ? "-" : nf.format(n));

const techTone = (s: string): BadgeTone =>
  s === "ok" ? "success" : s === "probleme" ? "danger" : s === "attention" ? "warning" : "neutral";

/** Étape « profil de liens, écart, diagnostic par page » (rendu pur, testable). */
export function ProfileSection({
  view,
  startAction,
}: {
  view: ProfileView;
  startAction: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const r = t.profile.result;

  if (view.status === "aucun" || view.status === "confirme" || view.status === "echoue") {
    return (
      <div className="flex flex-col gap-4">
        {view.status === "echoue" ? (
          <Card className="flex flex-col gap-1 p-6">
            <h2 className="font-display text-xl font-semibold text-danger">
              {t.profile.failed.title}
            </h2>
            <p className="text-muted-foreground">{t.profile.failed.body}</p>
            {view.errorMessage ? <p className="text-sm">{view.errorMessage}</p> : null}
          </Card>
        ) : null}
        <ConfirmProfilePanel
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
        <h2 className="font-display text-xl font-semibold">{t.profile.running.title}</h2>
        <p className="text-muted-foreground">{t.profile.running.body}</p>
      </Card>
    );
  }

  const d = view.data;
  if (!d) return null;
  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="font-display text-xl font-semibold">{r.title}</h2>

      {view.summary ? (
        <div>
          <h3 className="font-medium">{r.summaryTitle}</h3>
          <p className="mt-1">{view.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {view.summarySource === "llm" ? r.summaryLlm : r.summaryTemplate} {r.disclaimer}
          </p>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
        <dt className="text-muted-foreground">{r.referringDomains}</dt>
        <dd className="font-semibold">{num(d.totals.referringDomains)}</dd>
        <dt className="text-muted-foreground">{r.backlinks}</dt>
        <dd>{num(d.totals.backlinks)}</dd>
        <dt className="text-muted-foreground">{r.brokenBacklinks}</dt>
        <dd>{num(d.totals.brokenBacklinks)}</dd>
        <dt className="text-muted-foreground">{r.dofollow}</dt>
        <dd>{pct(d.anchors.dofollowShare)}</dd>
        <dt className="text-muted-foreground">{r.brandAnchors}</dt>
        <dd>{d.anchors.sampleSize ? pct(d.anchors.shares.marque) : "-"}</dd>
        <dt className="text-muted-foreground">{r.benchmark}</dt>
        <dd>{num(d.benchmarkMedian)}</dd>
        <dt className="text-muted-foreground">{r.cost}</dt>
        <dd>{formatUsd(view.costUsd)}</dd>
      </dl>
      {d.anchors.overOptimized ? <p className="text-sm text-warning">{r.overOptimized}</p> : null}

      {d.anchors.top.length ? (
        <div className="overflow-x-auto">
          <h3 className="font-medium">{r.anchorsTitle}</h3>
          <table className="mt-1 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{r.anchor}</th>
                <th className="py-2 pr-4 font-medium">{r.kind}</th>
                <th className="py-2 font-medium">{r.count}</th>
              </tr>
            </thead>
            <tbody>
              {d.anchors.top.map((a) => (
                <tr key={a.anchor} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{a.anchor}</td>
                  <td className="py-2 pr-4">{r.anchorKinds[a.kind as AnchorKind]}</td>
                  <td className="py-2">{a.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <h3 className="font-medium">{r.pagesTitle}</h3>
        {view.pages.length === 0 ? (
          <p className="mt-1">{r.pagesNone}</p>
        ) : (
          <table className="mt-1 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{r.page}</th>
                <th className="py-2 pr-4 font-medium">{r.position}</th>
                <th className="py-2 pr-4 font-medium">{r.volume}</th>
                <th className="py-2 pr-4 font-medium">{r.pageDomains}</th>
                <th className="py-2 pr-4 font-medium">{r.needed}</th>
                <th className="py-2 font-medium">{r.tech}</th>
              </tr>
            </thead>
            <tbody>
              {view.pages.map((p) => (
                <tr key={p.url} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium break-all">{p.url}</td>
                  <td className="py-2 pr-4">{p.avgPosition ?? "-"}</td>
                  <td className="py-2 pr-4">{num(p.totalVolume)}</td>
                  <td className="py-2 pr-4">{num(p.pageDomains)}</td>
                  <td className="py-2 pr-4">
                    {p.neededEstimated === null
                      ? "-"
                      : `~${p.neededEstimated} (${p.neededLow}-${p.neededHigh})`}
                  </td>
                  <td className="py-2">
                    <Badge tone={techTone(p.techStatus)}>
                      {r.techStatus[p.techStatus as keyof typeof r.techStatus] ?? p.techStatus}
                    </Badge>
                    {p.techIssues.length ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.techIssues
                          .map((i) => r.techIssues[i as keyof typeof r.techIssues] ?? i)
                          .join(", ")}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-medium">{r.gapTitle}</h3>
        {d.ownDomainsPartial ? <p className="text-xs text-muted-foreground">{r.partial}</p> : null}
        {view.gap.length === 0 ? (
          <p className="mt-1">{r.gapNone}</p>
        ) : (
          <table className="mt-1 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{r.gapDomain}</th>
                <th className="py-2 pr-4 font-medium">{r.gapCompetitors}</th>
                <th className="py-2 font-medium">{r.gapSample}</th>
              </tr>
            </thead>
            <tbody>
              {view.gap.map((g) => (
                <tr key={g.domain} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{g.domain}</td>
                  <td className="py-2 pr-4">
                    {g.competitorsCount} ({g.competitors.join(", ")})
                  </td>
                  <td className="py-2 break-all">{g.sampleUrl ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
