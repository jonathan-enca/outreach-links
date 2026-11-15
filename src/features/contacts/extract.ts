import type { PageLink } from "@/features/triage/page-reader";

const EMAIL_RE =
  /[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]{2,63})+/gi;

/** Réseaux sociaux et plateformes : jamais un contact d'outreach. */
const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
  "wa.me",
  "t.me",
];
const BAD_DOMAINS = [
  "example.com",
  "example.org",
  "domain.com",
  "email.com",
  "sentry.io",
  "wixpress.com",
  "sentry-next.wixpress.com",
  "yourdomain.com",
  "votredomaine.fr",
  "monsite.fr",
];
const BAD_LOCAL =
  /^(no-?reply|do-?not-?reply|ne-?pas-?repondre|mailer-daemon|postmaster|abuse|privacy|dpo|rgpd|unsubscribe|bounce|support-?tech)/i;
const IMAGE_TLD = /\.(png|jpe?g|gif|webp|svg|avif|css|js|woff2?)$/i;
const PLACEHOLDER_LOCAL =
  /^(votre|your|email|mail|nom|name|prenom|exemple|example|test|xxx+|john\.?doe)$/i;

/** « contact [at] site.fr », « contact(arobase)site.fr » -> « contact@site.fr ». */
export function deobfuscate(text: string): string {
  return text
    .replace(/\s*[[({]\s*(?:at|arobase|@)\s*[\])}]\s*/gi, "@")
    .replace(/\s+(?:arobase)\s+/gi, "@")
    .replace(/\s*[[({]\s*(?:dot|point)\s*[\])}]\s*/gi, ".");
}

function domainOf(email: string): string {
  return email.split("@")[1] ?? "";
}

const isUnder = (host: string, base: string) => host === base || host.endsWith(`.${base}`);

/** Vrai pour une adresse exploitable (ni réseau social, ni no-reply, ni gabarit, ni fichier). */
export function isUsableEmail(email: string): boolean {
  const e = email.toLowerCase();
  const [local = "", host = ""] = e.split("@");
  if (!local || !host || IMAGE_TLD.test(host)) return false;
  if (SOCIAL_DOMAINS.some((d) => isUnder(host, d))) return false;
  if (BAD_DOMAINS.some((d) => isUnder(host, d))) return false;
  if (BAD_LOCAL.test(local) || PLACEHOLDER_LOCAL.test(local)) return false;
  if (/^[0-9a-f]{16,}$/.test(local)) return false;
  return true;
}

/** Tous les emails exploitables d'un texte et de liens `mailto:`, sans doublon, en minuscules. */
export function extractEmails(text: string, mailtos: readonly string[] = []): string[] {
  const found = new Set<string>();
  for (const m of mailtos) if (isUsableEmail(m)) found.add(m.toLowerCase());
  for (const m of deobfuscate(text).matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase().replace(/\.+$/, "");
    if (isUsableEmail(e)) found.add(e);
  }
  return [...found];
}

const PREFERRED_LOCAL =
  /^(contact|bonjour|hello|redaction|info|infos|partenariat|partenariats|webmaster|equipe)$/i;

const strip = (d: string) => d.replace(/^www\./, "").toLowerCase();

/**
 * Classe les emails : ceux du domaine de la cible d'abord (une adresse tierce sur une page,
 * par exemple celle d'un agenceur, est moins fiable), puis les adresses de contact usuelles.
 */
export function rankEmails(emails: readonly string[], siteDomain: string): string[] {
  const dom = strip(siteDomain);
  const score = (e: string) => {
    const [local = "", host = ""] = e.split("@");
    let s = 0;
    if (isUnder(host, dom) || isUnder(dom, host)) s += 4;
    if (PREFERRED_LOCAL.test(local)) s += 1;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a));
}

/** Vrai si l'email est sur le domaine de la cible ou un sous-domaine. */
export function isOwnDomainEmail(email: string, siteDomain: string): boolean {
  const host = domainOf(email);
  const dom = strip(siteDomain);
  return isUnder(host, dom) || isUnder(dom, host);
}

const CONTACT_PATH =
  /(contact|nous-contacter|contactez|mentions?-?legales?|mentions|legal|cgu|cgv|conditions|a-propos|apropos|about|qui-sommes|equipe|redaction|ecrire)/i;

/** Pages internes les plus utiles pour trouver un contact (contact d'abord, légal ensuite). */
export function contactCandidates(links: readonly PageLink[], max: number): string[] {
  const rank = (l: PageLink) => {
    const hay = `${new URL(l.href).pathname} ${l.text}`.toLowerCase();
    if (/contact|ecrire|contactez/.test(hay)) return 0;
    if (/mention|legal|cgu|conditions/.test(hay)) return 1;
    return 2;
  };
  const out: PageLink[] = [];
  for (const l of links) {
    try {
      const hay = `${new URL(l.href).pathname} ${l.text}`;
      if (CONTACT_PATH.test(hay)) out.push(l);
    } catch {
      /* lien invalide ignoré */
    }
  }
  return out
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, max)
    .map((l) => l.href);
}
