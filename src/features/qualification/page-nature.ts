/**
 * Nature d'une page reconnue par son ADRESSE seule (MC.1 / MC.6a), avant toute lecture payante. Une page
 * d'accueil, un document juridique ou un fichier n'est jamais une page qu'un éditeur modifie pour un
 * inconnu. Règles pures, sans appel.
 *
 * Généralité : seuls des mots de la STRUCTURE d'un site sont reconnus (mentions légales, CGU, politique de
 * confidentialité, cookies...), jamais un mot du thème du site : « rgpd » ou « données personnelles »
 * ne marquent pas une page légale, sinon les articles d'un site dont le sujet est le RGPD tomberaient
 * (piège constaté à MC.0). La page légale se reconnaît à la FORME du segment (« politique-de-confidentialite »,
 * « mentions-legales »), pas au thème.
 */

export const PAGE_NATURES = ["page_accueil", "page_legale", "fichier"] as const;
export type PageNature = (typeof PAGE_NATURES)[number];

/** Fichiers et flux : jamais une page de contenu. */
const FILE_EXT =
  /\.(jpe?g|png|gif|webp|svg|ico|pdf|zip|rar|docx?|xlsx?|pptx?|csv|css|js|mp4|mp3|xml|json|rss|atom|txt)$/i;
const FEED_SEGMENT = /^(feed|rss|atom|sitemap[\w-]*)$/i;

/**
 * Segments (ou fins de segment) d'une page légale. Un segment est normalisé : minuscules, sans accents,
 * séparateurs en tirets. La reconnaissance exige le segment ENTIER (ou une fin « -legales » / « -cgu » ...),
 * pas une sous-chaîne au milieu d'un titre d'article.
 */
const LEGAL_SEGMENTS = new Set([
  "mentions-legales",
  "mention-legale",
  "mentions-legale",
  "legal",
  "legals",
  "legal-notice",
  "legal-notices",
  "mentions",
  "cgu",
  "cgv",
  "cgs",
  "cgu-cgv",
  "cgv-cgu",
  "conditions-generales",
  "conditions-generales-d-utilisation",
  "conditions-generales-de-vente",
  "conditions-generales-d-utilisation-et-de-vente",
  "conditions-d-utilisation",
  "conditions-de-vente",
  "conditions-utilisation",
  "terms",
  "terms-of-use",
  "terms-of-service",
  "terms-and-conditions",
  "tos",
  "privacy",
  "privacy-policy",
  "privacy-notice",
  "politique-de-confidentialite",
  "politique-confidentialite",
  "politique-de-cookies",
  "politique-cookies",
  "cookies",
  "cookie-policy",
  "charte-de-confidentialite",
  "gestion-des-cookies",
  "disclaimer",
  "avertissement",
  "plan-du-site",
  "sitemap",
]);

/** Fins de segment qui marquent un document légal (« notre-politique-de-confidentialite »). */
const LEGAL_SUFFIXES = [
  "-mentions-legales",
  "-politique-de-confidentialite",
  "-privacy-policy",
  "-conditions-generales",
  "-conditions-generales-de-vente",
  "-conditions-generales-d-utilisation",
  "-cgu",
  "-cgv",
];

const norm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\s.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Segments de langue d'une adresse (« /fr/ », « /fr-fr/ ») : ils ne comptent pas comme un chemin. */
const LANG_SEGMENT = /^[a-z]{2}([-_][a-z]{2})?$/i;

/**
 * Pages d'accueil de fait : « / », « /index.html », « /fr/ », « /home », ou la racine d'un blog hébergé.
 * Une adresse avec une chaîne de requête de contenu (« ?p=123 », « ?page_id=4 ») n'est PAS une accueil.
 */
function isHome(segments: readonly string[], search: string): boolean {
  if (/[?&](p|page_id|post|id|article|q|s|search)=/i.test(search)) return false;
  const rest = segments.filter((s, i) => !(i === 0 && LANG_SEGMENT.test(s)));
  if (rest.length === 0) return true;
  if (
    rest.length === 1 &&
    /^(index|home|accueil|default|main)(\.(html?|php|aspx?))?$/i.test(rest[0]!)
  ) {
    return true;
  }
  return false;
}

/**
 * Nature de la page d'une adresse : `page_accueil`, `page_legale`, `fichier`, ou null (page de contenu
 * possible). Une adresse illisible n'est jamais écartée ici.
 */
export function pageNatureOf(url: string | null | undefined): PageNature | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol)) return null;
  const segments = u.pathname.split("/").filter(Boolean).map(decode);
  const last = segments[segments.length - 1] ?? "";
  if (FILE_EXT.test(last) || FEED_SEGMENT.test(last)) return "fichier";
  if (isHome(segments, u.search)) return "page_accueil";
  // Document légal : le DERNIER segment ou l'avant-dernier (« /legal/privacy »), jamais un mot du thème.
  const tail = segments.slice(-2).map((s) => norm(s.replace(/\.(html?|php|aspx?)$/i, "")));
  for (const seg of tail) {
    if (LEGAL_SEGMENTS.has(seg)) return "page_legale";
    if (LEGAL_SUFFIXES.some((suf) => seg.endsWith(suf))) return "page_legale";
  }
  return null;
}

/** Motif lisible d'une nature de page, pour l'entonnoir (« page d'accueil », « page légale »...). */
export const PAGE_NATURE_LABELS: Record<PageNature, string> = {
  page_accueil: "page d'accueil",
  page_legale: "page légale (mentions, CGU, confidentialité...)",
  fichier: "fichier ou flux, pas une page",
};
