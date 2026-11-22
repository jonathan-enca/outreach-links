import type { MetadataRoute } from "next";
import { env } from "@/env";
import { cleanAppUrl } from "@/features/auth/destination";
import { guideHref, GUIDES_BASE, PROVIDERS } from "@/features/mailboxes/providers";

/**
 * Chemins publics à indexer. Pour ajouter un contenu (article, page tactique…), ajouter son chemin
 * ici, ou une ligne `...liste.map(...)` comme pour les guides. Jamais de page en `noindex`.
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
  return publicPaths().map((path) => ({ url: path === "/" ? base : `${base}${path}` }));
}
