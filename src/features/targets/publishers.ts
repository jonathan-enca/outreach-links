import type { PublisherCategory, PublisherType } from "@/features/brand/schema";
import type { SiteType } from "@/features/qualification/types";

/**
 * Chantier H : la diversité se MONTRE sans jamais exclure. Chaque cible est rangée sous le type
 * d'éditeur cherché auquel elle correspond (un onglet par type, avec son compteur), et un type
 * cherché sans cible est affiché tel quel, à zéro. Le tri par score ne change pas.
 */

/** Type de site jugé (qualification) correspondant à une catégorie générique d'éditeur. */
const SITE_TYPE_OF: Partial<Record<PublisherCategory, SiteType>> = {
  ecole: "ecole",
  collectivite: "mairie",
  association: "association",
  forum: "forum_modere",
  media: "media",
  boutique: "ecommerce",
  annuaire: "annuaire",
  blog: "blog",
};

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Radical d'un mot pour comparer singulier et pluriel (« clubs » et « club »). */
const stem = (w: string) => (w.length > 4 ? w.replace(/(s|x)$/, "") : w);
const stems = (s: string) => fold(s).split(" ").filter(Boolean).map(stem);

/** Vrai si tous les mots de l'expression figurent, dans l'ordre, dans le texte. */
function containsTerm(haystack: string[], term: string): boolean {
  const needle = stems(term);
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

export interface PublisherSignals {
  domain: string;
  pageTitle: string | null;
  siteType: SiteType | null;
  /** Types d'éditeurs dont une recherche a trouvé ce site (libellés). */
  foundBy: readonly string[];
}

/**
 * Le type d'éditeur cherché auquel une cible correspond, ou null (« autres sites »). Trois indices,
 * du plus précis au plus large : un mot du type dans le nom du site ou le titre de sa page ; la
 * recherche de ce type qui l'a trouvé ; le type de site jugé, s'il correspond à la catégorie.
 */
export function assignPublisher(
  target: PublisherSignals,
  types: readonly PublisherType[],
): string | null {
  const text = [...stems(target.domain.replace(/[.-]/g, " ")), ...stems(target.pageTitle ?? "")];
  let best: { label: string; size: number } | null = null;
  for (const t of types) {
    for (const term of t.terms) {
      const size = stems(term).length;
      if (containsTerm(text, term) && (!best || size > best.size)) best = { label: t.label, size };
    }
  }
  if (best) return best.label;
  // La recherche d'un type a trouvé ce site : retenu si le type jugé ne dit pas autre chose.
  for (const t of types) {
    if (!target.foundBy.includes(t.label)) continue;
    const expected = SITE_TYPE_OF[t.category];
    if (!expected || !target.siteType || expected === target.siteType) return t.label;
  }
  if (target.siteType) {
    const same = types.find((t) => SITE_TYPE_OF[t.category] === target.siteType);
    if (same) return same.label;
  }
  return null;
}

export interface PublisherTab {
  /** Libellé du type cherché ; null pour « autres sites ». */
  label: string | null;
  count: number;
  origin: PublisherType["origin"] | null;
}

/** Les onglets : un par type cherché (même à zéro), puis « autres sites » s'il y en a. */
export function publisherTabs(
  assigned: readonly (string | null)[],
  types: readonly PublisherType[],
): PublisherTab[] {
  const tabs: PublisherTab[] = types.map((t) => ({
    label: t.label,
    count: assigned.filter((a) => a === t.label).length,
    origin: t.origin,
  }));
  const others = assigned.filter((a) => a === null || !types.some((t) => t.label === a)).length;
  if (others > 0) tabs.push({ label: null, count: others, origin: null });
  return tabs;
}
