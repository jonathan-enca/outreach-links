import type { NextConfig } from "next";

// Valide les variables d'environnement dès le build : échec bruyant si l'une manque.
import "./src/env";

// Vidéo et vignette de la home : le nom des fichiers n'est pas versionné, donc un jour de cache (et une semaine
// de « stale-while-revalidate ») plutôt qu'un cache immuable.
const MEDIA_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  async headers() {
    return ["/visite-produit.mp4", "/visite-produit-poster.webp"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: MEDIA_CACHE }],
    }));
  },
};

export default nextConfig;
