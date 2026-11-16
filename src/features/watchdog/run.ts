import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { isStuck, referenceTime, WATCHDOG_LIMITS, WATCHED_STEPS, type StepDef } from "./steps";

type Row = Record<string, unknown>;
type DoneEvent = { created_at: string; payload: Row | null };

export interface WatchdogAction {
  step: string;
  id: string;
  action: "repare" | "echoue";
  statusBefore: string;
  /** Début de l'étape (ISO). */
  since: string;
}

export interface WatchdogReport {
  examined: number;
  actions: WatchdogAction[];
}

export interface WatchdogOptions {
  now?: () => Date;
  steps?: readonly StepDef[];
  /** Appelé après la réparation d'une étape d'audit : relance l'enchaînement (MA.6). Ne doit pas lever. */
  onAuditRepaired?: (auditId: string) => Promise<void>;
}

/** L'événement de fin de l'étape, s'il a été écrit après son début (le job a donc abouti). */
async function findDoneEvent(
  db: SupabaseClient,
  def: StepDef,
  row: Row,
  sinceIso: string,
): Promise<DoneEvent | null> {
  if (!def.doneEvent || typeof row.workspace_id !== "string") return null;
  const { data } = await db
    .from("events")
    .select("created_at, payload")
    .eq("workspace_id", row.workspace_id)
    .eq("type", def.doneEvent)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(50);
  const id = row[def.idCol];
  return (
    ((data ?? []) as DoneEvent[]).find((e) => (e.payload as Row | null)?.audit_id === id) ?? null
  );
}

/**
 * Chien de garde (MU.0). Pour chaque étape longue restée « en vol » au-delà de son délai :
 *  - si le job a écrit son événement de fin, le statut est RÉPARÉ (« termine ») : c'est le cas
 *    « affichée en cours alors qu'elle est finie » ;
 *  - sinon l'étape passe à « echoue » avec un message clair, ce qui rend la main à l'utilisateur
 *    (les boutons de relance réapparaissent) au lieu de le laisser attendre.
 * Aucun appel payant, aucune relance automatique d'une étape échouée. Chaque écriture est gardée
 * par le statut lu : un job qui termine entre-temps garde le dernier mot. Idempotent.
 */
export async function runWatchdog(
  service: SupabaseClient<Database>,
  opts: WatchdogOptions = {},
): Promise<WatchdogReport> {
  // Tables et colonnes viennent du registre : accès non typé, borné aux noms déclarés dans `steps.ts`.
  const db = service as unknown as SupabaseClient;
  const now = (opts.now ?? (() => new Date()))();
  const report: WatchdogReport = { examined: 0, actions: [] };

  for (const def of opts.steps ?? WATCHED_STEPS) {
    const { data, error } = await db
      .from(def.table)
      .select("*")
      .in(def.statusCol, [...def.running])
      .limit(WATCHDOG_LIMITS.maxRowsPerStep);
    if (error) {
      logger.error("chien de garde : lecture impossible", { step: def.key, error: error.message });
      continue;
    }
    for (const row of (data ?? []) as Row[]) {
      report.examined++;
      if (!isStuck(def, row, now.getTime())) continue;
      const id = String(row[def.idCol]);
      const statusBefore = String(row[def.statusCol]);
      const since = new Date(referenceTime(def, row)!).toISOString();
      const done = await findDoneEvent(db, def, row, since);

      const patch: Row = done
        ? { [def.statusCol]: "termine", [def.finishedCol]: done.created_at, [def.errorCol]: null }
        : {
            [def.statusCol]: "echoue",
            [def.finishedCol]: now.toISOString(),
            [def.errorCol]: t.watchdog.stuck,
          };
      if (done && def.restore) {
        for (const [col, key] of Object.entries(def.restore)) {
          const v = done.payload?.[key];
          if (row[col] == null && v != null) patch[col] = v;
        }
      }
      const upd = await db
        .from(def.table)
        .update(patch)
        .eq(def.idCol, id)
        .eq(def.statusCol, statusBefore)
        .select(def.idCol);
      if (upd.error) {
        logger.error("chien de garde : écriture impossible", {
          step: def.key,
          id,
          error: upd.error.message,
        });
        continue;
      }
      if (!upd.data?.length) continue; // le job a écrit entre-temps : rien à faire

      const action: WatchdogAction = {
        step: def.key,
        id,
        action: done ? "repare" : "echoue",
        statusBefore,
        since,
      };
      report.actions.push(action);
      logger.warn("chien de garde : étape débloquée", { ...action });
      if (def.hasWorkspace && typeof row.workspace_id === "string") {
        await db.from("events").insert({
          workspace_id: row.workspace_id,
          actor_id: null,
          type: done ? "watchdog.step_repaired" : "watchdog.step_failed",
          payload: { step: def.key, id, status_before: statusBefore, since },
        });
      }
      if (done && def.table === "audits" && opts.onAuditRepaired) {
        await opts.onAuditRepaired(id);
      }
      // MU.1 : une étape d'analyse bloquée entraîne son analyse (sauf l'étape parallèle).
      const parent = def.parent;
      const parentId = parent ? row[parent.refCol] : null;
      if (
        !done &&
        parent &&
        typeof parentId === "string" &&
        !(parent.unless && row[parent.unless.col] === parent.unless.value)
      ) {
        const up = await db
          .from(parent.table)
          .update({
            [parent.statusCol]: "echoue",
            [parent.finishedCol]: now.toISOString(),
            [parent.errorCol]: t.watchdog.stuck,
          })
          .eq("id", parentId)
          .in(parent.statusCol, [...parent.running])
          .select("id");
        if (up.error) {
          logger.error("chien de garde : parent non mis à jour", {
            step: def.key,
            id: parentId,
            error: up.error.message,
          });
        }
      }
    }
  }
  return report;
}
