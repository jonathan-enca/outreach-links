import type { BadgeTone } from "@/components/ui/badge";
import { t } from "@/lib/messages";

/** Une tâche manuelle (formulaire de contact) telle qu'affichée. */
export interface TaskView {
  id: string;
  domain: string;
  formUrl: string;
  targetUrl: string;
  /** Message initial (le brouillon validé du lot). */
  message: string;
  status: string;
  doneAt: string | null;
  followUpStatus: string | null;
  followUpDueAt: string | null;
  followUpMessage: string | null;
  followUpDoneAt: string | null;
  followUpCancelReason: string | null;
}

export type TaskState =
  "a_faire" | "attente_relance" | "relance_due" | "relance_faite" | "relance_annulee" | "ignoree";

/** État lisible d'une tâche ; la relance est « due » quand sa date est passée. */
export function taskState(
  r: Pick<TaskView, "status" | "followUpStatus" | "followUpDueAt">,
  now: Date,
): TaskState {
  if (r.status === "ignoree") return "ignoree";
  if (r.status !== "fait") return "a_faire";
  if (r.followUpStatus === "fait") return "relance_faite";
  if (r.followUpStatus === "annulee") return "relance_annulee";
  const due = r.followUpDueAt ? new Date(r.followUpDueAt) : null;
  return due && due <= now ? "relance_due" : "attente_relance";
}

export const STATE_TONES: Record<TaskState, BadgeTone> = {
  a_faire: "warning",
  relance_due: "warning",
  attente_relance: "info",
  relance_faite: "success",
  relance_annulee: "neutral",
  ignoree: "neutral",
};

export type TaskGroup = "toDo" | "followUp" | "waiting" | "closed";

const GROUP: Record<TaskState, TaskGroup> = {
  a_faire: "toDo",
  relance_due: "followUp",
  attente_relance: "waiting",
  relance_faite: "closed",
  relance_annulee: "closed",
  ignoree: "closed",
};

export function groupTasks(
  rows: readonly TaskView[],
  now: Date,
): Record<TaskGroup, (TaskView & { state: TaskState })[]> {
  const out: Record<TaskGroup, (TaskView & { state: TaskState })[]> = {
    toDo: [],
    followUp: [],
    waiting: [],
    closed: [],
  };
  for (const r of rows) {
    const state = taskState(r, now);
    out[GROUP[state]].push({ ...r, state });
  }
  return out;
}

/** Texte de rappel (page, digest) ; vide s'il n'y a rien à faire. */
export function reminderText(c: { toDo: number; followUps: number }): string {
  const S = t.tasks.summary;
  const parts: string[] = [];
  if (c.toDo > 0) parts.push(S.toDo.replace("{n}", String(c.toDo)));
  if (c.followUps > 0) parts.push(S.followUp.replace("{n}", String(c.followUps)));
  return parts.length > 0 ? parts.join(" · ") : S.none;
}
