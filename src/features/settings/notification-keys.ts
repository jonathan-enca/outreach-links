/** Clés des notifications : fichier sans dépendance serveur, importable par un écran. */
export const NOTIFICATION_KEYS = [
  "reply_waiting",
  "to_validate",
  "analysis_ready",
  "link_live",
  "link_lost",
  "quota",
  "campaign_idle",
  "weekly",
  "monthly",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationPrefs = Record<NotificationKey, boolean>;

/** Emails de fonctionnement du compte : toujours envoyés, sans interrupteur. */
export const LOCKED_NOTIFICATIONS = ["mailbox", "payment"] as const;
export type LockedNotification = (typeof LOCKED_NOTIFICATIONS)[number];

export type NotificationRow = NotificationKey | LockedNotification;

/** L'écran, dans l'ordre de la maquette validée (docs/mockups/notifications.html). */
export const NOTIFICATION_GROUPS: readonly {
  key: "decision" | "links" | "sending" | "summaries";
  rows: readonly NotificationRow[];
}[] = [
  { key: "decision", rows: ["reply_waiting", "to_validate", "analysis_ready"] },
  { key: "links", rows: ["link_live", "link_lost"] },
  { key: "sending", rows: ["mailbox", "quota", "campaign_idle", "payment"] },
  { key: "summaries", rows: ["weekly", "monthly"] },
];

export const isLocked = (k: NotificationRow): k is LockedNotification =>
  (LOCKED_NOTIFICATIONS as readonly string[]).includes(k);
