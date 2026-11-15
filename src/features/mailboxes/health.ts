import { resolveTxt } from "node:dns/promises";

export type DnsTxt = (name: string) => Promise<string[]>;

export interface HealthReport {
  domain: string;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  /** Sélecteurs DKIM courants testés : l'absence n'est pas une preuve, seulement un avertissement. */
  checkedAt: string;
}

export const DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "mail", "s1"];

const defaultTxt: DnsTxt = async (name) => {
  try {
    return (await resolveTxt(name)).map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
};

/** Détecte SPF, DMARC et (par sélecteurs courants) DKIM du domaine d'envoi. Lecture DNS seule. */
export async function checkDomainHealth(
  emailAddress: string,
  txt: DnsTxt = defaultTxt,
  now: () => Date = () => new Date(),
): Promise<HealthReport> {
  const domain = emailAddress.split("@")[1]?.toLowerCase() ?? "";
  const [root, dmarc, ...dkim] = await Promise.all([
    txt(domain),
    txt(`_dmarc.${domain}`),
    ...DKIM_SELECTORS.map((s) => txt(`${s}._domainkey.${domain}`)),
  ]);
  return {
    domain,
    spf: root.some((r) => r.toLowerCase().startsWith("v=spf1")),
    dmarc: dmarc.some((r) => r.toLowerCase().startsWith("v=dmarc1")),
    dkim: dkim.some((recs) => recs.some((r) => /v=dkim1|p=/i.test(r))),
    checkedAt: now().toISOString(),
  };
}
