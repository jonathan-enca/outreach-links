/**
 * États d'exemple de l'écran « Analyse en cours », pour la page de démonstration (hors production) et les
 * captures d'écran : aucune lecture ni écriture en base, aucun appel. Les compteurs ont la forme exacte de
 * ceux qu'écrit le moteur (`run.ts`, `links-state.ts`) ; les sites sont en `.example` (domaine réservé).
 */
import { ANALYSIS_STEP_KEYS, type AnalysisStepKey, type StepStatus } from "./steps";
import type { AnalysisSnapshot, StepRow } from "./view";

type Partial8 = Partial<
  Record<AnalysisStepKey, [StepStatus, Record<string, number>?, (string | null)?, (string | null)?]>
>;

const rows = (set: Partial8): StepRow[] =>
  ANALYSIS_STEP_KEYS.map((key) => {
    const [status, counters, example, error] = set[key] ?? ["attente"];
    return {
      key,
      status,
      counters: counters ?? {},
      example: example ?? null,
      error: error ?? null,
      startedAt: null,
      finishedAt: null,
    };
  });

const TARGETS = [
  {
    domain: "ecole-des-collines.example",
    siteType: null,
    why: "Page de ressources pour les familles, qui cite déjà plusieurs sites comparables.",
  },
  {
    domain: "le-carnet-de-lea.example",
    siteType: null,
    why: "Billet qui liste des outils gratuits ; un des liens ne répond plus.",
  },
  {
    domain: "mairie-de-valmont.example",
    siteType: null,
    why: "Rubrique « liens utiles » tenue à jour.",
  },
];

const DONE_FIRST: Partial8 = {
  comprendre: ["termine", { done: 9, total: 9, found: 7, redo: 0 }, "Exemple"],
  concurrents: ["termine", { done: 4, total: 4, found: 10, missed: 0 }, "concurrent.example"],
  etat_des_lieux: [
    "termine",
    { done: 3, total: 3, found: 2, keywords: 1 },
    "guide pratique gratuit à imprimer",
  ],
};

export const DEMO_STATES = [
  "demarrage",
  "recherche",
  "lecture",
  "contacts",
  "premieres",
  "terminee",
  "interrompue",
  "ecartee",
  "lent",
] as const;
export type DemoState = (typeof DEMO_STATES)[number];

/** `nowMs` : l'heure du rendu (les durées affichées en dépendent). */
export function demoSnapshot(state: DemoState, nowMs: number = Date.now()): AnalysisSnapshot {
  const ago = (minutes: number) => new Date(nowMs - minutes * 60_000).toISOString();
  const base: AnalysisSnapshot = {
    auditId: "00000000-0000-4000-8000-000000000000",
    siteId: "00000000-0000-4000-8000-000000000001",
    domain: "exemple-site.example",
    status: "en_cours",
    error: null,
    startedAt: ago(1),
    finishedAt: null,
    confirmedAt: ago(1),
    steps: rows({}),
    targets: [],
    targetsCount: 0,
    skipped: null,
    background: null,
  };
  const skipped = { mentions: "nom de marque trop descriptif ou trop court", deadPages: 1 };
  switch (state) {
    case "demarrage":
      return { ...base, status: "confirme", startedAt: null, confirmedAt: ago(0.2) };
    case "lent":
      return { ...base, status: "confirme", startedAt: null, confirmedAt: ago(4) };
    case "recherche":
      return {
        ...base,
        startedAt: ago(2),
        skipped,
        steps: rows({
          ...DONE_FIRST,
          recherche: [
            "en_cours",
            { done: 12, total: 45, found: 340, missed: 0 },
            "ressources gratuites pour débuter",
          ],
        }),
      };
    case "lecture":
      return {
        ...base,
        startedAt: ago(7),
        skipped,
        steps: rows({
          ...DONE_FIRST,
          recherche: [
            "termine",
            { done: 54, total: 54, found: 976, missed: 1 },
            "ressources gratuites pour débuter",
          ],
          tri: ["en_cours", { done: 80, total: 150, kept: 31 }, "le-carnet-de-lea.example"],
        }),
      };
    case "contacts":
      return {
        ...base,
        startedAt: ago(10),
        skipped,
        steps: rows({
          ...DONE_FIRST,
          recherche: ["termine", { done: 54, total: 54, found: 976, missed: 1 }],
          tri: [
            "termine",
            { done: 150, total: 150, kept: 47, judged: 47, to_judge: 47, found: 18 },
          ],
          contacts: ["en_cours", { done: 12, total: 18, found: 10 }, "mairie-de-valmont.example"],
        }),
      };
    case "premieres":
    case "terminee":
      return {
        ...base,
        status: "termine",
        startedAt: ago(13),
        finishedAt: ago(1),
        skipped,
        background: state === "premieres" ? "en_cours" : "termine",
        targets: TARGETS,
        targetsCount: 15,
        steps: rows({
          ...DONE_FIRST,
          recherche: ["termine", { done: 54, total: 54, found: 976, missed: 1 }],
          tri: [
            "termine",
            { done: 150, total: 150, kept: 47, judged: 47, to_judge: 47, found: 18 },
          ],
          contacts: ["termine", { done: 18, total: 18, found: 15 }],
          constats: ["termine", { done: 15, total: 15, found: 3, dead: 7 }],
          demandes: ["termine", { done: 15, total: 15, found: 15 }],
        }),
      };
    case "interrompue":
      return {
        ...base,
        status: "echoue",
        startedAt: ago(9),
        steps: rows({
          ...DONE_FIRST,
          recherche: [
            "echoue",
            { done: 12, total: 45, found: 210 },
            null,
            "L'analyse s'est interrompue avant la fin. Vous pouvez la reprendre : rien de déjà fait n'est refait.",
          ],
        }),
      };
    case "ecartee":
      return {
        ...base,
        status: "termine",
        startedAt: ago(9),
        finishedAt: ago(30),
        background: "termine",
        steps: rows({
          comprendre: DONE_FIRST.comprendre!,
          concurrents: DONE_FIRST.concurrents!,
          etat_des_lieux: [
            "echoue",
            {},
            null,
            "Vos liens actuels n'ont pas pu être mesurés. L'analyse continue sans cette mesure.",
          ],
          recherche: ["termine", { done: 41, total: 45, found: 388, missed: 0 }],
          tri: ["termine", { done: 150, total: 150, kept: 40, judged: 40, to_judge: 40, found: 0 }],
          contacts: ["termine", { done: 0, total: 0, found: 0 }],
          constats: ["saute"],
          demandes: ["termine", { done: 0, total: 0, found: 0 }],
        }),
      };
  }
}
