import type { QualCandidate, QualContext } from "./types";

/**
 * Filtre AVANT lecture (chantier G) : ce qui se voit déjà sans télécharger la page. Une page lue pour
 * découvrir qu'elle est dans une autre langue est une lecture gaspillée (55 pages sur 150 au run de
 * référence). Trois signaux, du plus sûr au moins sûr : la langue donnée par le fournisseur, un
 * segment de langue dans l'adresse, l'extension de domaine d'un pays d'une autre langue. Un candidat
 * sans signal n'est jamais écarté ici : la lecture tranchera.
 */

/** Langues principales des extensions de pays (les extensions utilisées comme génériques sont absentes : .co, .io, .ai, .me, .tv...). */
const TLD_LANGUAGES: Record<string, readonly string[]> = {
  fr: ["fr"],
  be: ["fr", "nl", "de"],
  ch: ["fr", "de", "it"],
  ca: ["fr", "en"],
  lu: ["fr", "de"],
  mc: ["fr"],
  uk: ["en"],
  us: ["en"],
  ie: ["en"],
  au: ["en"],
  nz: ["en"],
  gov: ["en"],
  edu: ["en"],
  mil: ["en"],
  de: ["de"],
  at: ["de"],
  nl: ["nl"],
  it: ["it"],
  es: ["es"],
  mx: ["es"],
  ar: ["es"],
  cl: ["es"],
  pt: ["pt"],
  br: ["pt"],
  pl: ["pl"],
  ru: ["ru"],
  ua: ["uk", "ru"],
  jp: ["ja"],
  cn: ["zh"],
  kr: ["ko"],
  se: ["sv"],
  no: ["no"],
  dk: ["da"],
  fi: ["fi"],
  cz: ["cs"],
  sk: ["sk"],
  gr: ["el"],
  tr: ["tr"],
  ro: ["ro"],
  hu: ["hu"],
  bg: ["bg"],
  il: ["he"],
  ir: ["fa"],
  th: ["th"],
  vn: ["vi"],
  id: ["id"],
};

/** Codes de langue reconnus seuls dans une adresse (« /en/ », « de.exemple.com »). */
const URL_LANGUAGES = new Set(["en", "fr", "de", "es", "it", "nl", "pt", "ru", "ja", "zh", "pl"]);
const REGIONAL = /^([a-z]{2})[-_]([a-z]{2})$/;

const two = (s: string) => s.slice(0, 2).toLowerCase();

/** Langue qu'annonce l'adresse (premier segment du chemin ou sous-domaine), ou null. */
export function urlLanguage(url: string | null): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const seg = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  if (URL_LANGUAGES.has(seg)) return seg;
  const regional = REGIONAL.exec(seg);
  if (regional && (URL_LANGUAGES.has(regional[1]!) || regional[1] === regional[2])) {
    return regional[1]!;
  }
  const sub = u.hostname.toLowerCase().split(".")[0] ?? "";
  if (u.hostname.split(".").length >= 3 && URL_LANGUAGES.has(sub)) return sub;
  return null;
}

/** Langues attendues pour l'extension d'un domaine de pays, ou null (extension générique ou inconnue). */
export function tldLanguages(domain: string): readonly string[] | null {
  const tld = domain.toLowerCase().split(".").pop() ?? "";
  return TLD_LANGUAGES[tld] ?? null;
}

/**
 * Motif « autre langue » visible avant lecture, ou null. Une adresse qui annonce la langue de la
 * campagne (« /fr/ ») l'emporte sur l'extension du domaine.
 */
export function preReadLanguage(
  c: Pick<QualCandidate, "domain" | "url" | "language">,
  ctx: Pick<QualContext, "language">,
): string | null {
  const want = two(ctx.language);
  if (c.language && two(c.language) !== want) return `page en « ${c.language.toLowerCase()} »`;
  const inUrl = urlLanguage(c.url);
  if (inUrl) return inUrl === want ? null : `adresse en « ${inUrl} »`;
  if (c.language) return null;
  const byTld = tldLanguages(c.domain);
  if (byTld && !byTld.includes(want)) {
    return `extension de domaine « .${c.domain.split(".").pop()} »`;
  }
  return null;
}
