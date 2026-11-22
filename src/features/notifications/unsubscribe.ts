import { createHmac, timingSafeEqual } from "node:crypto";
import {
  NOTIFICATION_KEYS,
  type NotificationKey,
} from "@/features/settings/notification-keys";

/**
 * Lien « Ne plus recevoir cet email » : un jeton signé qui ne désigne qu'un espace et un type d'email.
 * Il ne donne accès à rien d'autre et n'expire pas (un vieil email doit toujours pouvoir être coupé).
 */
const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(`notif-unsub:${payload}`).digest("base64url");

export function unsubscribeToken(workspaceId: string, key: NotificationKey, secret: string): string {
  const payload = `${workspaceId}.${key}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readUnsubscribeToken(
  token: unknown,
  secret: string,
): { workspaceId: string; key: NotificationKey } | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const [workspaceId, key, mac, ...rest] = token.split(".");
  if (!workspaceId || !key || !mac || rest.length) return null;
  if (!/^[0-9a-f-]{36}$/.test(workspaceId)) return null;
  if (!(NOTIFICATION_KEYS as readonly string[]).includes(key)) return null;
  const expected = Buffer.from(sign(`${workspaceId}.${key}`, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { workspaceId, key: key as NotificationKey };
}
