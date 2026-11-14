/** Montant en dollars, format français (le fournisseur facture en USD). */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  }).format(value);
}
