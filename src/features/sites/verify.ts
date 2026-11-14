import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
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

/**
 * Résolution DNS filtrée : la connexion se fait sur l'adresse validée ici,
 * ce qui exclut le DNS rebinding (pas de seconde résolution après le contrôle).
 */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true })
    .then((addrs) => {
      if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
        callback(new Error("adresse non publique"), "", 0);
        return;
      }
      if (options.all) {
        (callback as unknown as (e: null, a: typeof addrs) => void)(null, addrs);
      } else {
        callback(null, addrs[0].address, addrs[0].family);
      }
    })
    .catch((e: Error) => callback(e, "", 0));
};

function getOnce(u: URL): Promise<{ status: number; location: string | null; text: string }> {
  return new Promise((resolve, reject) => {
    const doRequest = u.protocol === "https:" ? httpsRequest : httpRequest;
    const req = doRequest(
      u,
      {
        method: "GET",
        lookup: publicOnlyLookup,
        timeout: TIMEOUT_MS,
        headers: { "user-agent": "OutreachLinksVerifier/1.0", accept: "text/html,text/plain" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let received = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve({
            status: res.statusCode ?? 0,
            location: typeof res.headers.location === "string" ? res.headers.location : null,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        };
        res.on("data", (c: Buffer) => {
          received += c.byteLength;
          chunks.push(c);
          if (received >= MAX_BYTES) {
            res.destroy();
            finish();
          }
        });
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetcher réel, protégé contre le SSRF : seuls http(s) sur ports 80/443, DNS
 * filtré au moment de la connexion (anti-rebinding), redirections suivies à la
 * main (3 au maximum, mêmes contrôles à chaque saut), corps limité à 512 Ko.
 */
export const safeFetchPage: PageFetcher = async (startUrl) => {
  let url = startUrl;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) return null;
      if (u.port && u.port !== "80" && u.port !== "443") return null;
      if (u.username || u.password) return null;
      const r = await getOnce(u);
      if (r.status >= 300 && r.status < 400) {
        if (!r.location) return { status: r.status, text: "" };
        url = new URL(r.location, u).toString();
        continue;
      }
      return { status: r.status, text: r.text };
    }
    return null;
  } catch {
    return null;
  }
};
