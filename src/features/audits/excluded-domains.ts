/**
 * Plateformes génériques exclues de la liste des concurrents (PLAN 1.3) : elles se
 * classent sur presque toutes les requêtes mais ne sont ni des concurrents ni des
 * cibles de lien réalistes. Liste CONFIGURABLE : modifier ici, ou passer `extra` à
 * `isExcludedDomain`. Une entrée "amazon.*" couvre tous les TLD ; une entrée
 * "wikipedia.org" couvre aussi ses sous-domaines (fr.wikipedia.org).
 */
export const DEFAULT_EXCLUDED_DOMAINS: readonly string[] = [
  // Encyclopédies et Q&R
  "wikipedia.org",
  "wikimedia.org",
  "wikihow.com",
  "quora.com",
  "reddit.com",
  // Vidéo et réseaux sociaux
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "instagram.com",
  "pinterest.*",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",
  "snapchat.com",
  "tumblr.com",
  "threads.net",
  // Places de marché et e-commerce généralistes
  "amazon.*",
  "ebay.*",
  "etsy.com",
  "aliexpress.*",
  "cdiscount.com",
  "fnac.com",
  "leboncoin.fr",
  "rakuten.com",
  "temu.com",
  "shein.*",
  // Hébergeurs de blogs et de code, stores d'applications, outils généralistes
  "wordpress.com",
  "blogspot.*",
  "medium.com",
  "github.com",
  "google.*",
  "apple.com",
  "microsoft.com",
  "bing.com",
  "yahoo.com",
  "archive.org",
  "canva.com",
  "slideshare.net",
  "scribd.com",
];

/**
 * MA.1 : très grands sites (banques d'images, grande distribution, médias généralistes,
 * encyclopédies, institutions). Constaté sur le premier audit réel : cultura, shutterstock et
 * pixabay sortaient comme « concurrents », peu actionnables pour un petit site (nous ne
 * pouvons pas viser leurs liens ni raisonner sur leur écart). Filtre sans coût d'API, appliqué
 * avec la liste générique ; configurable (même syntaxe, "x.*" = tous les TLD).
 */
export const GIANT_DOMAINS: readonly string[] = [
  // Banques d'images, de vecteurs et de design
  "shutterstock.com",
  "pixabay.com",
  "freepik.com",
  "unsplash.com",
  "pexels.com",
  "istockphoto.com",
  "gettyimages.*",
  "adobe.com",
  "dreamstime.com",
  "depositphotos.com",
  "123rf.com",
  "vecteezy.com",
  "flaticon.com",
  "pngtree.com",
  "alamy.com",
  "behance.net",
  "dribbble.com",
  "deviantart.com",
  "flickr.com",
  // Grande distribution, culture et loisirs
  "cultura.com",
  "decathlon.*",
  "carrefour.*",
  "auchan.*",
  "e.leclerc",
  "leclerc.com",
  "darty.com",
  "boulanger.com",
  "manomano.*",
  "leroymerlin.*",
  "ikea.com",
  "kingjouet.com",
  "king-jouet.com",
  "joueclub.fr",
  "lego.com",
  "maisonsdumonde.com",
  "hema.*",
  // Médias généralistes, portails et référence
  "lemonde.fr",
  "lefigaro.fr",
  "leparisien.fr",
  "20minutes.fr",
  "ouest-france.fr",
  "francetvinfo.fr",
  "bfmtv.com",
  "tf1info.fr",
  "doctissimo.fr",
  "marmiton.org",
  "journaldesfemmes.fr",
  "commentcamarche.net",
  "futura-sciences.com",
  "larousse.fr",
  "lerobert.com",
  "linternaute.com",
  "allocine.fr",
  "bbc.*",
  "nytimes.com",
  "theguardian.com",
  // Institutions
  "gouv.fr",
  "service-public.fr",
  "education.fr",
  "europa.eu",
];

/** "https://www.Exemple.fr/x" ou "www.exemple.fr" -> "exemple.fr". */
export function hostOf(input: string): string {
  const raw = input.trim().toLowerCase();
  const noProto = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const host = noProto.split(/[/?#]/)[0] ?? "";
  return host
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

function matches(host: string, entry: string): boolean {
  if (entry.endsWith(".*")) {
    const label = entry.slice(0, -2);
    // amazon.* : "amazon.fr", "amazon.co.uk", "smile.amazon.de" ; pas "notamazon.fr"
    return host.split(".").slice(0, -1).includes(label);
  }
  return host === entry || host.endsWith(`.${entry}`);
}

export function isExcludedDomain(
  host: string,
  extra: readonly string[] = [],
  base: readonly string[] = [...DEFAULT_EXCLUDED_DOMAINS, ...GIANT_DOMAINS],
): boolean {
  const h = hostOf(host);
  return [...base, ...extra].some((e) => matches(h, e.toLowerCase()));
}

/** Le domaine du site lui-même (et ses sous-domaines) n'est jamais un concurrent. */
export function isOwnDomain(host: string, ownDomain: string): boolean {
  const h = hostOf(host);
  const own = hostOf(ownDomain);
  return h === own || h.endsWith(`.${own}`);
}
