import type { MetadataRoute } from "next";
import { env } from "@/env";
import { cleanAppUrl } from "@/features/auth/destination";
import { contentSitemapEntries } from "@/features/content/listing";
import { guideHref, GUIDES_BASE, PROVIDERS } from "@/features/mailboxes/providers";

/** Relu toutes les heures : un contenu programmé entre au sitemap à sa date, sans redéploiement. */
export const revalidate = 3600;

/**
 * Chemins publics fixes à indexer. Les contenus de `content/` (guides, blog, glossaire, comparatifs) et
 * leurs index s'ajoutent seuls, une fois en ligne (`contentSitemapEntries`). Jamais de page en `noindex`.
 */
function publicPaths(): string[] {
  return [
    "/",
    GUIDES_BASE,
    ...PROVIDERS.map((p) => guideHref(p.slug)),
    "/mentions-legales",
    "/conditions",
    "/confidentialite",
  ];
}

/** `/sitemap.xml` : les pages publiques, en adresses absolues sur l'URL du site. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = cleanAppUrl(env.NEXT_PUBLIC_APP_URL);
  return [
    ...publicPaths().map((path) => ({ url: path === "/" ? base : `${base}${path}` })),
    ...contentSitemapEntries().map((e) => ({
      url: `${base}${e.path}`,
      lastModified: e.lastModified,
    })),
  ];
}
