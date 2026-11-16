import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteHref } from "@/features/shell/next-step";
import { t } from "@/lib/messages";
import { BacklinksSection, type BacklinksView } from "@/features/backlinks/backlinks-section";
import {
  OpportunitiesSection,
  type OpportunitiesView,
} from "@/features/opportunities/opportunities-section";
import { DeadlinksSection, type DeadlinksView } from "@/features/deadlinks/deadlinks-section";
import { ProfileSection, type ProfileView } from "@/features/profile/profile-section";
import { AutoRefresh } from "@/features/public-audit/auto-refresh";
import { AuditStatusBadge } from "./audit-status-badge";
import type { ChainEstimate } from "./chain";
import { ChainProgress, type ChainProgressView } from "./chain-progress";
import { ConfirmAuditPanel } from "./confirm-audit-panel";
import type { AuditActionState } from "./service";

export interface AuditView {
  id: string;
  siteId: string;
  /** Analyse unique (MU.1) : `aucun` pour un ancien audit ou un audit pas encore confirmé. */
  analysisStatus?: string;
  domain: string;
  status: string;
  plan: string;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  costCapUsd: number;
  perQuery: { query: string; usd: number }[];
  /** Coût de tout le parcours (MA.6), absent sur les anciens audits. */
  chain?: ChainEstimate | null;
  /** Progression du parcours unique, seulement si l'audit est en enchaînement automatique. */
  chainProgress?: ChainProgressView | null;
  errorMessage: string | null;
  /** Étape backlinks (M1.4), seulement pour un audit terminé. */
  backlinks?: BacklinksView;
  /** Profil de liens, écart et pages (M1.5), après les backlinks. */
  profile?: ProfileView;
  /** Opportunités de liens (M2.1), après le profil de liens. */
  opportunities?: OpportunitiesView;
  /** Chasseur 404 (M2.2), après les opportunités. */
  deadlinks?: DeadlinksView;
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
  startProfileAction,
  startOpportunitiesAction,
  startDeadlinksAction,
}: {
  audit: AuditView;
  confirmAction: (prev: AuditActionState) => Promise<AuditActionState>;
  startBacklinksAction?: (prev: AuditActionState) => Promise<AuditActionState>;
  startProfileAction?: (prev: AuditActionState) => Promise<AuditActionState>;
  startOpportunitiesAction?: (prev: AuditActionState) => Promise<AuditActionState>;
  startDeadlinksAction?: (prev: AuditActionState) => Promise<AuditActionState>;
}) {
  const r = t.audits.result;
  const analysis = audit.analysisStatus ?? "aucun";
  const awaitingConfirm =
    analysis === "aucun" && (audit.status === "estime" || audit.status === "confirme");
  return (
    <div className="flex flex-col gap-6">
      {analysis === "aucun" ? (
        <div className="flex items-center gap-3">
          <AuditStatusBadge status={audit.status} />
        </div>
      ) : null}

      {audit.chainProgress && audit.status !== "estime" ? (
        <ChainProgress view={audit.chainProgress} />
      ) : null}
      {audit.chainProgress?.stages.some((s) => s.state === "en_cours") ? <AutoRefresh /> : null}

      {awaitingConfirm && audit.estimatedCostUsd !== null ? (
        <ConfirmAuditPanel confirmed={audit.status === "confirme"} action={confirmAction} />
      ) : null}

      {analysis === "confirme" || analysis === "en_cours" ? (
        <>
          <AutoRefresh />
          <Card className="flex flex-col gap-1 p-6">
            <h2 className="font-display text-xl font-semibold">{t.audits.analysisRunning.title}</h2>
            <p className="text-muted-foreground">{t.audits.analysisRunning.body}</p>
          </Card>
        </>
      ) : null}

      {analysis === "echoue" ? (
        <>
          <Card className="flex flex-col gap-1 p-6">
            <h2 className="font-display text-xl font-semibold text-danger">
              {t.audits.analysisFailed.title}
            </h2>
            <p className="text-muted-foreground">{t.audits.analysisFailed.body}</p>
            {audit.errorMessage ? <p className="text-sm">{audit.errorMessage}</p> : null}
          </Card>
          <ConfirmAuditPanel resume confirmed action={confirmAction} />
        </>
      ) : null}

      {analysis === "termine" ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <h2 className="font-display text-xl font-semibold">{t.audits.analysisDone.title}</h2>
          <p className="text-muted-foreground">{t.audits.analysisDone.body}</p>
          <Button asChild>
            <Link href={siteHref.cibles(audit.siteId)}>{t.audits.analysisDone.cta}</Link>
          </Button>
        </Card>
      ) : null}

      {analysis === "aucun" && audit.status === "en_cours" ? (
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="font-display text-xl font-semibold">{t.audits.running.title}</h2>
          <p className="text-muted-foreground">{t.audits.running.body}</p>
        </Card>
      ) : null}

      {analysis === "aucun" && audit.status === "echoue" ? (
        <Card className="flex flex-col gap-1 p-6">
          <h2 className="font-display text-xl font-semibold text-danger">
            {t.audits.failed.title}
          </h2>
          <p className="text-muted-foreground">{t.audits.failed.body}</p>
          {audit.errorMessage ? <p className="text-sm">{audit.errorMessage}</p> : null}
        </Card>
      ) : null}

      {analysis === "aucun" && audit.status === "termine" ? (
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
          {audit.backlinks && startBacklinksAction ? (
            <BacklinksSection view={audit.backlinks} startAction={startBacklinksAction} />
          ) : null}
          {audit.backlinks?.status === "termine" && audit.profile && startProfileAction ? (
            <ProfileSection view={audit.profile} startAction={startProfileAction} />
          ) : audit.backlinks && audit.backlinks.status !== "termine" ? (
            <Card className="p-6 text-muted-foreground">{t.profile.needsBacklinks}</Card>
          ) : null}
          {audit.profile?.status === "termine" &&
          audit.opportunities &&
          startOpportunitiesAction ? (
            <OpportunitiesSection
              view={audit.opportunities}
              startAction={startOpportunitiesAction}
            />
          ) : audit.profile && audit.profile.status !== "termine" ? (
            <Card className="p-6 text-muted-foreground">{t.opportunities.needsProfile}</Card>
          ) : null}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
            <p className="text-muted-foreground">{t.targets.description}</p>
            <Link
              href={siteHref.cibles(audit.siteId)}
              className="font-semibold underline underline-offset-4"
            >
              {t.targets.title}
            </Link>
          </Card>
          {audit.opportunities?.status === "termine" ? (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
              <p className="text-muted-foreground">{t.plan.description}</p>
              <Link
                href={`/app/audit/${audit.id}/plan`}
                className="font-semibold underline underline-offset-4"
              >
                {t.plan.open}
              </Link>
            </Card>
          ) : null}
          {audit.opportunities?.status === "termine" && audit.deadlinks && startDeadlinksAction ? (
            <DeadlinksSection view={audit.deadlinks} startAction={startDeadlinksAction} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
