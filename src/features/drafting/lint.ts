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

const URL_RE = /https?:\/\/[^\s)>\]]+/gi;

export const stripTrailingPunct = (u: string) => u.replace(/[.,;:!?]+$/, "");

export interface LintInput {
  channel: DraftChannel;
  subject: string | null;
  body: string;
  proposedUrl: string;
  hook: string;
  signatureFirstName: string;
}

/** Linter : retourne la liste des problèmes (vide = le message passe). */
export function lintMessage(m: LintInput): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  const text = `${m.subject ?? ""}\n${m.body}`;
  const n = norm(text);

  const wc = words(m.body).length;
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
  if (/\[[^\]]*\]|\{\{|\}\}|<[a-z/]/i.test(text))
    add("variable_non_remplacee", "Reste de gabarit.");
  if (/[A-ZÉÈÀ]{6,}/.test(m.body) || /!{2,}/.test(m.body))
    add("ton", "Majuscules ou points d'exclamation excessifs.");

  // URL : celle proposée, exactement, et aucune autre.
  const urls = (m.body.match(URL_RE) ?? []).map(stripTrailingPunct);
  if (!urls.includes(m.proposedUrl))
    add("url_absente", "L'URL exacte à proposer n'est pas dans le message.");
  if (urls.some((u) => u !== m.proposedUrl))
    add("url_inattendue", "Une autre URL que celle vérifiée figure dans le message.");

  // Hook : le message doit s'appuyer sur ce que dit la page de la cible.
  const hookWords = words(m.hook).filter((w) => w.length > 3);
  if (hookWords.length > 0) {
    const bodyWords = new Set(words(m.body));
    const hit = hookWords.filter((w) => bodyWords.has(w)).length;
    if (hit / hookWords.length < 0.5)
      add("hook_absent", "Le message ne s'appuie pas sur la page de la cible.");
  }

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
