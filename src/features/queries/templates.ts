import type { PublisherCategory, PublisherType } from "@/features/brand/schema";
import type { RecipeTactic } from "./schema";

/**
 * Gabarits GÉNÉRIQUES de requêtes par catégorie d'éditeur et par langue (chantier H, MU.6). Le code
 * ne connaît aucun thème : le type d'éditeur (son nom, ses mots) et les mots du thème viennent du
 * profil du site ; ce fichier n'apporte que la forme des requêtes et le vocabulaire commun d'une
 * catégorie (« forum », « annuaire », « magazine »...). Les opérateurs intitle: et inurl: sont
 * autorisés pour cette famille de requêtes seulement.
 */

/** Requêtes GARANTIES par type d'éditeur (les suivantes ne partent que si le budget le permet). */
export const GUARANTEED_PER_TYPE = 4;
export const MAX_PER_TYPE = 9;

interface CategoryWords {
  /** Mots de page courants pour cette catégorie. */
  pages: readonly string[];
  /** Fragments d'adresse courants (sans accent). */
  inurl: readonly string[];
}

type Lang = "fr" | "en";

const WORDS: Record<Lang, Record<PublisherCategory, CategoryWords>> = {
  fr: {
    ecole: { pages: ["ressources pédagogiques", "site de l'école"], inurl: ["ecole", "classe"] },
    collectivite: { pages: ["mairie", "liens utiles"], inurl: ["mairie", "ville"] },
    association: { pages: ["association", "nos liens"], inurl: ["asso", "association"] },
    bibliotheque: { pages: ["médiathèque", "sélection"], inurl: ["mediatheque", "bibliotheque"] },
    forum: { pages: ["forum", "discussion"], inurl: ["forum"] },
    media: { pages: ["magazine", "dossier"], inurl: ["magazine"] },
    boutique: { pages: ["boutique blog", "conseils"], inurl: ["blog"] },
    annuaire: { pages: ["annuaire", "sites à découvrir"], inurl: ["annuaire", "liens"] },
    blog: { pages: ["blog", "mes sites préférés"], inurl: ["blog"] },
    professionnel: { pages: ["blog", "ressources"], inurl: ["blog"] },
    autre: { pages: ["ressources", "sites à découvrir"], inurl: ["liens"] },
  },
  en: {
    ecole: { pages: ["teaching resources", "school website"], inurl: ["school", "class"] },
    collectivite: { pages: ["council", "useful links"], inurl: ["council", "city"] },
    association: { pages: ["association", "our links"], inurl: ["association", "club"] },
    bibliotheque: { pages: ["library", "recommended"], inurl: ["library"] },
    forum: { pages: ["forum", "discussion"], inurl: ["forum"] },
    media: { pages: ["magazine", "feature"], inurl: ["magazine"] },
    boutique: { pages: ["shop blog", "tips"], inurl: ["blog"] },
    annuaire: { pages: ["directory", "sites we like"], inurl: ["directory", "links"] },
    blog: { pages: ["blog", "favourite sites"], inurl: ["blog"] },
    professionnel: { pages: ["blog", "resources"], inurl: ["blog"] },
    autre: { pages: ["resources", "sites we like"], inurl: ["links"] },
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
      if (/^(intitle|inurl):/.test(w)) {
        out.push(w);
        continue;
      }
      const k = fold(w).replace(/^["']|["']$/g, "");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(w);
    }
  }
  return out.join(" ");
}

/** intitle: sur une expression : entre guillemets si elle a plusieurs mots. */
const intitle = (term: string) => (term.includes(" ") ? `intitle:"${term}"` : `intitle:${term}`);

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
  // intitle: ne vaut que pour un mot court (un titre contient rarement une longue expression exacte).
  const short = [...type.terms]
    .filter((x) => x.split(" ").length <= 2)
    .sort((a, b) => a.split(" ").length - b.split(" ").length || a.length - b.length);
  const [s0, s1] = short;
  const raw: (TypeQuery | null)[] = [
    { q: joinWords(t0, th0), tactic: "inconnus" },
    s0
      ? { q: joinWords(intitle(s0), th0), tactic: "inconnus" }
      : { q: joinWords(w.pages[0], t0, th0), tactic: "inconnus" },
    { q: t1 ? joinWords(t1, th1 ?? th0) : joinWords(w.pages[0], t0, th0), tactic: "inconnus" },
    { q: joinWords(th0, `inurl:${w.inurl[0]}`), tactic: "inconnus" },
    th1 ? { q: joinWords(t0, th1), tactic: "inconnus" } : null,
    { q: joinWords(t0, th0, RESOURCE_WORDS[lang]), tactic: "ressources" },
    s1 ? { q: joinWords(intitle(s1), th0), tactic: "inconnus" } : null,
    t1 ? { q: joinWords(t1, th0), tactic: "inconnus" } : null,
    t2 ? { q: joinWords(t2, th0), tactic: "inconnus" } : null,
    w.inurl[1] ? { q: joinWords(th0, `inurl:${w.inurl[1]}`), tactic: "inconnus" } : null,
    { q: joinWords(w.pages[1], t0, th0), tactic: "inconnus" },
    { q: joinWords(w.pages[0], t0, th0), tactic: "inconnus" },
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
