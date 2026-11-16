import { hostOf } from "@/features/audits/excluded-domains";

/**
 * Hébergeurs « multi-sites » (MT.4) : chaque sous-domaine est un site distinct, tenu par une personne
 * ou une association (monblog.over-blog.com, ecole-jules-ferry.ac-lyon.fr). La liste de M1.3 exclut
 * blogspot, wordpress.com ou tumblr comme concurrents ; pour les CIBLES, un petit blog hébergé est
 * souvent exactement le site « que personne ne sollicite ». Règle : le sous-domaine d'un utilisateur
 * est gardé, la racine de la plateforme (blogspot.com, eklablog.com) ne l'est jamais (on ne demande
 * pas un lien à un hébergeur). Une entrée « x.* » couvre tous les TLD (blogspot.fr, blogspot.co.uk).
 */
export const BLOG_PLATFORMS: readonly string[] = [
  "blogspot.*",
  "wordpress.com",
  "over-blog.com",
  "over-blog.fr",
  "overblog.com",
  "eklablog.com",
  "eklablog.fr",
  "canalblog.com",
  "blog4ever.com",
  "hautetfort.com",
  "e-monsite.com",
  "jimdofree.com",
  "jimdo.com",
  "wixsite.com",
  "webnode.fr",
  "webnode.com",
  "kazeo.com",
  "centerblog.net",
  "skyrock.com",
  "unblog.fr",
  "tumblr.com",
  "weebly.com",
  "sitew.com",
  "free.fr",
  "pagesperso-orange.fr",
];

/** Académies (rectorats) : chaque école ou collège a son sous-domaine (ecole-x.ac-lyon.fr). */
const ACADEMY = /(^|\.)ac-[a-z0-9-]+\.fr$/;

/** Suffixes publics à deux étiquettes les plus courants (approximation sans liste complète). */
const MULTI_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.br",
  "co.jp",
  "com.mx",
  "com.tr",
  "co.za",
  "com.ar",
  "gouv.fr",
  "asso.fr",
  "nom.fr",
  "tm.fr",
  "com.fr",
  "co.in",
]);

/** Domaine enregistrable approximatif : « blog.exemple.co.uk » -> « exemple.co.uk ». */
export function registrableDomain(input: string): string {
  const labels = hostOf(input).split(".");
  if (labels.length <= 2) return labels.join(".");
  const last2 = labels.slice(-2).join(".");
  return labels.slice(MULTI_SUFFIXES.has(last2) ? -3 : -2).join(".");
}

/** Racine de la plateforme si `host` en est une (sous-domaine d'utilisateur ou racine), sinon null. */
export function blogPlatformOf(input: string): string | null {
  const host = hostOf(input);
  for (const entry of BLOG_PLATFORMS) {
    if (entry.endsWith(".*")) {
      const label = entry.slice(0, -2);
      const labels = host.split(".");
      const i = labels.lastIndexOf(label);
      // blogspot.com, blogspot.co.uk : le label est suivi d'un suffixe d'une ou deux étiquettes.
      if (i >= 0 && labels.length - i - 1 >= 1 && labels.length - i - 1 <= 2) {
        return labels.slice(i).join(".");
      }
      continue;
    }
    if (host === entry || host.endsWith(`.${entry}`)) return entry;
  }
  return null;
}

/** Vrai pour le site d'un utilisateur hébergé sur une plateforme (monblog.blogspot.com). */
export function isPlatformUserSite(input: string): boolean {
  const host = hostOf(input);
  const platform = blogPlatformOf(host);
  return platform !== null && host !== platform && host.endsWith(`.${platform}`);
}

/** Vrai pour la racine d'une plateforme de blogs (eklablog.com) : jamais une cible. */
export function isPlatformRoot(input: string): boolean {
  const host = hostOf(input);
  const platform = blogPlatformOf(host);
  return platform !== null && host === platform;
}

/** Sous-domaine d'une académie (école, collège) : un éditeur distinct de son rectorat. */
export function isAcademySubsite(input: string): boolean {
  const host = hostOf(input);
  return ACADEMY.test(host) && registrableDomain(host) !== host;
}

/**
 * Clé de déduplication d'un candidat : le site d'un utilisateur de plateforme ou d'une école garde son
 * hôte complet (éditeurs distincts) ; sinon le domaine enregistrable (fr.exemple.com = exemple.com).
 */
export function dedupKey(input: string): string {
  const host = hostOf(input);
  if (isPlatformUserSite(host) || isAcademySubsite(host)) return host;
  return registrableDomain(host);
}
