import type { PublisherCategory, PublisherType } from "@/features/brand/schema";
import type { RecipeTactic } from "./schema";

/**
 * Gabarits GÉNÉRIQUES de requêtes par catégorie d'éditeur et par langue (chantier H, MU.6). Le code
 * ne connaît aucun thème : le type d'éditeur (son nom, ses mots) et les mots du thème viennent du
 * profil du site ; ce fichier n'apporte que la forme des requêtes et le vocabulaire commun d'une
 * catégorie (« forum », « annuaire », « magazine »...).
 *
 * PAS d'opérateur (intitle:, inurl:) : mesuré au run réel du 17/11/2026, le fournisseur facture une
 * recherche avec opérateur CINQ fois plus cher (0,03 USD contre 0,006), et le budget s'épuisait après
 * 28 recherches sur 40. À prix égal, cinq recherches simples trouvent plus de sites qu'une recherche
 * à opérateur. Les mots de la catégorie remplacent l'opérateur (« mairie », « forum », « magazine »).
 */

/** Requêtes GARANTIES par type d'éditeur (les suivantes ne partent que si le budget le permet). */
export const GUARANTEED_PER_TYPE = 4;
export const MAX_PER_TYPE = 9;

interface CategoryWords {
  /** Mots de page courants pour cette catégorie. */
  pages: readonly string[];
}

type Lang = "fr" | "en";

const WORDS: Record<Lang, Record<PublisherCategory, CategoryWords>> = {
  fr: {
    ecole: { pages: ["ressources pédagogiques", "site de l'école"] },
    collectivite: { pages: ["mairie", "liens utiles"] },
    association: { pages: ["association", "nos liens"] },
    bibliotheque: { pages: ["médiathèque", "sélection"] },
    forum: { pages: ["forum", "discussion"] },
    media: { pages: ["magazine", "dossier"] },
    boutique: { pages: ["boutique blog", "conseils"] },
    annuaire: { pages: ["annuaire", "sites à découvrir"] },
    blog: { pages: ["blog", "mes sites préférés"] },
    professionnel: { pages: ["blog", "ressources"] },
    autre: { pages: ["ressources", "sites à découvrir"] },
  },
  en: {
    ecole: { pages: ["teaching resources", "school website"] },
    collectivite: { pages: ["council", "useful links"] },
    association: { pages: ["association", "our links"] },
    bibliotheque: { pages: ["library", "recommended"] },
    forum: { pages: ["forum", "discussion"] },
    media: { pages: ["magazine", "feature"] },
    boutique: { pages: ["shop blog", "tips"] },
    annuaire: { pages: ["directory", "sites we like"] },
    blog: { pages: ["blog", "favourite sites"] },
    professionnel: { pages: ["blog", "resources"] },
    autre: { pages: ["resources", "sites we like"] },
  },
};

const RESOURCE_WORDS: Record<Lang, string> = { fr: "liens utiles", en: "useful links" };

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Assemble des morceaux en une requête, sans répéter un mot déjà présent (accents ignorés). */
export function joinWords(...parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    for (const w of (part ?? "").split(/\s+/).filter(Boolean)) {
      const k = fold(w).replace(/^["']|["']$/g, "");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(w);
    }
  }
  return out.join(" ");
}

export interface TypeQuery {
  q: string;
  tactic: RecipeTactic;
}

/**
 * Les requêtes d'UN type d'éditeur, dans l'ordre d'intérêt : les `GUARANTEED_PER_TYPE` premières sont
 * garanties. Pur : mêmes entrées, mêmes requêtes. Renvoie une liste vide sans mot de thème.
 */
export function typeQueries(
  type: Pick<PublisherType, "terms" | "category">,
  themeTerms: readonly string[],
  language: string,
): TypeQuery[] {
  const lang: Lang = language === "en" ? "en" : "fr";
  const w = WORDS[lang][type.category] ?? WORDS[lang].autre;
  const [t0, t1, t2] = type.terms;
  const [th0, th1] = themeTerms;
  if (!t0 || !th0) return [];
  const [th2] = themeTerms.slice(2);
  const raw: (TypeQuery | null)[] = [
    { q: joinWords(t0, th0), tactic: "inconnus" },
    { q: t1 ? joinWords(t1, th1 ?? th0) : joinWords(w.pages[0], t0, th0), tactic: "inconnus" },
    th1
      ? { q: joinWords(t0, th1), tactic: "inconnus" }
      : { q: joinWords(w.pages[1], t0, th0), tactic: "inconnus" },
    { q: joinWords(t0, th0, RESOURCE_WORDS[lang]), tactic: "ressources" },
    t1 ? { q: joinWords(t1, th0), tactic: "inconnus" } : null,
    { q: joinWords(w.pages[0], t0, th0), tactic: "inconnus" },
    t2 ? { q: joinWords(t2, th0), tactic: "inconnus" } : null,
    th2 ? { q: joinWords(t0, th2), tactic: "inconnus" } : null,
    { q: joinWords(w.pages[1], t0, th0), tactic: "inconnus" },
    t1 && th1 ? { q: joinWords(t1, th1, RESOURCE_WORDS[lang]), tactic: "ressources" } : null,
  ];
  const out: TypeQuery[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (!x) continue;
    const k = fold(x.q);
    if (seen.has(k) || x.q.split(" ").length < 2) continue;
    seen.add(k);
    out.push(x);
  }
  return out.slice(0, MAX_PER_TYPE);
}
