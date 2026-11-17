/** Clés des notifications : fichier sans dépendance serveur, importable par un écran. */
export const NOTIFICATION_KEYS = [
  "reply_waiting",
  "to_validate",
  "links",
  "mailbox",
  "new_sites",
  "weekly",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationPrefs = Record<NotificationKey, boolean>;

/** Notifications réellement envoyées aujourd'hui ; les autres sont enregistrées et arrivent ensuite. */
export const LIVE_NOTIFICATIONS: readonly NotificationKey[] = ["reply_waiting"];
