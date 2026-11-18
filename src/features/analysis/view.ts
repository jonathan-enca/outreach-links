/**
 * MU.3 : ce que l'écran « Analyse en cours » montre, calculé à partir de lignes de base (pur, testé).
 * Le même calcul sert au rendu serveur (premier affichage) et au navigateur (toutes les 3 secondes).
 * Textes revus le 18/11/2026 : chaque chiffre affiché porte le nom de ce que le moteur mesure
 * (PROGRESS.md, « Refonte de l'écran d'analyse », tableau d'audit).
 */
import { AUTO_LIMITS } from "@/features/qualification/background";
import { t } from "@/lib/messages";
import {
  ANALYSIS_STEP_KEYS,
  PARALLEL_STEP,
  stepPosition,
  type AnalysisStatus,
  type AnalysisStepKey,
  type StepStatus,
} from "./steps";

export interface StepRow {
  key: AnalysisStepKey;
  status: StepStatus;
  counters: Record<string, number>;
  example: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TargetRow {
  domain: string;
  siteType: string | null;
  why: string | null;
}

/** Ce que le plan de recherche n'a pas lancé, faute de chance de résultat (lecture seule du plan figé). */
export interface SkippedSearches {
  /** Raison lisible pour laquelle la recherche de mentions de marque n'est pas lancée, sinon null. */
  mentions: string | null;
  /** Nombre de concurrents chez qui les liens morts ne sont pas cherchés. */
  deadPages: number;
}

/** Lecture des autres sites trouvés, après la première liste (`qualification_runs.auto_status`). */
export type BackgroundStatus = "aucun" | "en_cours" | "termine" | "echoue";

/** Ce que renvoie la route d'état (JSON) et ce que le serveur lit pour le premier affichage. */
export interface AnalysisSnapshot {
  auditId: string;
  siteId: string;
  domain: string;
  status: AnalysisStatus;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  /** Date du dernier lancement (ou de la dernière reprise) : sert à repérer un démarrage bloqué. */
  confirmedAt?: string | null;
  steps: StepRow[];
  /** Cibles de la liste courte déjà prêtes (les premières, dans l'ordre du classement). */
  targets: TargetRow[];
  /** Nombre total de cibles prêtes (le tableau `targets` n'en montre que quelques-unes). */
  targetsCount: number;
  skipped?: SkippedSearches | null;
  background?: BackgroundStatus | null;
  /** Un lot « Lire d'autres sites » est demandé ou en cours (`qualification_runs.more_status`). */
  moreRunning?: boolean;
}

/**
 * Durées médianes (secondes) des trois analyses complètes en base au 18/11/2026 (mega-coloring.com
 * 16/11 et 18/11, remove-me.io 17/11 : 11 à 15 minutes) : le poids de chaque étape dans la durée
 * totale. La mesure des liens tourne en parallèle : elle ne compte pas dans le temps restant.
 */
export const STEP_WEIGHTS: Record<AnalysisStepKey, number> = {
  comprendre: 10,
  concurrents: 40,
  etat_des_lieux: 0,
  recherche: 280,
  tri: 300,
  contacts: 25,
  constats: 105,
  demandes: 2,
};
const TOTAL_WEIGHT = Object.values(STEP_WEIGHTS).reduce((a, b) => a + b, 0);

/** Durée annoncée tant qu'on ne sait rien de mieux (secondes). */
export const DEFAULT_DURATION_SECONDS = TOTAL_WEIGHT;

/** Part d'une étape déjà faite (0 à 1), d'après ses compteurs. */
export function stepFraction(step: Pick<StepRow, "status" | "counters">): number {
  if (step.status === "termine" || step.status === "saute") return 1;
  if (step.status !== "en_cours") return 0;
  const c = step.counters;
  const ratio = (done?: number, total?: number) =>
    done !== undefined && total ? Math.min(1, done / total) : null;
  const r = ratio(c.judged, c.to_judge) ?? ratio(c.done, c.total);
  // Une étape sans compteur exploitable : on la compte « commencée » sans promettre davantage.
  return r === null ? 0.1 : Math.min(0.95, r);
}

export interface StepView {
  key: AnalysisStepKey;
  /** Rang affiché (1 à 8). */
  position: number;
  label: string;
  status: StepStatus;
  /** Tourne à côté des autres : son échec n'arrête rien. */
  parallel: boolean;
  /** Le résultat en une ligne (« 54 recherches · 976 sites trouvés ») ; null tant qu'il n'y a rien à montrer. */
  counter: string | null;
  /** Exemple étiqueté (« Dernière recherche : … ») ; jamais un mot nu dont on ignore la nature. */
  example: string | null;
  /** Phrases d'explication : ce que le chiffre veut dire, ce qui a été écarté et pourquoi. */
  notes: string[];
  /** Avancement propre à l'étape en cours (0 à 100), ou null si aucun compteur ne le donne. */
  progress: number | null;
  error: string | null;
  /** « 1 recherche n'a pas abouti » : appels manqués du fournisseur, l'analyse a continué. */
  missed: string | null;
  /** Le bouton « Reprendre à partir d'ici » a un sens ici (étape commencée, analyse à l'arrêt). */
  canRestart: boolean;
}

/** Délai au-delà duquel une analyse confirmée sans aucune étape est dite « lente à démarrer ». */
export const SLOW_START_MS = 2 * 60_000;
/** Part de la barre réservée à la première liste ; le reste avance pendant la lecture des autres sites. */
export const FIRST_PASS_PERCENT = 90;
/** Durée maximale de la lecture des autres sites (`AUTO_LIMITS.maxMs`), pour faire avancer la barre. */
const BACKGROUND_MAX_MS = AUTO_LIMITS.maxMs;
/** Après la fin, délai pendant lequel la lecture des autres sites peut encore ne pas avoir démarré. */
export const BACKGROUND_GRACE_MS = 5 * 60_000;

/** Du plus large au plus précis ; null = pas encore mesuré (« à venir »). */
export interface FunnelView {
  found: number;
  read: number | null;
  kept: number | null;
  targets: number | null;
}

export interface AnalysisView {
  status: AnalysisStatus;
  /** Tant que vrai, l'écran interroge la route d'état. */
  active: boolean;
  steps: StepView[];
  percent: number;
  /** Ce qui se passe maintenant, en une phrase. */
  headline: string;
  /** Minutes restantes (arrondies au-dessus), ou null si on ne sait pas / si c'est fini. */
  remainingMinutes: number | null;
  /** Fourchette affichée [bas, haut] en minutes. */
  remainingRange: [number, number] | null;
  funnel: FunnelView | null;
  targets: TargetRow[];
  targetsCount: number;
  failedStep: StepView | null;
  /** Confirmée depuis plus de 2 minutes sans aucune étape commencée. */
  slowStart: boolean;
  /** Analyse finie, mais la lecture des autres sites trouvés tourne (ou va démarrer) : « terminée » n'est pas encore dit. */
  backgroundPending: boolean;
  /** Étapes qui ont abouti (pour dire « ce qui a marché » en cas d'échec). */
  doneLabels: string[];
}

const R = t.analysis.screen.results;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const join = (parts: (string | null | undefined)[]): string | null => {
  const kept = parts.filter((p): p is string => Boolean(p));
  return kept.length ? kept.join(" · ") : null;
};
const has = (n: number | undefined): n is number => n !== undefined;

/**
 * Le résultat d'une étape en une ligne ; null s'il n'y a aucun compteur à montrer (jamais « 0 » inventé).
 * Ce que chaque compteur mesure est écrit par `run.ts` et `links-state.ts` : voir le tableau d'audit.
 */
export function counterText(
  key: AnalysisStepKey,
  c: Record<string, number>,
  status: StepStatus = "en_cours",
): string | null {
  const over = status === "termine";
  switch (key) {
    case "comprendre":
      // `found` = contenus du site à proposer (pas les pages lues, comptées dans `done`).
      return over ? R.understood(c.found ?? 0) : null;
    case "concurrents": {
      if (over) return has(c.found) ? R.competitors(c.found) : null;
      // `total` = recherches Google + 1 mesure de taille.
      if (!has(c.done) || !c.total) return null;
      const searches = c.total - 1;
      return searches > 0 && c.done < searches
        ? R.competitorSearch(c.done + 1, searches)
        : R.competitorSizing;
    }
    case "etat_des_lieux": {
      // `found` = sites qui font un lien vers le site ; `keywords` = recherches où il apparaît.
      const parts = join([
        has(c.found) ? R.linksReferring(c.found) : null,
        c.keywords ? R.linksKeywords(c.keywords) : null,
      ]);
      if (parts) return parts;
      if (over) return R.linksMeasured;
      return has(c.done) && c.total ? R.linksMeasuring(c.done, c.total) : null;
    }
    case "recherche": {
      // `total` n'est qu'une prévision : des recherches s'ajoutent en route, d'autres sont abandonnées.
      const found = has(c.found) && (c.found > 0 || has(c.done)) ? R.sitesFound(c.found) : null;
      if (over) return join([c.done ? R.searched(c.done) : null, found]);
      return join([has(c.done) && c.total ? R.searching(c.done, c.total) : null, found]);
    }
    case "tri": {
      if (over) {
        return has(c.done) && c.done > 0
          ? join([R.read(c.done), has(c.found) ? R.kept(c.found) : null])
          : has(c.found)
            ? R.keptPages(c.found)
            : null;
      }
      if (c.to_judge) {
        return join([R.judging(c.judged ?? 0, c.to_judge), has(c.found) ? R.kept(c.found) : null]);
      }
      return has(c.done) && c.total
        ? join([R.reading(c.done, c.total), has(c.kept) ? R.readable(c.kept) : null])
        : null;
    }
    case "contacts": {
      if (over) {
        if (!has(c.done)) return null;
        return c.done === 0
          ? R.noSiteToCheck
          : join([R.checked(c.done), has(c.found) ? R.contacts(c.found) : null]);
      }
      return has(c.done) && c.total
        ? join([R.checking(c.done, c.total), has(c.found) ? R.contacts(c.found) : null])
        : null;
    }
    case "constats": {
      if (over) {
        return join([c.done ? R.reread(c.done) : null, has(c.found) ? R.occasions(c.found) : null]);
      }
      return has(c.done) && c.total ? R.rereading(c.done, c.total) : null;
    }
    case "demandes":
      return over && has(c.found) ? R.ready(c.found) : null;
  }
}

/** L'exemple, étiqueté selon ce qu'il est vraiment ; null si sa nature n'est pas sûre ou s'il n'apporte rien. */
export function exampleText(key: AnalysisStepKey, example: string | null): string | null {
  const ex = example?.trim();
  if (!ex) return null;
  const isDomain = DOMAIN_RE.test(ex);
  switch (key) {
    case "etat_des_lieux":
      // Tantôt un site qui cite le site, tantôt sa recherche la plus populaire : seule la seconde est montrée.
      return isDomain ? null : R.linksTopKeyword(ex);
    case "recherche":
      return isDomain ? R.lastSite(ex) : R.lastSearch(ex);
    case "tri":
      return R.pageRead(ex);
    case "contacts":
      return R.siteChecked(ex);
    case "constats":
      return R.pageReread(ex);
    default:
      // Nom du site, premier concurrent : un mot isolé n'aide pas (retour de Jonathan, 18/11).
      return null;
  }
}

function notesFor(
  key: AnalysisStepKey,
  status: StepStatus,
  c: Record<string, number>,
  skipped: SkippedSearches | null,
): string[] {
  const out: string[] = [];
  if (status === "saute") {
    return [key === "constats" ? R.rereadSkipped : R.skippedGeneric];
  }
  if (status === "attente" || status === "echoue") return out;
  if (key === "comprendre" && status === "termine") out.push(R.understoodNote);
  if (key === "concurrents" && status === "termine" && (c.found ?? 0) > 0) {
    out.push(R.competitorsNote);
  }
  if (key === "tri" && status === "en_cours" && !c.to_judge && c.total) out.push(R.readingNote);
  if (key === "recherche" && skipped) {
    if (skipped.mentions) out.push(R.skippedMentions(skipped.mentions.replace(/[.\s]+$/, "")));
    if (skipped.deadPages > 0) out.push(R.skippedDead(skipped.deadPages));
  }
  return out;
}

export function buildAnalysisView(s: AnalysisSnapshot, now: Date = new Date()): AnalysisView {
  const byKey = new Map(s.steps.map((r) => [r.key, r]));
  const L = t.analysis.steps;
  const S = t.analysis.screen;
  const steps: StepView[] = ANALYSIS_STEP_KEYS.map((key) => {
    const r = byKey.get(key);
    const status: StepStatus = r?.status ?? "attente";
    const shown = r && status !== "attente" && status !== "saute";
    const fraction = r && status === "en_cours" ? stepFraction(r) : null;
    return {
      key,
      position: stepPosition(key),
      label: L[key],
      status,
      parallel: key === PARALLEL_STEP,
      counter: shown ? counterText(key, r.counters, status) : null,
      example: shown && status !== "echoue" ? exampleText(key, r.example) : null,
      notes: notesFor(key, status, r?.counters ?? {}, s.skipped ?? null),
      // 0,1 = « commencée, sans compteur » : pas de barre plutôt qu'une barre inventée.
      progress: fraction !== null && fraction !== 0.1 ? Math.round(fraction * 100) : null,
      error: status === "echoue" ? r?.error || null : null,
      missed:
        r && status !== "attente" && (r.counters.missed ?? 0) > 0
          ? S.missed(r.counters.missed!)
          : null,
      canRestart: false,
    };
  });
  // Reprendre à partir d'une étape : seulement après un ÉCHEC. Sur une analyse terminée, le bouton effaçait
  // les cibles déjà livrées et repayait les étapes suivantes (retour de Jonathan, 18/11) : retiré.
  const stopped = s.status === "echoue";
  for (const step of steps) {
    step.canRestart = stopped && step.status !== "attente" && step.key !== PARALLEL_STEP;
  }

  const finished = s.status === "termine";
  const sequential = ANALYSIS_STEP_KEYS.filter((k) => k !== PARALLEL_STEP);
  let doneWeight = 0;
  for (const k of sequential) {
    const r = byKey.get(k);
    doneWeight += STEP_WEIGHTS[k] * (r ? stepFraction(r) : 0);
  }
  // « Terminée » n'est dit que lorsque la lecture des autres sites est finie (décision de Jonathan, 18/11) :
  // d'ici là l'écran reste « en cours », la barre avance encore et le nombre de cibles n'est pas dit final.
  // Entre la fin de l'analyse et le démarrage de cette lecture, son état est encore « aucun » : on attend
  // quelques minutes avant de conclure qu'elle n'aura pas lieu.
  const finishedMs = s.finishedAt ? Date.parse(s.finishedAt) : NaN;
  const sinceFinish = Number.isFinite(finishedMs) ? Math.max(0, now.getTime() - finishedMs) : 0;
  const backgroundPending =
    finished &&
    (s.background === "en_cours" ||
      s.moreRunning === true ||
      (s.background === "aucun" &&
        Number.isFinite(finishedMs) &&
        sinceFinish < BACKGROUND_GRACE_MS));

  const fraction = doneWeight / TOTAL_WEIGHT;
  const rest = 100 - FIRST_PASS_PERCENT;
  const percent = finished
    ? backgroundPending
      ? FIRST_PASS_PERCENT +
        Math.min(rest - 1, Math.floor((rest * sinceFinish) / BACKGROUND_MAX_MS))
      : 100
    : s.status === "aucun"
      ? 0
      : Math.round(FIRST_PASS_PERCENT * fraction);

  let remainingMinutes: number | null = null;
  if (s.status === "confirme" || s.status === "en_cours") {
    let seconds = TOTAL_WEIGHT - doneWeight;
    const startedMs = s.startedAt ? Date.parse(s.startedAt) : NaN;
    // Assez avancée : la vitesse réelle de CETTE analyse vaut mieux que les durées mesurées avant.
    if (fraction >= 0.15 && Number.isFinite(startedMs)) {
      const elapsed = Math.max(0, (now.getTime() - startedMs) / 1000);
      seconds = (elapsed * (1 - fraction)) / fraction;
    }
    remainingMinutes = Math.max(1, Math.ceil(seconds / 60));
  }
  const remainingRange: [number, number] | null =
    remainingMinutes === null
      ? null
      : [Math.max(1, Math.round(remainingMinutes * 0.8)), Math.ceil(remainingMinutes * 1.25)];

  const rech = byKey.get("recherche")?.counters ?? {};
  const triRow = byKey.get("tri");
  const tri = triRow?.counters ?? {};
  const contactsStatus = byKey.get("contacts")?.status ?? "attente";
  const found = rech.found ?? 0;
  const judged = triRow?.status === "termine" || Boolean(tri.to_judge);
  const funnel: FunnelView | null =
    found > 0
      ? {
          found,
          // `done` du tri = pages lues ; `found` du tri = pages retenues (seulement une fois évaluées).
          read: triRow && triRow.status !== "attente" && has(tri.done) ? tri.done : null,
          kept: judged && has(tri.found) ? tri.found : null,
          targets:
            finished || s.targetsCount > 0 || contactsStatus === "termine" ? s.targetsCount : null,
        }
      : null;

  const confirmedMs = s.confirmedAt ? Date.parse(s.confirmedAt) : NaN;
  const slowStart =
    s.status === "confirme" &&
    s.steps.every((r) => r.status === "attente") &&
    Number.isFinite(confirmedMs) &&
    now.getTime() - confirmedMs > SLOW_START_MS;

  // Le nombre de cibles grossit pendant la lecture des autres sites : la dernière étape suit le compte réel.
  const last = steps.find((x) => x.key === "demandes");
  if (finished && last && last.status === "termine") {
    last.counter = backgroundPending ? R.readySoFar(s.targetsCount) : R.ready(s.targetsCount);
  }

  const current = steps.find((x) => x.status === "en_cours" && !x.parallel);
  const anyStarted = steps.some((x) => x.status !== "attente");
  const headline = backgroundPending
    ? S.continuingTitle
    : current
      ? S.now[current.key]
      : anyStarted
        ? S.now.between
        : S.starting;

  const failedStep = steps.find((x) => x.status === "echoue" && !x.parallel) ?? null;
  return {
    status: s.status,
    active: s.status === "confirme" || s.status === "en_cours",
    steps,
    percent,
    headline,
    remainingMinutes,
    remainingRange,
    funnel,
    targets: s.targets,
    targetsCount: s.targetsCount,
    failedStep,
    slowStart,
    backgroundPending,
    doneLabels: steps.filter((x) => x.status === "termine").map((x) => x.label),
  };
}
