import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";
import { BacklinksSection, type BacklinksView } from "@/features/backlinks/backlinks-section";
import { AuditStatusBadge } from "./audit-status-badge";
import { ConfirmAuditPanel } from "./confirm-audit-panel";
import { formatUsd } from "./format";
import type { AuditActionState } from "./service";

export interface AuditView {
  id: string;
  domain: string;
  status: string;
  plan: string;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  costCapUsd: number;
  perQuery: { query: string; usd: number }[];
  errorMessage: string | null;
  /** Étape backlinks (M1.4), seulement pour un audit terminé. */
  backlinks?: BacklinksView;
  competitors: {
    domain: string;
    queriesCount: number;
    bestRank: number;
    appearances: number;
    selected: boolean;
  }[];
}

/** Rendu pur d'un audit (testable sans Supabase). */
export function AuditDetail({
  audit,
  confirmAction,
  startBacklinksAction,
}: {
  audit: AuditView;
  confirmAction: (prev: AuditActionState) => Promise<AuditActionState>;
  startBacklinksAction?: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const r = t.audits.result;
  const awaitingConfirm = audit.status === "estime" || audit.status === "confirme";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <AuditStatusBadge status={audit.status} />
      </div>

      {awaitingConfirm && audit.estimatedCostUsd !== null ? (
        <ConfirmAuditPanel
          estimatedUsd={audit.estimatedCostUsd}
          capUsd={audit.costCapUsd}
          perQuery={audit.perQuery}
          confirmed={audit.status === "confirme"}
          action={confirmAction}
        />
      ) : null}

      {audit.status === "en_cours" ? (
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="font-display text-xl font-semibold">{t.audits.running.title}</h2>
          <p className="text-muted-foreground">{t.audits.running.body}</p>
        </Card>
      ) : null}

      {audit.status === "echoue" ? (
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="font-display text-xl font-semibold text-danger">
            {t.audits.failed.title}
          </h2>
          <p className="text-muted-foreground">{t.audits.failed.body}</p>
          {audit.errorMessage ? <p className="text-sm">{audit.errorMessage}</p> : null}
        </Card>
      ) : null}

      {audit.status === "termine" ? (
        <>
          <Card className="flex flex-col gap-3 p-6">
            <h2 className="font-display text-xl font-semibold">{r.title}</h2>
            <p className="text-muted-foreground">{r.body}</p>
            {audit.competitors.length === 0 ? (
              <p>{r.none}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{r.domain}</th>
                      <th className="py-2 pr-4 font-medium">{r.queries}</th>
                      <th className="py-2 pr-4 font-medium">{r.bestRank}</th>
                      <th className="py-2 pr-4 font-medium">{r.appearances}</th>
                      <th className="py-2 font-medium">{r.selected}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.competitors.map((c) => (
                      <tr key={c.domain} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 font-medium">{c.domain}</td>
                        <td className="py-2 pr-4">{c.queriesCount}</td>
                        <td className="py-2 pr-4">{c.bestRank}</td>
                        <td className="py-2 pr-4">{c.appearances}</td>
                        <td className="py-2">
                          <Badge tone={c.selected ? "success" : "neutral"}>
                            {c.selected ? r.yes : r.no}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {audit.plan === "gratuit" ? (
              <p className="text-sm text-muted-foreground">{r.freeNote}</p>
            ) : null}
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="font-display text-xl font-semibold">{r.costTitle}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:max-w-md">
              <dt className="text-muted-foreground">{r.estimatedCost}</dt>
              <dd>{formatUsd(audit.estimatedCostUsd)}</dd>
              <dt className="text-muted-foreground">{r.actualCost}</dt>
              <dd className="font-semibold">{formatUsd(audit.actualCostUsd)}</dd>
              <dt className="text-muted-foreground">{r.gap}</dt>
              <dd>
                {audit.estimatedCostUsd !== null && audit.actualCostUsd !== null
                  ? formatUsd(audit.actualCostUsd - audit.estimatedCostUsd)
                  : "-"}
              </dd>
            </dl>
          </Card>
          {audit.backlinks && startBacklinksAction ? (
            <BacklinksSection view={audit.backlinks} startAction={startBacklinksAction} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
