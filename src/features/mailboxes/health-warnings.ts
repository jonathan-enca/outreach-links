/** Avertissements lisibles (jamais bloquants : le test de connexion décide). */
export function healthWarnings(h: { spf: boolean; dkim: boolean; dmarc: boolean }): string[] {
  const w: string[] = [];
  if (!h.spf) w.push("spf");
  if (!h.dkim) w.push("dkim");
  if (!h.dmarc) w.push("dmarc");
  return w;
}
