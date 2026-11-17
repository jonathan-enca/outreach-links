import { preReadLanguage } from "@/features/qualification/prefilter";
import { normalizeKey } from "@/features/queries/plan";

/**
 * « Cela vaut-il le coup d'appeler ? » (18/11/2026, prompt maître n° 3, chantier C). Deux tactiques
 * coûtaient 0,11 USD par analyse pour 0 cible sur trois runs réels : les liens morts des concurrents
 * (0,075 USD : 31 des 32 candidats venaient d'un seul concurrent géant et étranger) et les mentions de
 * marque (0,033 USD, nom de marque descriptif). Règles PURES, sans appel et sans mot propre à un
 * thème : tout vient de la campagne (langue, thème, mots-clés, nom du site). La tactique reste
 * affichée ; quand elle n'est pas lancée, la raison est gardée dans le plan (`skipped`) et dite telle
 * quelle à l'écran.
 */
export const WORTH_LIMITS = {
  /**
   * Un concurrent au-delà de ce nombre de domaines référents est un géant : ses pages disparues sont
   * citées par de grands sites, hors de portée d'un petit site (mesuré : 21 154 domaines, 31 candidats
   * sur 32, 0 cible). [HYPOTHÈSE à recaler] Les tailles inconnues ne sont jamais écartées.
   */
  giantReferringDomains: 10_000,
  /** Mots (lettres) de plus de cette longueur qui restent dans un nom une fois le thème retiré : nom distinctif. */
  distinctiveLetters: 4,
  /** Longueur de la racine de comparaison d'un mot (« coloring » et « coloriages » partagent « color »). */
  stemLength: 5,
} as const;

export interface CompetitorFacts {
  domain: string;
  referringDomains: number | null;
  sampleUrl: string | null;
}

export interface Skipped {
  /** Concurrents dont les pages disparues ne sont pas cherchées, avec la raison lisible. */
  deadPages: { domain: string; reason: string }[];
  /** Raison pour laquelle les mentions de marque ne sont pas cherchées, sinon null. */
  mentions: string | null;
}

/** Raison de ne pas chercher les pages disparues d'un concurrent, ou null s'il vaut un appel. */
export function deadPagesSkipReason(c: CompetitorFacts, language: string): string | null {
  if (c.referringDomains !== null && c.referringDomains >= WORTH_LIMITS.giantReferringDomains) {
    return `site trop gros (${c.referringDomains.toLocaleString("fr-FR")} domaines référents)`;
  }
  const lang = preReadLanguage(
    { domain: c.domain, url: c.sampleUrl, language: null },
    { language },
  );
  if (lang) return `autre langue (${lang})`;
  return null;
}

const letters = (s: string) =>
  normalizeKey(s)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stemOf = (word: string) => word.slice(0, WORTH_LIMITS.stemLength);

/** Mots d'un nom : sépare les majuscules internes (« MegaColoring »), les tirets et l'extension d'un domaine. */
function wordsOfName(name: string): string[] {
  const bare = name
    .replace(/^["«»\s]+|["«»\s]+$/g, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.[a-z]{2,24}(\/.*)?$/i, "");
  const spaced = bare.replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, "$1 $2");
  return letters(spaced)
    .split(" ")
    .filter((w) => w.length > 0);
}

/**
 * Vrai si le nom est DESCRIPTIF : une fois retirés les mots du thème (même racine) il ne reste pas
 * plus de quelques lettres. Chercher « Mega Coloring » pour un site de coloriages ramène des pages de
 * coloriages, pas des mentions de la marque. Un nom court (moins de 5 lettres) est aussi trop
 * ambigu. Les mots du thème viennent de la campagne (thème, mots-clés), jamais d'une liste écrite en dur.
 */
export function isGenericBrand(name: string, themeWords: readonly string[]): boolean {
  const words = wordsOfName(name);
  const compact = words.join("");
  if (compact.length < 5) return true;
  const stems = [
    ...new Set(
      themeWords
        .flatMap((t) => letters(t).split(" "))
        .filter((w) => w.length >= WORTH_LIMITS.stemLength)
        .map(stemOf),
    ),
  ];
  // Lettres qui ne viennent pas du thème : un mot du thème n'en laisse aucune (la fin du mot est une
  // flexion), un mot collé « megacoloring » laisse ce qui précède la racine (« mega »).
  let leftLetters = 0;
  for (const w of words) {
    const at = stems
      .map((st) => w.indexOf(st))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)[0];
    leftLetters += at === undefined ? w.length : at;
  }
  return leftLetters <= WORTH_LIMITS.distinctiveLetters;
}

/**
 * Ce qu'il reste à chercher pour les mentions : les écritures de marque non génériques. Liste vide =
 * tactique non lancée, avec sa raison.
 */
export function brandMentionPlan(
  variants: readonly string[],
  themeWords: readonly string[],
): { variants: string[]; skipReason: string | null } {
  const keep = variants.filter((v) => !isGenericBrand(v, themeWords));
  if (keep.length > 0) return { variants: keep, skipReason: null };
  if (variants.length === 0) return { variants: [], skipReason: "aucun nom de marque connu" };
  return {
    variants: [],
    skipReason:
      "nom de marque trop descriptif ou trop court : les recherches ramèneraient le thème, pas votre marque",
  };
}

/** Vrai si une requête de marque contient l'une des écritures gardées (comparaison sur le texte compacté). */
export function queryHasBrand(q: string, kept: readonly string[]): boolean {
  const squash = (s: string) => normalizeKey(s).replace(/ /g, "");
  const query = squash(q);
  return kept.some((k) => {
    const key = squash(k.replace(/"/g, ""));
    return key.length >= 3 && query.includes(key);
  });
}
