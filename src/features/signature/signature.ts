import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Signature des messages (réglages « Vos messages »). Elle est composée au moment de l'envoi et de
 * l'affichage, jamais écrite dans le brouillon : un changement de réglage s'applique donc aussi aux
 * messages déjà rédigés. Le brouillon se termine par le prénom seul (règle du rédacteur et du
 * linter) ; ce prénom est remplacé par la signature complète.
 */
export const SIGNATURE_ROLES = ["fondateur", "equipe", "agence"] as const;
export type SignatureRole = (typeof SIGNATURE_ROLES)[number];

/** Ce que l'utilisateur accepte de proposer si un éditeur demande une contrepartie. */
export const COUNTERPARTS = ["partage", "article", "lien_retour"] as const;
export type Counterpart = (typeof COUNTERPARTS)[number];

export const isCounterpart = (v: unknown): v is Counterpart =>
  typeof v === "string" && (COUNTERPARTS as readonly string[]).includes(v);

export interface Signature {
  firstName: string;
  lastName: string | null;
  role: SignatureRole | null;
  domain: string;
  showSite: boolean;
  linkedinUrl: string | null;
  phone: string | null;
  logoUrl: string | null;
}

export const SIGNATURE_COLUMNS =
  "domain, founder_role, signature_first_name, signature_last_name, signature_show_site, signature_linkedin_url, signature_phone, signature_logo_token";

export interface SignatureSiteRow {
  domain: string;
  founder_role: string | null;
  signature_first_name: string | null;
  signature_last_name: string | null;
  signature_show_site: boolean;
  signature_linkedin_url: string | null;
  signature_phone: string | null;
  signature_logo_token: string | null;
}

export const logoUrl = (appUrl: string, token: string) =>
  `${appUrl.replace(/\/+$/, "")}/api/logo/${token}`;

/** Nul tant que le prénom manque : sans prénom, aucun message n'est rédigé ni signé. */
export function signatureFromSite(site: SignatureSiteRow, appUrl: string): Signature | null {
  const firstName = site.signature_first_name?.trim();
  if (!firstName) return null;
  const role = (SIGNATURE_ROLES as readonly string[]).includes(site.founder_role ?? "")
    ? (site.founder_role as SignatureRole)
    : null;
  return {
    firstName,
    lastName: site.signature_last_name?.trim() || null,
    role,
    domain: site.domain,
    showSite: site.signature_show_site,
    linkedinUrl: site.signature_linkedin_url?.trim() || null,
    phone: site.signature_phone?.trim() || null,
    logoUrl: site.signature_logo_token ? logoUrl(appUrl, site.signature_logo_token) : null,
  };
}

export async function loadSignature(
  db: SupabaseClient<Database>,
  siteId: string,
  appUrl: string,
): Promise<Signature | null> {
  const { data } = await db.from("sites").select(SIGNATURE_COLUMNS).eq("id", siteId).maybeSingle();
  return data ? signatureFromSite(data as unknown as SignatureSiteRow, appUrl) : null;
}

/** Présentation de l'expéditeur dans le message : la réponse de l'utilisateur, jamais supposée. */
export function presentationText(p: SignatureRole, first: string, site: string): string {
  if (p === "fondateur") return `Je suis ${first}, fondateur de ${site}`;
  if (p === "equipe") return `Je suis ${first}, de l'équipe de ${site}`;
  return `Je suis ${first} et je travaille avec l'éditeur de ${site}`;
}

export function fullName(s: Pick<Signature, "firstName" | "lastName">): string {
  return s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;
}

export function roleLine(role: SignatureRole | null, domain: string): string | null {
  if (role === "fondateur") return `Fondateur de ${domain}`;
  if (role === "equipe") return `Équipe de ${domain}`;
  if (role === "agence") return `Pour ${domain}`;
  return null;
}

/** Adresse LinkedIn telle qu'on la lit : sans protocole ni « www. », sans barre finale. */
export function shortUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

export interface SignatureLine {
  text: string;
  /** Présent pour une ligne cliquable. */
  href?: string;
  strong?: boolean;
}

/** Les lignes de la signature, dans l'ordre d'affichage. */
export function signatureLines(s: Signature): SignatureLine[] {
  const lines: SignatureLine[] = [{ text: fullName(s), strong: true }];
  const role = roleLine(s.role, s.domain);
  if (role) lines.push({ text: role });
  if (s.showSite) lines.push({ text: s.domain, href: `https://${s.domain}` });
  if (s.linkedinUrl) lines.push({ text: shortUrl(s.linkedinUrl), href: s.linkedinUrl });
  if (s.phone) lines.push({ text: s.phone });
  return lines;
}

/** Version texte : les liens sont écrits en entier pour rester cliquables partout. */
export function signatureText(s: Signature): string {
  return signatureLines(s)
    .map((l) => l.href ?? l.text)
    .join("\n");
}

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Formules de fin : jamais prises pour un prénom. */
const CLOSINGS = new Set(
  [
    "cordialement",
    "bien cordialement",
    "bien à vous",
    "bonne journée",
    "belle journée",
    "bonne continuation",
    "bonne soirée",
    "bonne semaine",
    "bon week-end",
    "bon weekend",
    "merci",
    "merci d'avance",
    "à bientôt",
    "salutations",
    "best",
    "regards",
    "best regards",
    "kind regards",
    "thanks",
    "thank you",
    "cheers",
  ].map(norm),
);
const NAME_LIKE = /^\p{Lu}[\p{L}'’-]*( \p{Lu}?[\p{L}'’-]+){0,2}$/u;

/**
 * Sépare le texte du prénom qui le conclut. Reconnaît le prénom actuel, et un ancien prénom (une
 * ligne courte faite de noms propres) quand l'utilisateur l'a changé après la rédaction.
 */
export function splitSignoff(
  body: string,
  s: Pick<Signature, "firstName" | "lastName">,
): { content: string; separator: "\n" | "\n\n"; found: boolean } {
  const lines = body.replace(/\r\n/g, "\n").trimEnd().split("\n");
  const last = (lines[lines.length - 1] ?? "").trim();
  const n = norm(last);
  const isCurrent = n === norm(s.firstName) || n === norm(fullName(s));
  const isOldName = !CLOSINGS.has(n.replace(/[,.!]+$/, "")) && NAME_LIKE.test(last);
  if (!last || !(isCurrent || isOldName) || lines.length < 2) {
    return { content: lines.join("\n"), separator: "\n\n", found: false };
  }
  lines.pop();
  const blankBefore = (lines[lines.length - 1] ?? "").trim() === "";
  return {
    content: lines.join("\n").trimEnd(),
    separator: blankBefore ? "\n\n" : "\n",
    found: true,
  };
}

/** Le texte du message tel qu'il part : le prénom final est remplacé par la signature complète. */
export function applySignature(body: string, s: Signature | null): string {
  if (!s) return body;
  const { content, separator } = splitSignoff(body, s);
  return `${content}${separator}${signatureText(s)}`;
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const URL_RE = /https?:\/\/[^\s<>)\]]+/g;

/** Texte brut vers HTML : échappé, adresses cliquables, retours à la ligne conservés. */
function textToHtml(text: string): string {
  let out = "";
  let at = 0;
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?]+$/, "");
    const start = m.index ?? 0;
    out += esc(text.slice(at, start));
    out += `<a href="${esc(url)}">${esc(url)}</a>`;
    at = start + url.length;
  }
  out += esc(text.slice(at));
  return out.replace(/\n/g, "<br>\n");
}

export function signatureHtml(s: Signature): string {
  const lines = signatureLines(s)
    .map((l) => {
      const t = esc(l.text);
      if (l.href) return `<a href="${esc(l.href)}">${t}</a>`;
      return l.strong ? `<strong>${t}</strong>` : t;
    })
    .join("<br>\n");
  const logo = s.logoUrl
    ? `<td style="padding:0 12px 0 0;vertical-align:middle"><img src="${esc(s.logoUrl)}" alt="${esc(s.domain)}" height="48" style="display:block;height:48px;width:auto;max-width:160px;border:0"></td>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${logo}<td style="vertical-align:middle;font-size:14px;line-height:1.45">${lines}</td></tr></table>`;
}

/**
 * Version HTML d'un message déjà signé en texte : le bloc de signature (hors citation d'un message
 * précédent) est remplacé par sa version avec logo et liens. Sert seulement quand un logo existe :
 * sans logo, le message part en texte seul.
 */
export function renderHtml(text: string, s: Signature): string {
  const block = signatureText(s);
  const lines = text.split("\n");
  const blockLines = block.split("\n");
  let start = -1;
  for (let i = 0; i + blockLines.length <= lines.length; i++) {
    if (blockLines.every((b, k) => lines[i + k] === b)) {
      start = i;
      break;
    }
  }
  const wrap = (inner: string) =>
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222222">${inner}</div>`;
  if (start < 0) return wrap(textToHtml(text));
  const before = lines.slice(0, start).join("\n").trimEnd();
  const after = lines.slice(start + blockLines.length).join("\n");
  return wrap(
    `${textToHtml(before)}<br>\n<br>\n${signatureHtml(s)}${after.trim() ? `\n${textToHtml(after)}` : ""}`,
  );
}

export const COUNTERPART_PHRASES: Record<Counterpart, string> = {
  partage: "partager votre page auprès de nos lecteurs",
  article: "écrire un article original pour votre site",
  lien_retour: "faire un lien vers votre site depuis le nôtre",
};

/** « partager…, écrire… ou faire… » ; nul si rien n'est accepté (réponse : refus poli). */
export function counterpartSentence(list: readonly Counterpart[]): string | null {
  const parts = COUNTERPARTS.filter((c) => list.includes(c)).map((c) => COUNTERPART_PHRASES[c]);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} ou ${parts[parts.length - 1]}`;
}
