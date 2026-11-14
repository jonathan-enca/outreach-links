/** Nom du cookie qui porte le jeton d'accès au rapport complet d'un audit gratuit. */
export function reportCookieName(auditId: string): string {
  return `oal_${auditId.replace(/-/g, "").slice(0, 16)}`;
}
