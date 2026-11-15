import type { PageRead } from "./page-reader";
import type { TriageContext, TriageItem, Verdict } from "./types";

export interface RuleHit {
  verdict: Verdict;
  reason: string;
}

const strip = (d: string) => d.toLowerCase().replace(/^www\./, "");

/** Marques claires de vente de liens (FR/EN). Une mention de « write for us » seule ne suffit pas. */
const SELLS_LINKS: RegExp[] = [
  /articles?\s+sponsoris/i,
  /(post|contenu|publication)s?\s+sponsoris/i,
  /ach(?:eter|etez|at)\s+(?:un\s+|des\s+)?(?:lien|backlink)/i,
  /vente\s+de\s+(?:liens|backlinks)/i,
  /(?:tarifs?|prix)\s+(?:par|d['’]un|pour\s+un)\s+(?:article|lien|backlink)/i,
  /\d+\s?(?:€|eur|euros)\s*(?:ht|ttc)?\s*(?:\/|par)\s*(?:article|lien)/i,
  /buy\s+(?:a\s+)?(?:backlinks?|links?|guest\s+posts?)/i,
  /\b(?:sponsored|paid)\s+(?:guest\s+)?posts?\b/i,
  /link\s+insertion\s+(?:service|price|fee)/i,
  /write\s+for\s+us[^.]{0,120}(?:\$|€|\bfee\b|\bprice\b|\bpaid\b|\btarifs?\b)/i,
  /guest\s+post(?:ing)?\s+(?:service|pricing|rates?)/i,
];

/** Contenus typiques d'un site piraté (spam injecté). Deux motifs distincts minimum. */
const HACKED: RegExp[] = [
  /viagra|cialis|levitra/i,
  /casino\s+en\s+ligne|online\s+casino|\bslot\s+gacor\b|\bjudi\s+online\b|\btogel\b/i,
  /payday\s+loans?/i,
  /replica\s+(?:watches|rolex|handbags)/i,
  /\b(?:porn|xxx|escort\s+girls?)\b/i,
  /no\s+prescription/i,
  /essay\s+writing\s+service/i,
];

const PARKED =
  /(?:domain|domaine)[^.]{0,40}(?:for\s+sale|à\s+vendre|a\s+vendre|parked|expired|expiré)|buy\s+this\s+domain|this\s+(?:web)?site\s+(?:has\s+been\s+)?(?:suspended|disabled)|compte\s+suspendu|account\s+suspended/i;

const LOGIN_WORDS =
  /(?:connectez-vous|se\s+connecter|log\s*in|sign\s*in|cr[ée]er\s+un\s+compte|create\s+an\s+account|inscription\s+obligatoire|members\s+only|r[ée]serv[ée]\s+aux\s+membres|identifiez-vous)/i;

export function sellsLinks(text: string): boolean {
  return SELLS_LINKS.some((re) => re.test(text));
}

export function looksHacked(text: string): boolean {
  return HACKED.filter((re) => re.test(text)).length >= 2;
}

export function isParked(text: string): boolean {
  return PARKED.test(text);
}

/** Page quasi vide dont le contenu se résume à un mur de connexion. */
export function isLoginWall(read: Pick<PageRead, "text" | "title">): boolean {
  const body = read.text.length;
  return LOGIN_WORDS.test(`${read.title} ${read.text}`) && body < 500;
}

/**
 * Règles gratuites, appliquées avant tout appel au LLM. Elles ne rendent que des exclusions
 * sûres (preuve HTTP ou motif textuel net) ; une page ambiguë est laissée au LLM.
 */
export function ruleVerdict(item: TriageItem, read: PageRead, ctx: TriageContext): RuleHit | null {
  const domain = strip(item.domain);
  if (domain === strip(ctx.siteDomain)) {
    return { verdict: "concurrent_direct", reason: "C'est votre propre site." };
  }
  if (ctx.competitorDomains.has(domain)) {
    return {
      verdict: "concurrent_direct",
      reason: "Ce site est l'un des concurrents identifiés par l'audit.",
    };
  }
  if (read.blockedByRobots) {
    return {
      verdict: "non_verifiable",
      reason: "Le robots.txt du site interdit la lecture de la page : elle n'a pas été vérifiée.",
    };
  }
  if (read.status === 404 || read.status === 410) {
    return { verdict: "mort", reason: `La page répond ${read.status} (supprimée).` };
  }
  if (read.status === 401) {
    return { verdict: "compte_obligatoire", reason: "La page exige une connexion (HTTP 401)." };
  }
  if (read.unreachable || read.status === 0) {
    return {
      verdict: "non_verifiable",
      reason: "La page est injoignable : impossible de vérifier l'URL (HTTP 200 requis).",
    };
  }
  if (read.status !== 200) {
    return {
      verdict: "non_verifiable",
      reason: `La page répond HTTP ${read.status} : impossible de la vérifier (HTTP 200 requis).`,
    };
  }
  const all = `${read.title} ${read.description} ${read.text}`;
  if (isParked(all)) {
    return { verdict: "mort", reason: "Le site est parqué, suspendu ou à vendre." };
  }
  if (looksHacked(all)) {
    return {
      verdict: "pirate",
      reason:
        "Du contenu de spam sans rapport (pharmacie, casino…) laisse penser que le site est piraté.",
    };
  }
  if (sellsLinks(all)) {
    return {
      verdict: "payant",
      reason: "La page propose ou affiche la vente d'articles ou de liens sponsorisés.",
    };
  }
  if (isLoginWall(read)) {
    return { verdict: "compte_obligatoire", reason: "La page n'affiche qu'un mur de connexion." };
  }
  return null;
}
