import { hostOf, isExcludedDomain, isOwnDomain } from "@/features/audits/excluded-domains";

/**
 * Règles de nettoyage des backlinks de concurrents (PLAN 1.4). Fonctions PURES,
 * testées sur fixtures : aucune dépendance réseau ni base.
 * Un backlink peut cumuler plusieurs motifs ; il est exclu dès qu'il en a un.
 */

/** Ordre = priorité d'affichage (le premier motif d'une ligne est son motif principal). */
export const EXCLUSION_REASONS = [
  "interne",
  "plateforme",
  "spam",
  "image_reuse",
  "foreign",
  "doublon",
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

export interface RawBacklink {
  /** Domaine du concurrent dont le lien est issu. */
  competitorDomain: string;
  sourceDomain: string;
  sourceUrl: string;
  targetUrl: string | null;
  anchor: string | null;
  /** anchor, image, meta, canonical, redirect... (DataForSEO `item_type`). */
  itemType: string | null;
  dofollow: boolean | null;
  isBroken: boolean | null;
  spamScore: number | null;
  sourceRank: number | null;
}

export interface CleanContext {
  /** Langue cible du site (fr, en). */
  language: string;
  /** Domaine du site de l'utilisateur (ses propres liens ne sont pas des cibles). */
  ownDomain: string;
  /** Score de spam (0-100) à partir duquel un lien est exclu. */
  spamThreshold?: number;
  /** Nombre de liens "image" d'un même domaine à partir duquel on parle de réutilisation automatique. */
  imageReuseMin?: number;
  /** Domaines supplémentaires à exclure (liste configurable). */
  extraExcluded?: readonly string[];
}

export const DEFAULT_SPAM_THRESHOLD = 50;
export const DEFAULT_IMAGE_REUSE_MIN = 3;

// ----- Spam ------------------------------------------------------------------

/** Termes assez distinctifs pour être cherchés comme sous-chaîne d'un nom de domaine. */
const SPAM_SUBSTRINGS = [
  "casino",
  "poker",
  "viagra",
  "cialis",
  "porn",
  "escort",
  "payday",
  "replica",
  "xxx",
  "essay",
  "backlink",
  "buylinks",
  "seolinks",
  "linkbuilding",
  "paris-sportifs",
  "parisportif",
];
/** Termes courts : comparés à un segment entier du domaine (séparé par - ou .). */
const SPAM_TOKENS = new Set([
  "bet",
  "sex",
  "cbd",
  "loan",
  "loans",
  "slot",
  "slots",
  "bingo",
  "seo",
]);
/** TLD massivement utilisés pour du spam. */
const SPAM_TLDS = new Set([
  "xyz",
  "top",
  "click",
  "loan",
  "work",
  "gq",
  "tk",
  "ml",
  "cf",
  "ga",
  "icu",
  "buzz",
  "cyou",
  "rest",
  "bid",
  "men",
  "win",
]);
const SPAM_ANCHOR =
  /\b(casino|viagra|cialis|porn|escort|payday|replica|cbd|paris sportifs?|slots?)\b/i;

export function tldOf(host: string): string {
  const labels = hostOf(host).split(".");
  return labels[labels.length - 1] ?? "";
}

/** Heuristiques sur le nom de domaine et l'ancre, indépendantes du score du fournisseur. */
export function looksSpammy(domain: string, anchor?: string | null): boolean {
  const host = hostOf(domain);
  if (SPAM_TLDS.has(tldOf(host))) return true;
  if (SPAM_SUBSTRINGS.some((s) => host.includes(s))) return true;
  const label = host.split(".").slice(0, -1).join(".");
  if (label.split(/[-.]/).some((tok) => SPAM_TOKENS.has(tok))) return true;
  if ((label.match(/-/g) ?? []).length >= 4) return true;
  if ((label.match(/\d/g) ?? []).length >= 6) return true;
  return anchor ? SPAM_ANCHOR.test(anchor) : false;
}

// ----- Langue / pays ---------------------------------------------------------

/** ccTLD acceptés par langue cible. Les autres ccTLD sont considérés étrangers. */
export const ALLOWED_CCTLD: Record<string, readonly string[]> = {
  fr: [
    "fr",
    "be",
    "ch",
    "lu",
    "mc",
    "ca",
    "re",
    "mq",
    "gp",
    "gf",
    "nc",
    "pf",
    "yt",
    "pm",
    "wf",
    "tf",
    "ma",
    "dz",
    "tn",
    "sn",
    "ci",
    "cm",
  ],
  en: ["uk", "us", "ca", "au", "nz", "ie", "za", "ch"],
};
/** ccTLD détournés en TLD génériques : jamais considérés comme un marché étranger. */
const GENERIC_CCTLD = new Set([
  "io",
  "co",
  "me",
  "tv",
  "ai",
  "cc",
  "ly",
  "fm",
  "gg",
  "to",
  "ws",
  "ag",
  "am",
  "im",
  "is",
  "nu",
  "so",
  "sh",
  "vc",
  "eu",
]);
const NON_LATIN = /[Ѐ-ӿ֐-׿؀-ۿऀ-ॿ฀-๿぀-ヿ一-鿿가-힯]/g;

/** Vrai si plus de 30 % des lettres du texte sont d'une écriture non latine. */
export function isNonLatinText(text: string | null | undefined): boolean {
  if (!text) return false;
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return false;
  return (text.match(NON_LATIN)?.length ?? 0) / letters > 0.3;
}

export function isForeignSource(
  domain: string,
  anchor: string | null | undefined,
  language: string,
): boolean {
  const host = hostOf(domain);
  if (host.split(".").some((l) => l.startsWith("xn--"))) return true;
  if (isNonLatinText(anchor)) return true;
  const allowed = ALLOWED_CCTLD[language];
  if (!allowed) return false;
  const tld = tldOf(host);
  if (tld.length !== 2 || GENERIC_CCTLD.has(tld)) return false;
  return !allowed.includes(tld);
}

// ----- Doublons --------------------------------------------------------------

/** URL normalisée pour la comparaison : hôte sans www, sans fragment ni paramètres de suivi. */
export function normalizeUrl(input: string | null | undefined): string {
  if (!input) return "";
  const raw = input.trim();
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_)/i.test(k)) u.searchParams.delete(k);
    }
    u.searchParams.sort();
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./i, "").toLowerCase()}${path}${u.search}`;
  } catch {
    return raw.toLowerCase();
  }
}

export function dedupeKey(b: Pick<RawBacklink, "competitorDomain" | "sourceUrl" | "targetUrl">) {
  return `${hostOf(b.competitorDomain)}|${normalizeUrl(b.sourceUrl)}|${normalizeUrl(b.targetUrl)}`;
}

// ----- Classement ------------------------------------------------------------

export interface Classified<T> {
  row: T;
  reasons: ExclusionReason[];
}

/**
 * Classe chaque backlink. Garde l'ordre d'entrée. Dans un groupe de doublons, on
 * conserve la meilleure ligne (dofollow, puis spam le plus bas, puis la première).
 */
export function cleanBacklinks<T extends RawBacklink>(
  rows: readonly T[],
  ctx: CleanContext,
): Classified<T>[] {
  const spamThreshold = ctx.spamThreshold ?? DEFAULT_SPAM_THRESHOLD;
  const imageMin = ctx.imageReuseMin ?? DEFAULT_IMAGE_REUSE_MIN;

  // Liens "image" par domaine source, sur tout le jeu (réutilisation en série).
  const imageLinks = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.itemType !== "image") continue;
    const d = hostOf(r.sourceDomain);
    const set = imageLinks.get(d) ?? new Set<string>();
    set.add(`${normalizeUrl(r.sourceUrl)}|${normalizeUrl(r.targetUrl)}`);
    imageLinks.set(d, set);
  }

  // Meilleure ligne de chaque groupe de doublons.
  const best = new Map<string, number>();
  const better = (a: RawBacklink, b: RawBacklink) => {
    const da = a.dofollow ? 1 : 0;
    const db = b.dofollow ? 1 : 0;
    if (da !== db) return da > db;
    return (a.spamScore ?? 0) < (b.spamScore ?? 0);
  };
  rows.forEach((r, i) => {
    const k = dedupeKey(r);
    const cur = best.get(k);
    if (cur === undefined || better(r, rows[cur]!)) best.set(k, i);
  });

  return rows.map((row, i) => {
    const reasons: ExclusionReason[] = [];
    if (
      isOwnDomain(row.sourceDomain, row.competitorDomain) ||
      isOwnDomain(row.sourceDomain, ctx.ownDomain)
    ) {
      reasons.push("interne");
    }
    if (isExcludedDomain(row.sourceDomain, ctx.extraExcluded)) reasons.push("plateforme");
    if ((row.spamScore ?? 0) >= spamThreshold || looksSpammy(row.sourceDomain, row.anchor)) {
      reasons.push("spam");
    }
    if (
      row.itemType === "image" &&
      (imageLinks.get(hostOf(row.sourceDomain))?.size ?? 0) >= imageMin
    ) {
      reasons.push("image_reuse");
    }
    if (isForeignSource(row.sourceDomain, row.anchor, ctx.language)) reasons.push("foreign");
    if (best.get(dedupeKey(row)) !== i) reasons.push("doublon");
    return { row, reasons };
  });
}

// ----- Compteurs avant / après -----------------------------------------------

export interface CleanStats {
  before: number;
  after: number;
  excluded: number;
  /** Domaines sources distincts avant / après. */
  domainsBefore: number;
  domainsAfter: number;
  /** Motif PRINCIPAL de chaque ligne exclue : la somme vaut `excluded`. */
  byReason: Record<ExclusionReason, number>;
  perCompetitor: { domain: string; before: number; after: number }[];
}

export function computeStats(classified: readonly Classified<RawBacklink>[]): CleanStats {
  const byReason = Object.fromEntries(EXCLUSION_REASONS.map((r) => [r, 0])) as Record<
    ExclusionReason,
    number
  >;
  const per = new Map<string, { before: number; after: number }>();
  const domBefore = new Set<string>();
  const domAfter = new Set<string>();
  let after = 0;
  for (const { row, reasons } of classified) {
    const d = hostOf(row.sourceDomain);
    domBefore.add(d);
    const p = per.get(row.competitorDomain) ?? { before: 0, after: 0 };
    p.before++;
    if (reasons.length === 0) {
      after++;
      p.after++;
      domAfter.add(d);
    } else {
      const main = EXCLUSION_REASONS.find((r) => reasons.includes(r))!;
      byReason[main]++;
    }
    per.set(row.competitorDomain, p);
  }
  return {
    before: classified.length,
    after,
    excluded: classified.length - after,
    domainsBefore: domBefore.size,
    domainsAfter: domAfter.size,
    byReason,
    perCompetitor: [...per.entries()]
      .map(([domain, v]) => ({ domain, ...v }))
      .sort((a, b) => b.after - a.after || a.domain.localeCompare(b.domain)),
  };
}
