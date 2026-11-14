import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import type { PublicReportView } from "./report";

const nf = new Intl.NumberFormat("fr-FR");
const num = (n: number | null | undefined) => (n === null || n === undefined ? "-" : nf.format(n));

const bandTone = { a_renforcer: "danger", correct: "warning", solide: "success" } as const;

/** Rendu pur du rapport (testable sans réseau). Ne reçoit que la projection serveur. */
export function ReportView({ view }: { view: PublicReportView }) {
  const r = t.publicAudit.report;
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="font-display text-xl font-semibold">{r.scoreTitle}</h2>
        {view.score ? (
          <>
            <p className="flex items-baseline gap-3">
              <span className="font-display text-5xl font-semibold">{view.score.value}</span>
              <span className="text-muted-foreground">{r.scoreOutOf}</span>
              <Badge tone={bandTone[view.score.band]}>{r.scoreBands[view.score.band]}</Badge>
            </p>
            <p className="text-sm text-muted-foreground">{r.scoreNote}</p>
          </>
        ) : (
          <p className="text-muted-foreground">{r.scoreNone}</p>
        )}
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
          <dt className="text-muted-foreground">{r.referringDomains}</dt>
          <dd className="font-semibold">{num(view.site.referringDomains)}</dd>
          <dt className="text-muted-foreground">{r.rankedKeywords}</dt>
          <dd>{num(view.site.rankedKeywords)}</dd>
          <dt className="text-muted-foreground">{r.benchmark}</dt>
          <dd>{num(view.benchmarkMedian)}</dd>
        </dl>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold">{r.competitorsTitle}</h2>
        <p className="text-muted-foreground">{r.competitorsBody}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{r.competitor}</th>
                <th className="py-2 pr-4 font-medium">{r.queries}</th>
                <th className="py-2 pr-4 font-medium">{r.bestRank}</th>
                <th className="py-2 font-medium">{r.competitorLinks}</th>
              </tr>
            </thead>
            <tbody>
              {view.competitors.map((c) => (
                <tr key={c.domain} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{c.domain}</td>
                  <td className="py-2 pr-4">{c.queriesCount}</td>
                  <td className="py-2 pr-4">{c.bestRank}</td>
                  <td className="py-2">{num(c.referringDomains)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold">{r.pagesTitle}</h2>
        <p className="text-muted-foreground">{r.pagesBody}</p>
        {view.pages.length === 0 ? (
          <p>{r.pagesNone}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {view.pages.map((p) => (
              <li
                key={p.url}
                className="flex flex-col gap-1 border-b border-border pb-4 last:border-0"
              >
                <p className="font-medium break-all">{p.url}</p>
                <p className="text-sm text-muted-foreground">
                  {r.position} : {p.avgPosition} - {r.volume} : {num(p.volume)}
                </p>
                {p.detail ? (
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">{r.needed} : </span>
                      {p.detail.neededEstimated === null
                        ? "-"
                        : `~${p.detail.neededEstimated} (${p.detail.neededLow}-${p.detail.neededHigh})`}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.neededNote}</p>
                    <p className="mt-1">
                      <span className="font-medium">{r.keywordsTitle} : </span>
                      {p.detail.keywords.map((k) => `${k.keyword} (${k.position})`).join(", ")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{r.locked}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-display text-xl font-semibold">{r.targetsTitle}</h2>
        <p className="text-muted-foreground">{r.targetsBody}</p>
        {view.partialLinks ? <p className="text-xs text-muted-foreground">{r.partial}</p> : null}
        <ol className="flex flex-col gap-2">
          {view.targets.map((tg) => (
            <li
              key={tg.index}
              className="flex flex-col gap-0.5 rounded-md border border-border px-3 py-2"
            >
              {tg.locked ? (
                <span
                  aria-label={r.targetMasked}
                  className="font-medium blur-sm select-none"
                  data-locked="true"
                >
                  ••••••••••.•••
                </span>
              ) : (
                <span className="font-medium">{tg.domain}</span>
              )}
              <span className="text-sm text-muted-foreground">
                {tg.citedCompetitors === 1
                  ? r.targetCitesOne
                  : r.targetCitesMany.replace("{n}", String(tg.citedCompetitors))}
                {!tg.locked ? ` (${tg.competitors.join(", ")})` : null}
              </span>
              {!tg.locked ? (
                <span className="text-xs break-all text-muted-foreground">
                  {r.targetExample} : {tg.sampleUrl}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        {view.moreTargets > 0 ? (
          <p className="font-medium">
            +{nf.format(view.moreTargets)} {r.more}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
