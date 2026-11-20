/**
 * Le marché d'une campagne (chantier B) : un pays et une langue. Ils pilotent la recherche : lieu et
 * langue des recherches Google (DataForSEO), langue des pages lues, filtre de langue des candidats.
 * Codes de lieu DataForSEO (Google) : France 2250, Belgique 2056, Suisse 2756, Canada 2124,
 * Luxembourg 2442, Royaume-Uni 2826, États-Unis 2840, Australie 2036.
 * Liste voulue par Jonathan (20/11) : marchés francophones et anglophones principaux, sans Monaco.
 */
export const MARKETS = {
  FR: { location: 2250, language: "fr" },
  BE: { location: 2056, language: "fr" },
  CH: { location: 2756, language: "fr" },
  CA: { location: 2124, language: "fr" },
  LU: { location: 2442, language: "fr" },
  GB: { location: 2826, language: "en" },
  US: { location: 2840, language: "en" },
  AU: { location: 2036, language: "en" },
} as const;

export type MarketCountry = keyof typeof MARKETS;
export const MARKET_COUNTRIES = Object.keys(MARKETS) as MarketCountry[];

export const isMarketCountry = (v: unknown): v is MarketCountry =>
  typeof v === "string" && v in MARKETS;

/** Paramètres de localisation d'une recherche Google pour une campagne (France / français par défaut). */
export function serpLocation(
  country: string | null | undefined,
  language: string | null | undefined,
): { location_code: number; language_code: string } {
  const m = isMarketCountry(country) ? MARKETS[country] : MARKETS.FR;
  return {
    location_code: m.location,
    language_code: language === "en" ? "en" : (language ?? m.language),
  };
}

/**
 * Libellés triés en français (ordre alphabétique) : pour les listes déroulantes, jamais l'ordre du code.
 * Le libellé est retrouvé par son code, donc une valeur absente de la liste reste une valeur valide.
 */
export function sortedByLabel<K extends string>(
  labels: Record<K, string>,
): { code: K; label: string }[] {
  return (Object.keys(labels) as K[])
    .map((code) => ({ code, label: labels[code] }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}
