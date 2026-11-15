import { AI_PATTERNS, norm, stripTrailingPunct } from "@/features/drafting/lint";
import type { LintIssue } from "@/features/drafting/types";

const URL_RE = /https?:\/\/[^\s)>\]]+/gi;

export const REPLY_LIMITS = { minChars: 20, maxChars: 1500 } as const;

/** Promesses de résultat : jamais dans une réponse (l'argent est permis ici : politique « payant »). */
const PROMISES = [/garanti/, /\b100 ?%/, /resultats? assures?/, /trafic garanti/];

export interface ReplyCheckInput {
  body: string;
  /** URL que le message a le droit de citer (celle déjà vérifiée en 200 au premier envoi). */
  allowedUrls: readonly string[];
  signatureFirstName: string;
}

/** Contrôle d'une réponse avant validation : pas d'IA, pas de promesse, pas d'URL inconnue, signée. */
export function checkReply(i: ReplyCheckInput): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  const n = norm(i.body);
  if (i.body.trim().length < REPLY_LIMITS.minChars) add("trop_court", "Réponse trop courte.");
  if (i.body.length > REPLY_LIMITS.maxChars) add("trop_long", "Réponse trop longue.");
  if (AI_PATTERNS.some((re) => re.test(n)))
    add("mention_ia", "Mention de l'IA ou d'une automatisation.");
  if (PROMISES.some((re) => re.test(n))) add("promesse", "Promesse de résultat.");
  if (/\[[^\]]*\]|\{\{|\}\}|<[a-z/]/i.test(i.body))
    add("variable_non_remplacee", "Reste de gabarit.");
  const urls = (i.body.match(URL_RE) ?? []).map(stripTrailingPunct);
  if (urls.some((u) => !i.allowedUrls.includes(u)))
    add("url_inattendue", "Une URL non vérifiée figure dans le message.");
  const lastLine = i.body.trim().split("\n").pop() ?? "";
  if (!norm(lastLine).includes(norm(i.signatureFirstName)))
    add("signature_absente", "Le message n'est pas signé du prénom.");
  return issues;
}
