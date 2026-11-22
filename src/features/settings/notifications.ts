import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import {
  NOTIFICATION_KEYS,
  type NotificationKey,
  type NotificationPrefs,
} from "./notification-keys";

type Client = SupabaseClient<Database>;
const N = t.notifications;

const DEFAULTS: NotificationPrefs = {
  reply_waiting: true,
  to_validate: true,
  analysis_ready: true,
  link_live: true,
  link_lost: true,
  quota: true,
  campaign_idle: true,
  weekly: true,
  monthly: true,
};

const isKey = (v: unknown): v is NotificationKey =>
  typeof v === "string" && (NOTIFICATION_KEYS as readonly string[]).includes(v);

/** Réglages de l'espace de la personne (tout activé tant qu'elle n'a rien changé). */
export async function loadPrefs(
  supabase: Client,
): Promise<{ workspaceId: string | null; prefs: NotificationPrefs }> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return { workspaceId: null, prefs: DEFAULTS };
  const { data } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("workspace_id", ws.id)
    .maybeSingle();
  if (!data) return { workspaceId: ws.id, prefs: DEFAULTS };
  const prefs = { ...DEFAULTS };
  for (const k of NOTIFICATION_KEYS) prefs[k] = data[k];
  return { workspaceId: ws.id, prefs };
}

/** Active ou coupe une notification (enregistré tout de suite). */
export async function setPref(
  supabase: Client,
  getServiceClient: () => Client,
  key: unknown,
  on: boolean,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: N.messages.unauthenticated };
  if (!isKey(key)) return { status: "error", message: N.messages.saveError };
  const { workspaceId } = await loadPrefs(supabase);
  if (!workspaceId) return { status: "error", message: N.messages.saveError };
  const { error } = await getServiceClient()
    .from("notification_prefs")
    .upsert(
      {
        workspace_id: workspaceId,
        [key]: on,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      } as Database["public"]["Tables"]["notification_prefs"]["Insert"],
      { onConflict: "workspace_id" },
    );
  return error ? { status: "error", message: N.messages.saveError } : { status: "ok" };
}

/** Réponses à signaler, par espace : celles qui n'ont pas encore fait l'objet d'un email (pur, testé). */
export function repliesToNotify(
  drafts: readonly { id: string; workspace_id: string }[],
  alreadyNotified: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const d of drafts) {
    if (alreadyNotified.has(d.id) || disabled.has(d.workspace_id)) continue;
    out.set(d.workspace_id, [...(out.get(d.workspace_id) ?? []), d.id]);
  }
  return out;
}

/** Lien « Ne plus recevoir cet email » : coupe un type d'email pour un espace (jeton déjà vérifié). */
export async function turnOff(
  service: Client,
  workspaceId: string,
  key: NotificationKey,
): Promise<boolean> {
  const { error } = await service.from("notification_prefs").upsert(
    {
      workspace_id: workspaceId,
      [key]: false,
      updated_at: new Date().toISOString(),
    } as Database["public"]["Tables"]["notification_prefs"]["Insert"],
    { onConflict: "workspace_id" },
  );
  return !error;
}

/** Vrai si l'espace a gardé cette notification (défaut : activée). */
export async function isEnabled(
  service: Client,
  workspaceId: string,
  key: NotificationKey,
): Promise<boolean> {
  const { data } = await service
    .from("notification_prefs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data ? data[key] !== false : true;
}
