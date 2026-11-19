/**
 * « 19,90 € » ; sans décimales si le prix est rond. Module neutre (sans configuration serveur) :
 * utilisable dans les composants client comme dans les pages.
 */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
