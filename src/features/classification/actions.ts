import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CLASSIFY_LIMITS, type Category, type Classification, type ProposedAction } from "./types";

type Db = SupabaseClient<Database>;

export type ActionStatus = "appliquee" | "proposee" | "aucune";

export interface ActionPlan {
  action: ProposedAction;
  status: ActionStatus;
  /** Ajouter l'adresse du prospect à la liste de suppression (motif). */
  suppress: string | null;
  /** Écrire un signal de désinscription (annule la relance). */
  signalOptOut: boolean;
  /** Repousser la relance de ce nombre de jours. */
  postponeDays: number | null;
  alert: boolean;
}

const PROPOSED: Partial<Record<Category, ProposedAction>> = {
  accepte_lien_pose: "preparer_reponse_inseree",
  interesse_conditions: "brouillon_reponse",
  demande_echange: "brouillon_reponse",
  question: "brouillon_reponse",
  demande_paiement: "politique_payant",
  redirection: "proposer_nouveau_contact",
  ambigu: "revue_manuelle",
};

/**
 * Action déduite de la CATÉGORIE seulement, jamais du texte du message. Seules des actions qui
 * RÉDUISENT le contact sont appliquées seules (suppression, relance repoussée) ; tout ce qui écrit
 * à un tiers attend la validation de l'utilisateur (M5.2). Un message qui tente de donner des
 * instructions au classifieur (injection) ne déclenche aucune action issue du modèle.
 */
export function decideAction(c: Classification): ActionPlan {
  const none: ActionPlan = {
    action: "revue_manuelle",
    status: "proposee",
    suppress: null,
    signalOptOut: false,
    postponeDays: null,
    alert: false,
  };
  // Un verdict du modèle sur un message qui contient des consignes n'est jamais appliqué seul.
  const untrusted = c.source === "llm" && c.injectionSuspected;

  switch (c.category) {
    case "rebond":
      return { ...none, action: "deja_traite", status: "aucune" };
    case "reponse_automatique":
      return {
        ...none,
        action: "repousser_relance",
        status: "appliquee",
        postponeDays: CLASSIFY_LIMITS.postponeDays,
      };
    case "desinscription":
      return {
        ...none,
        action: "suppression",
        status: untrusted ? "proposee" : "appliquee",
        suppress: untrusted ? null : "desinscription",
        signalOptOut: !untrusted,
      };
    case "plainte_hostile":
      return {
        ...none,
        action: "suppression_et_alerte",
        status: untrusted ? "proposee" : "appliquee",
        suppress: untrusted ? null : "plainte",
        signalOptOut: !untrusted,
        alert: true,
      };
    case "refus_poli": {
      const sure = !untrusted && c.confidence >= CLASSIFY_LIMITS.autoCloseConfidence;
      return {
        ...none,
        action: "clore_refuse",
        status: sure ? "appliquee" : "proposee",
        suppress: sure ? "refus" : null,
      };
    }
    default:
      return { ...none, action: PROPOSED[c.category] ?? "revue_manuelle" };
  }
}

export interface ApplyContext {
  workspaceId: string;
  sentMessageId: string;
  toEmail: string | null;
  fromEmail: string | null;
  now: Date;
}

const isDup = (e: { code?: string } | null) => e?.code === "23505";

/** Effets de bord idempotents (rejouables sans doublon après un passage interrompu). */
export async function applyEffects(
  db: Db,
  plan: ActionPlan,
  ctx: ApplyContext,
): Promise<Date | null> {
  if (plan.suppress) {
    const emails = new Set(
      [ctx.toEmail, ctx.fromEmail].filter((e): e is string => !!e).map((e) => e.toLowerCase()),
    );
    for (const email of emails) {
      const r = await db
        .from("suppressions")
        .insert({ workspace_id: ctx.workspaceId, email, reason: plan.suppress });
      if (r.error && !isDup(r.error)) throw new Error(r.error.message);
    }
  }
  if (plan.signalOptOut) {
    const r = await db.from("reply_signals").insert({
      workspace_id: ctx.workspaceId,
      sent_message_id: ctx.sentMessageId,
      kind: "desinscription",
      received_at: ctx.now.toISOString(),
    });
    if (r.error && !isDup(r.error)) throw new Error(r.error.message);
  }
  return plan.postponeDays ? new Date(ctx.now.getTime() + plan.postponeDays * 86_400_000) : null;
}
