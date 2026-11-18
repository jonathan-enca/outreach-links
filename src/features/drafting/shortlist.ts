/**
 * Présélection gratuite des pages du site à montrer au modèle (MC.6e, 18/11/2026) : le catalogue
 * complet peut compter 1 000 pages, le modèle n'en voit que les 20 à 30 qui partagent le plus de mots
 * avec la page de la cible. Aucun mot propre à un thème : seuls des mots vides (français, anglais) sont
 * ignorés, et les mots sont comparés sans accent ni pluriel.
 */
export interface CatalogueEntry {
  url: string;
  title: string;
  /** Titre principal (h1) de la page, quand elle a été visitée. */
  heading?: string;
  description: string;
}

const STOP = new Set(
  (
    "le la les un une des du de d l et ou à a au aux en dans sur sous par pour avec sans ce cet cette ces " +
    "son sa ses leur leurs mon ma mes ton ta tes notre votre nos vos qui que quoi dont où se sa il elle ils " +
    "elles on nous vous je tu est sont être avoir fait faire plus moins très tout tous toute toutes comme " +
    "mais donc car ni ne pas cas aussi ainsi entre chez vers sur the of and or to in on for with by is are " +
    "be as at it this that from your our www http https com net org fr html php page pages article articles " +
    "blog site accueil index"
  ).split(/\s+/),
);

/** Mots utiles d'un texte : minuscules, sans accent, sans pluriel simple, 3 lettres au moins. */
export function words(text: string): string[] {
  const out: string[] = [];
  const plain = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  for (const raw of plain.split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw) || /^\d+$/.test(raw)) continue;
    out.push(raw.length > 4 && raw.endsWith("s") ? raw.slice(0, -1) : raw);
  }
  return out;
}

/** Mots de l'adresse : le chemin seulement (l'adresse d'un site sans titre dit encore son sujet). */
function pathWords(url: string): string[] {
  try {
    return words(decodeURIComponent(new URL(url).pathname).replace(/[-_/.]+/g, " "));
  } catch {
    return [];
  }
}

export interface ShortlistTarget {
  url: string;
  title: string;
  description?: string;
  /** Début du texte de la page : le sujet vit surtout dans les titres et la première partie. */
  text?: string;
}

/**
 * Les `max` pages du catalogue les plus proches de la page de la cible (pur, testé). Un mot compte plus
 * s'il est rare dans le catalogue (pondération par fréquence inverse) et plus encore quand il figure
 * dans le titre de la page du site. Une page sans mot commun n'est jamais gardée sauf pour compléter à
 * `min` : le modèle voit toujours quelques pages, même quand la cible est éloignée.
 */
export function shortlistCatalogue<T extends CatalogueEntry>(
  target: ShortlistTarget,
  catalogue: readonly T[],
  max: number,
  min = 8,
): T[] {
  if (catalogue.length <= max) return [...catalogue];
  const targetWords = new Map<string, number>();
  const add = (list: string[], weight: number) => {
    for (const w of list) targetWords.set(w, Math.max(targetWords.get(w) ?? 0, weight));
  };
  add(words((target.text ?? "").slice(0, 1_500)), 1);
  add(words(target.description ?? ""), 2);
  add([...words(target.title), ...pathWords(target.url)], 3);

  const docs = catalogue.map((p) => {
    const strong = new Set([...words(`${p.title} ${p.heading ?? ""}`), ...pathWords(p.url)]);
    const weak = new Set(words(p.description));
    return { p, strong, weak };
  });
  const df = new Map<string, number>();
  for (const d of docs)
    for (const w of new Set([...d.strong, ...d.weak])) df.set(w, (df.get(w) ?? 0) + 1);
  const idf = (w: string) => Math.log(1 + docs.length / (df.get(w) ?? 1));

  const scored = docs.map((d, i) => {
    let score = 0;
    for (const [w, tw] of targetWords) {
      if (d.strong.has(w)) score += tw * 2 * idf(w);
      else if (d.weak.has(w)) score += tw * idf(w);
    }
    return { p: d.p, i, score };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const matching = scored.filter((s) => s.score > 0).slice(0, max);
  const picked =
    matching.length >= min ? matching : scored.slice(0, Math.max(min, matching.length));
  return picked.map((s) => s.p);
}
