import { lookup } from "node:dns/promises";
import { isPrivateIp } from "@/features/sites/domain";

export class UnsafeHostError extends Error {}

/**
 * Résout l'hôte et refuse les adresses non publiques (SSRF) ; la connexion se fait
 * ensuite sur l'IP validée (pas de seconde résolution : anti-rebinding).
 * `allowPrivate` : réservé aux tests contre un faux serveur local.
 */
export async function resolveSafeHost(host: string, allowPrivate = false) {
  const addrs = await lookup(host, { all: true });
  if (addrs.length === 0) throw new UnsafeHostError("hôte introuvable");
  if (!allowPrivate && addrs.some((a) => isPrivateIp(a.address))) {
    throw new UnsafeHostError("adresse non publique refusée");
  }
  return addrs[0].address;
}
