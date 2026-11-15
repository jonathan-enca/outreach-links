import { normalizeDomain } from "./domain";

/**
 * Sites de test de Jonathan (décision du 15/11/2026) : audits en grandeur nature, sans plafond
 * ni limite d'essais, et jamais servis par le cache DataForSEO (chaque relance repart de zéro).
 * Liste volontairement fixe dans le code : aucun utilisateur ne peut s'y ajouter.
 */
export const TEST_DOMAINS = ["remove-me.io", "mega-coloring.com"] as const;

/** Plafond de coût d'un audit de site de test (USD) : filet de sécurité, pas une limite produit. */
export const TEST_COST_CAP_USD = 50;

export function isTestDomain(input: string | null | undefined): boolean {
  if (!input) return false;
  const d = normalizeDomain(input);
  return d !== null && TEST_DOMAINS.some((t) => d === t || d.endsWith(`.${t}`));
}
