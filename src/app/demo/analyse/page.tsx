import { notFound } from "next/navigation";
import { AnalysisProgress } from "@/features/analysis/analysis-progress";
import { DEMO_STATES, demoSnapshot, type DemoState } from "@/features/analysis/demo-snapshots";
import { PageHeader } from "@/components/page-header";
import { t } from "@/lib/messages";

export const dynamic = "force-dynamic";

/**
 * Démonstration de l'écran « Analyse en cours » : `/demo/analyse?etat=lecture`. Sert aux captures d'écran
 * et aux relectures de design. Données d'exemple seulement (aucune base, aucun appel) ; absente en production.
 */
export default async function DemoAnalysePage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { etat } = await searchParams;
  const state = (DEMO_STATES as readonly string[]).includes(etat ?? "")
    ? (etat as DemoState)
    : "lecture";
  const snapshot = demoSnapshot(state);
  async function idle() {
    "use server";
    return { status: "idle" as const };
  }
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title={`${t.audits.analysisTitle} ${snapshot.domain}`}
        description={t.analysis.screen.intro}
      />
      <script
        id="demo-snapshot"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(snapshot).replace(/</g, "\\u003c") }}
      />
      <AnalysisProgress
        initial={snapshot}
        resumeAction={idle}
        restartAction={idle}
        relaunchAction={idle}
        emailEnabled
        autoOpen={false}
      />
    </main>
  );
}
