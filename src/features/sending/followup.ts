import { SEND_LIMITS } from "./limits";
import { addDays } from "./schedule";

/** Signaux qui annulent la relance (écrits par M4.4 et par la route de désinscription). */
export type SignalKind = "reponse" | "desinscription" | "rebond";

export type FollowUpState =
  | "envoye_j0" // envoi initial fait, relance pas encore due
  | "relance_due" // à envoyer au prochain passage
  | "relance_a_reessayer"
  | "relancé"
  | "termine_sans_reponse"
  | "annulee_reponse"
  | "annulee_desinscription"
  | "annulee_rebond"
  | "annulee_autre" // relance ignorée (adresse supprimée, contact non envoyable…) ou en échec
  | "sans_relance"; // envoi initial non terminé

interface Row {
  status: string;
  sent_at?: string | null;
  follow_up_due_at?: string | null;
}

/** Machine à états d'un prospect : Envoyé J0 → Relancé → Terminé sans réponse (ou annulée). */
export function followUpState(
  initial: Row | null,
  relance: Row | null,
  signals: readonly SignalKind[],
  now: Date,
): FollowUpState {
  if (!initial || !["envoye", "simule"].includes(initial.status)) return "sans_relance";
  // Une réponse prime sur une désinscription, qui prime sur un rebond (ordre de lecture humain).
  for (const k of ["reponse", "desinscription", "rebond"] as const) {
    if (signals.includes(k)) return `annulee_${k}` as FollowUpState;
  }
  if (relance) {
    if (["envoye", "simule"].includes(relance.status)) {
      const sent = relance.sent_at ? new Date(relance.sent_at) : now;
      return now >= addDays(sent, SEND_LIMITS.followUpGraceDays)
        ? "termine_sans_reponse"
        : "relancé";
    }
    if (relance.status === "ignore" || relance.status === "echec") return "annulee_autre";
    return relance.status === "a_reessayer" ? "relance_a_reessayer" : "relancé";
  }
  const due = initial.follow_up_due_at ? new Date(initial.follow_up_due_at) : null;
  return due && due <= now ? "relance_due" : "envoye_j0";
}

/** Motif enregistré quand une relance est annulée à cause d'un signal. */
export function skipReasonForSignals(signals: readonly SignalKind[]): string | null {
  if (signals.includes("reponse")) return "reponse_recue";
  if (signals.includes("desinscription")) return "desinscription";
  if (signals.includes("rebond")) return "rebond";
  return null;
}

const fmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/**
 * Texte de relance : court, déterministe (aucun appel LLM, donc aucun coût), sans mention de l'IA.
 * Il est autorisé par la validation du lot (le lot validé couvre le message initial ET sa relance).
 */
export function buildFollowUp(i: {
  fromName: string;
  subject: string;
  body: string;
  sentAt: Date;
  /** Signature complète en texte ; à défaut, le nom d'expéditeur de la boîte. */
  signature?: string | null;
}): { subject: string; body: string } {
  const subject = /^re\s*:/i.test(i.subject) ? i.subject : `Re: ${i.subject}`;
  const quoted = i.body
    .trimEnd()
    .split("\n")
    .map((l) => `> ${l}`.trimEnd())
    .join("\n");
  const body = [
    "Bonjour,",
    "",
    "Je me permets de revenir vers vous une dernière fois au sujet de mon message ci-dessous, au cas où il vous aurait échappé. Si le sujet ne vous intéresse pas, aucun souci : dites-le-moi simplement et je ne vous relancerai pas.",
    "",
    i.signature?.trim() || i.fromName,
    "",
    `Le ${fmt.format(i.sentAt)}, j'écrivais :`,
    quoted,
  ].join("\n");
  return { subject, body };
}
