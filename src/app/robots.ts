import type { MetadataRoute } from "next";
import { env } from "@/env";
import { cleanAppUrl } from "@/features/auth/destination";

/** `/robots.txt` : tout est ouvert, sauf l'application, les API, les retours d'authentification, les démos et l'aperçu. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/api", "/auth", "/demo", "/apercu"],
    },
    sitemap: `${cleanAppUrl(env.NEXT_PUBLIC_APP_URL)}/sitemap.xml`,
  };
}
