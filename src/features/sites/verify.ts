import { lookup } from "node:dns/promises";
import { isPrivateIp } from "./domain";
import { FILE_PATH, META_NAME, metaTag } from "./verification-constants";

export { FILE_PATH, META_NAME, metaTag };

export type VerificationMethod = "meta" | "file";

export interface FetchedPage {
  status: number;
  text: string;
}

/** Récupère une URL publique (injectable pour les tests). Renvoie null en cas d'échec réseau. */
export type PageFetcher = (url: string) => Promise<FetchedPage | null>;

export type VerifyResult =
  | { verified: true; method: VerificationMethod }
  | { verified: false; reason: "not_found" | "unreachable" };

/** Cherche la balise meta (attributs dans n'importe quel ordre) portant le jeton exact. */
export function hasMetaToken(html: string, token: string): boolean {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return tags.some((tag) => {
    const name = /\bname\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
    const content = /\bcontent\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1];
    return name?.toLowerCase() === META_NAME && content === token;
  });
}

/**
 * Vérifie la propriété : balise meta sur la page d'accueil, sinon fichier
 * texte sous /.well-known/. Essaie https puis http.
 */
export async function checkOwnership(
  domain: string,
  token: string,
  fetchPage: PageFetcher,
): Promise<VerifyResult> {
  let reached = false;
  for (const scheme of ["https", "http"] as const) {
    const home = await fetchPage(`${scheme}://${domain}/`);
    if (home) {
      reached = true;
      if (home.status === 200 && hasMetaToken(home.text, token)) {
        return { verified: true, method: "meta" };
      }
    }
    const file = await fetchPage(`${scheme}://${domain}${FILE_PATH}`);
    if (file) {
      reached = true;
      if (file.status === 200 && file.text.trim() === token) {
        return { verified: true, method: "file" };
      }
    }
    if (reached) break; // le schéma répond : inutile d'essayer l'autre
  }
  return { verified: false, reason: reached ? "not_found" : "unreachable" };
}

const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

async function assertPublicHost(hostname: string): Promise<boolean> {
  try {
    const addrs = await lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

/**
 * Fetcher réel, protégé contre le SSRF : seuls http(s) sur ports 80/443,
 * résolution DNS vérifiée à chaque saut, redirections suivies à la main
 * (3 au maximum), corps limité à 512 Ko, délai de 8 s.
 */
export const safeFetchPage: PageFetcher = async (startUrl) => {
  let url = startUrl;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) return null;
      if (u.port && u.port !== "80" && u.port !== "443") return null;
      if (!(await assertPublicHost(u.hostname))) return null;
      const res = await fetch(u, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "OutreachLinksVerifier/1.0", accept: "text/html,text/plain" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { status: res.status, text: "" };
        url = new URL(loc, u).toString();
        continue;
      }
      const reader = res.body?.getReader();
      let text = "";
      if (reader) {
        const decoder = new TextDecoder();
        let received = 0;
        while (received < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          text += decoder.decode(value, { stream: true });
        }
        await reader.cancel().catch(() => undefined);
      }
      return { status: res.status, text };
    }
    return null;
  } catch {
    return null;
  }
};
