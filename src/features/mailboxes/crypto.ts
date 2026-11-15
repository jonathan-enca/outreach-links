import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { EnvError } from "@/env";

/**
 * Chiffrement AES-256-GCM des identifiants de boîte (M4.1).
 * `MAILBOX_ENCRYPTION_KEYS` = « v2:<base64 32 octets>,v1:<base64 32 octets> » :
 * la PREMIÈRE clé chiffre, toutes servent à déchiffrer. Rotation : ajouter une
 * nouvelle clé en tête, laisser l'ancienne, puis rechiffrer (`needsRotation`) et
 * retirer l'ancienne. Format stocké : `version.iv.tag.texte` (base64url).
 */
export interface KeyRing {
  current: string;
  keys: Map<string, Buffer>;
}

export function parseKeyRing(raw: string | undefined): KeyRing {
  if (!raw) throw new EnvError(["MAILBOX_ENCRYPTION_KEYS : variable requise, non définie"]);
  const keys = new Map<string, Buffer>();
  let current = "";
  for (const part of raw.split(",")) {
    const [version, b64] = part.trim().split(":");
    if (!version || !/^[a-z0-9_-]{1,16}$/i.test(version) || !b64) {
      throw new EnvError(["MAILBOX_ENCRYPTION_KEYS : format « version:clé_base64 » attendu"]);
    }
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) {
      throw new EnvError([`MAILBOX_ENCRYPTION_KEYS : la clé ${version} doit faire 32 octets`]);
    }
    if (keys.has(version)) throw new EnvError([`MAILBOX_ENCRYPTION_KEYS : ${version} en double`]);
    keys.set(version, key);
    if (!current) current = version;
  }
  return { current, keys };
}

const b64 = (b: Buffer) => b.toString("base64url");

export function encryptSecret(plain: string, ring: KeyRing): { value: string; version: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.keys.get(ring.current)!, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    value: [ring.current, b64(iv), b64(cipher.getAuthTag()), b64(ct)].join("."),
    version: ring.current,
  };
}

export function decryptSecret(stored: string, ring: KeyRing): string {
  const [version, iv, tag, ct] = stored.split(".");
  const key = version ? ring.keys.get(version) : undefined;
  if (!key || !iv || !tag || !ct)
    throw new Error("identifiants illisibles (clé inconnue ou format)");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

export const needsRotation = (version: string, ring: KeyRing) => version !== ring.current;
