import type { SupabaseClient } from "@supabase/supabase-js";
import { loadQueued, type ConversationsOptions } from "@/features/conversations/service";
import { queueNoteText } from "@/features/sending/queue-note";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Un email programmé, pas encore parti : son heure prévue telle qu'elle est écrite à la personne. */
export interface ScheduledEnvoi {
  /** Identifiant du brouillon (sert à l'annulation). */
  draftId: string;
  domain: string;
  email: string;
  campaign: string;
  subject: string;
  /** Phrase d'heure, par exemple « Part lundi 23 novembre à 9 h 10 ». */
  when: string;
}

export interface SentEnvoi {
  id: string;
  email: string;
  subject: string;
  sentAt: string | null;
}

export interface EnvoisView {
  scheduled: ScheduledEnvoi[];
  sent: SentEnvoi[];
  /** Vrai si au moins une boîte d'envoi est suspendue. */
  paused: boolean;
  /** Nombre de boîtes d'envoi connectées. */
  boxes: number;
  /** Phrase d'état de la file (plafonds, heures ouvrées), absente si rien n'attend. */
  queueNote: string | null;
}

/**
 * Écran « Envois » : ce qui est programmé (avec l'heure prévue et l'annulation possible), ce qui est
 * parti, et l'état de suspension. Lecture avec les droits de la personne (RLS).
 */
export async function loadEnvois(
  supabase: Client,
  opts: ConversationsOptions,
): Promise<EnvoisView> {
  const [sentDrafts, sent, boxes] = await Promise.all([
    supabase.from("sent_messages").select("draft_id").eq("step", "initial"),
    supabase
      .from("sent_messages")
      .select("id, to_email, subject, sent_at")
      .eq("step", "initial")
      .eq("status", "envoye")
      .eq("dry_run", false)
      .order("sent_at", { ascending: false })
      .limit(100),
    supabase.from("mailboxes").select("id, sending_paused"),
  ]);
  const sentIds = new Set((sentDrafts.data ?? []).map((r) => r.draft_id));
  const queued = await loadQueued(supabase, sentIds, opts);
  const scheduled: ScheduledEnvoi[] = queued.threads.map((th) => {
    const [subject, when] = [th.messages[0]?.subject ?? "", th.messages[1]?.text ?? ""];
    return {
      draftId: th.id.replace(/^attente-/, ""),
      domain: th.domain,
      email: th.email,
      campaign: th.campaign,
      subject,
      when,
    };
  });
  const boxRows = boxes.data ?? [];
  return {
    scheduled,
    sent: (sent.data ?? []).map((s) => ({
      id: s.id,
      email: s.to_email,
      subject: s.subject ?? "",
      sentAt: s.sent_at,
    })),
    paused: boxRows.some((b) => b.sending_paused),
    boxes: boxRows.length,
    queueNote: queued.note ? queueNoteText(queued.note) : null,
  };
}
