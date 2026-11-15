import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/messages";

export type StageState = "attente" | "en_cours" | "termine" | "echoue" | "manuel";

export interface ChainProgressView {
  stages: { key: "discover" | "backlinks" | "profile" | "opportunities"; state: StageState }[];
}

const TONES: Record<StageState, BadgeTone> = {
  attente: "neutral",
  en_cours: "warning",
  termine: "success",
  echoue: "danger",
  manuel: "info",
};

/** Statut brut d'une étape (aucun / confirme / en_cours / termine / echoue) -> état affiché. */
export function stageState(status: string, uncovered: boolean): StageState {
  if (status === "termine") return "termine";
  if (status === "echoue") return "echoue";
  if (status === "en_cours" || status === "confirme") return "en_cours";
  return uncovered ? "manuel" : "attente";
}

/** Progression unique du parcours (MA.6) : une ligne par étape. */
export function chainProgressView(input: {
  auditStatus: string;
  backlinks: string;
  profile: string;
  opportunities: string;
  uncovered: string[];
}): ChainProgressView {
  const discover: StageState =
    input.auditStatus === "termine"
      ? "termine"
      : input.auditStatus === "echoue"
        ? "echoue"
        : "en_cours";
  return {
    stages: [
      { key: "discover", state: discover },
      {
        key: "backlinks",
        state: stageState(input.backlinks, input.uncovered.includes("backlinks")),
      },
      { key: "profile", state: stageState(input.profile, input.uncovered.includes("profile")) },
      {
        key: "opportunities",
        state: stageState(input.opportunities, input.uncovered.includes("opportunities")),
      },
    ],
  };
}

export function ChainProgress({ view }: { view: ChainProgressView }) {
  const c = t.audits.chain;
  const stopped = view.stages.some((s) => s.state === "echoue");
  return (
    <Card className="flex flex-col gap-3 p-6">
      <h2 className="font-display text-xl font-semibold">{c.progressTitle}</h2>
      <p className="text-muted-foreground">{c.progressBody}</p>
      <ol className="flex flex-col gap-2">
        {view.stages.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-4">
            <span>{c.stage[s.key]}</span>
            <Badge tone={TONES[s.state]}>{c.state[s.state]}</Badge>
          </li>
        ))}
      </ol>
      {stopped ? <p className="text-danger">{c.stopped}</p> : null}
    </Card>
  );
}
