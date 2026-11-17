import { promises as dns } from "node:dns";

export type AuthCheck = "ok" | "absent" | "inconnu";

export interface DomainAuth {
  spf: AuthCheck;
  dkim: AuthCheck;
  dmarc: AuthCheck;
}

type TxtResolver = (name: string) => Promise<string[][]>;

/** Sélecteurs DKIM des fournisseurs courants (Google, Microsoft, OVH, Infomaniak, Brevo, Mailjet…). */
const DKIM_SELECTORS = [
  "google",
  "selector1",
  "selector2",
  "default",
  "ovhmo-selector-1",
  "k1",
  "s1",
  "mail",
  "dkim",
];

async function txt(resolve: TxtResolver, name: string): Promise<string[] | null> {
  try {
    return (await resolve(name)).map((parts) => parts.join(""));
  } catch (e) {
    const code = (e as { code?: string }).code;
    // Aucun enregistrement : réponse sûre. Toute autre erreur (délai, panne) : on ne sait pas.
    return code === "ENOTFOUND" || code === "ENODATA" ? [] : null;
  }
}

/**
 * Contrôles anti-spam d'un domaine d'envoi : SPF (qui a le droit d'envoyer), DKIM (messages signés) et
 * DMARC (que faire d'un message non conforme). Lecture DNS seule, gratuite. DKIM n'a pas d'adresse
 * fixe : on essaie les sélecteurs courants ; aucun trouvé = « inconnu », jamais « absent ».
 */
export async function checkDomainAuth(
  domain: string,
  resolve: TxtResolver = (n) => dns.resolveTxt(n),
): Promise<DomainAuth> {
  const d = domain.toLowerCase().replace(/^www\./, "");
  const [root, dmarc, ...dkims] = await Promise.all([
    txt(resolve, d),
    txt(resolve, `_dmarc.${d}`),
    ...DKIM_SELECTORS.map((s) => txt(resolve, `${s}._domainkey.${d}`)),
  ]);
  const has = (rows: string[] | null, re: RegExp): AuthCheck =>
    rows === null ? "inconnu" : rows.some((r) => re.test(r)) ? "ok" : "absent";
  return {
    spf: has(root, /^v=spf1\b/i),
    dmarc: has(dmarc, /^v=DMARC1\b/i),
    dkim: dkims.some((rows) =>
      rows?.some((r) => /(^|;)\s*(v=DKIM1|k=rsa|p=[A-Za-z0-9+/])/i.test(r)),
    )
      ? "ok"
      : "inconnu",
  };
}
