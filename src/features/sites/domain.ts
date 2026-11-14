import { isIP } from "node:net";

/**
 * Normalise une saisie utilisateur en nom de domaine : minuscules, sans schéma,
 * chemin, port, "www." ni point final. Renvoie null si ce n'est pas un domaine
 * public plausible (IP, localhost, TLD absent, caractères invalides).
 */
export function normalizeDomain(input: string): string | null {
  let raw = input.trim().toLowerCase();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(raw)) raw = `https://${raw}`;
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, "").replace(/^www\./, "");
  if (host.length < 3 || host.length > 253) return null;
  if (isIP(host) || host.startsWith("[")) return null;
  const labels = host.split(".");
  if (labels.length < 2) return null;
  // new URL() convertit déjà les IDN en punycode (xn--).
  if (!labels.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return null;
  const tld = labels[labels.length - 1];
  if (!/^([a-z]{2,63}|xn--[a-z0-9-]+)$/.test(tld)) return null;
  if (["localhost", "local", "internal", "test", "invalid", "example"].includes(tld)) return null;
  return host;
}

/** Vrai si l'adresse IP est privée, locale ou réservée (protection SSRF). */
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80") ||
    v6.startsWith("ff")
  );
}
