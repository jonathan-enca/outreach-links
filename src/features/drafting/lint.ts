import { DRAFT_LIMITS } from "./limits";
import type { DraftChannel, LintIssue } from "./types";

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[«»"“”'’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (s: string) =>
  norm(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Mention de l'IA ou de l'automatisation : interdite dans les messages d'outreach (CLAUDE.md). */
export const AI_PATTERNS: RegExp[] = [
  /\bia\b/,
  /\bai\b/,
  /intelligence artificielle/,
  /\bchat ?gpt\b/,
  /\bgpt\b/,
  /\bclaude\b/,
  /\bllm\b/,
  /modele de langage/,
  /genere (par|automatiquement)/,
  /\bautomatis/,
  /\brobot\b/,
  /\bbot\b/,
];

/** Formules creuses de prospection de masse. */
const BANNED_PHRASES = [
  "j espere que vous allez bien",
  "j'espere que vous allez bien",
  "je me permets de vous contacter",
  "je me permets de vous ecrire",
  "cher webmaster",
  "chere webmaster",
  "bonjour webmaster",
  "gagnant-gagnant",
  "gagnant gagnant",
  "n hesitez pas",
  "n'hesitez pas",
  "mention each other",
  "dans l'attente de votre retour",
  "dans l attente de votre retour",
  "partenariat",
];

/** Promesses, argent, urgence : jamais dans un premier message. */
const PROMISE_PATTERNS: RegExp[] = [
  /garanti/,
  /\b100 ?%/,
  /gratuit(ement)? pour vous/,
  /\bpayer\b|\bpaye\b|remuner|\beuros?\b|€|\bprix\b|\btarif/,
  /\burgent\b|derniere chance|offre limitee/,
  /\bseo\b.*\b(boost|booster|ameliorer votre)/,
];

const URL_RE = /https?:\/\/[^\s)>\]»"]+/gi;

export const stripTrailingPunct = (u: string) => u.replace(/[.,;:!?]+$/, "");

export interface LintInput {
  channel: DraftChannel;
  subject: string | null;
  body: string;
  proposedUrl: string;
  /**
   * Adresse de la page de la cible : exigée dans un message généré (la personne doit savoir de quelle
   * page on parle). Absente quand l'utilisateur modifie un message : il reste libre de la retirer.
   */
  targetPageUrl?: string | null;
  /** Autres adresses admises (lien cassé signalé). */
  allowedUrls?: readonly string[];
  /** Message modifié par l'utilisateur : il est libre d'y citer d'autres adresses. */
  allowAnyUrl?: boolean;
  signatureFirstName: string;
}

/** Deux écritures de la même adresse (barre finale, www, casse de l'hôte, encodage). */
export function sameUrl(a: string, b: string): boolean {
  const key = (raw: string) => {
    try {
      const u = new URL(raw);
      let path = u.pathname;
      try {
        path = decodeURI(path);
      } catch {
        /* encodage invalide : chemin gardé tel quel */
      }
      return `${u.hostname.replace(/^www\./, "").toLowerCase()}${path.replace(/\/+$/, "")}${u.search}`;
    } catch {
      return raw.replace(/\/+$/, "");
    }
  };
  return key(a) === key(b);
}

/** Linter : retourne la liste des problèmes (vide = le message passe). */
export function lintMessage(m: LintInput): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  const text = `${m.subject ?? ""}\n${m.body}`;
  // Les adresses sont jugées à part : « /ia-et-donnees » ou « /TARIFS » dans une URL n'est pas une faute.
  const prose = text.replace(URL_RE, " ");
  const n = norm(prose);

  const wc = words(m.body.replace(URL_RE, " ")).length;
  if (wc < DRAFT_LIMITS.minWords) add("trop_court", `Message trop court (${wc} mots).`);
  if (wc > DRAFT_LIMITS.maxWords) add("trop_long", `Message trop long (${wc} mots).`);
  if (m.channel === "email") {
    if (!m.subject || m.subject.trim().length < 3) add("sujet_absent", "Sujet manquant.");
    else if (m.subject.length > DRAFT_LIMITS.maxSubjectChars) add("sujet_long", "Sujet trop long.");
  }
  if (AI_PATTERNS.some((re) => re.test(n)))
    add("mention_ia", "Mention de l'IA ou d'une automatisation.");
  const banned = BANNED_PHRASES.find((p) => n.includes(norm(p)));
  if (banned) add("formule_interdite", `Formule creuse interdite : « ${banned} ».`);
  if (PROMISE_PATTERNS.some((re) => re.test(n))) add("promesse", "Promesse, argent ou urgence.");
  if (/\[[^\]]*\]|\{\{|\}\}|<[a-z/]/i.test(prose))
    add("variable_non_remplacee", "Reste de gabarit.");
  if (/!{2,}/.test(m.body)) add("ton", "Points d'exclamation excessifs.");

  // Adresses : la page proposée, la page de la cible, et rien d'inattendu.
  const urls = (m.body.match(URL_RE) ?? []).map(stripTrailingPunct);
  if (!urls.some((u) => sameUrl(u, m.proposedUrl)))
    add("url_absente", "L'adresse exacte de la page proposée n'est pas dans le message.");
  if (m.targetPageUrl && !urls.some((u) => sameUrl(u, m.targetPageUrl!)))
    add("url_cible_absente", "L'adresse de la page de la cible n'est pas dans le message.");
  const allowed = [
    m.proposedUrl,
    ...(m.targetPageUrl ? [m.targetPageUrl] : []),
    ...(m.allowedUrls ?? []),
  ];
  if (!m.allowAnyUrl && urls.some((u) => !allowed.some((a) => sameUrl(u, a))))
    add("url_inattendue", "Une adresse inattendue figure dans le message.");

  // Signature : le prénom conclut le message.
  const tail = norm(m.body).slice(-60);
  if (!tail.includes(norm(m.signatureFirstName)))
    add("signature_absente", "Le message n'est pas signé du prénom.");
  return issues;
}

/** Similarité de formulation entre deux messages (Jaccard sur des 4-grammes de mots). */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const w = words(s);
    const out = new Set<string>();
    for (let i = 0; i + 4 <= w.length; i++) out.add(w.slice(i, i + 4).join(" "));
    return out;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Plus forte similarité du message avec les messages déjà écrits du lot. */
export function maxSimilarity(body: string, others: readonly string[]): number {
  return others.reduce((m, o) => Math.max(m, similarity(body, o)), 0);
}
