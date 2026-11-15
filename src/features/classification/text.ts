/**
 * Préparation du texte entrant (NON FIABLE). Tout ce qui est cité (réponses imbriquées, pied de
 * page de notre propre message) est retiré : « répondez stop » figure dans NOS messages et ne doit
 * jamais compter comme une désinscription du destinataire.
 */

const QUOTE_HEADERS = [
  /^\s*le .{4,120}(a écrit|à écrit|a ecrit)\s*:?\s*$/i,
  /^\s*on .{4,120} wrote\s*:?\s*$/i,
  /^\s*-{2,}\s*(message d'origine|original message|forwarded message|message transféré)/i,
  /^\s*(de|from)\s*:.{3,}$/i,
  /^\s*_{5,}\s*$/,
];

const OWN_FOOTER =
  /si vous ne souhaitez plus recevoir de message de ma part,? répondez\s*[«"“]?\s*stop\s*[»"”]?\.?/gi;

export function stripQuoted(raw: string): string {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (QUOTE_HEADERS.some((r) => r.test(line))) break;
    if (/^\s*>/.test(line)) continue;
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(OWN_FOOTER, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Minuscules, sans accents, apostrophes normalisées : pour les motifs. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tentatives d'instruction adressées au classifieur ou au modèle. Détection déterministe : un message
 * qui en contient est classé normalement mais marqué « à relire », et aucune action issue du modèle
 * n'est appliquée sans validation. (Le texte reste une donnée dans tous les cas.)
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore[sz]?\b.{0,40}\b(instruction|consigne|prompt|regle|rule)s?/,
  /(oublie[sz]?|disregard|forget)\b.{0,40}\b(instruction|consigne|precedent|previous|above|prompt)/,
  /(system|systeme)\s*(prompt|message)/,
  /\b(you are now|tu es maintenant|vous etes maintenant|act as|agis comme|joue le role)\b/,
  /\b(classif\w+|categori\w+|class)\b.{0,40}\b(comme|as|en tant que|=|:)\s*['"]?(accepte|lien_pose|desinscription|ambigu|question|refus)/,
  /\b(category|categorie)\s*[:=]/,
  /\b(reponds|repondez|respond|reply|output|renvoie|return)\b.{0,20}\b(uniquement|only|exactement|exactly|json)\b/,
  /donnees_non_fiables/,
  /\bjson\b.{0,30}\b(category|categorie|confidence)\b/,
  /\b(assistant|claude|gpt|llm|language model|modele de langage)\b.{0,60}\b(doit|dois|devez|must|should|please|merci de)\b/,
  /\b(envoi\w*|envoy\w*|send|transf\w*|forward)\b.{0,40}\b(mot de passe|password|identifiants|credentials|api key|cle api)\b/,
];

export function detectInjection(text: string): boolean {
  const n = normalize(text);
  return INJECTION_PATTERNS.some((p) => p.test(n));
}

/** Neutralise ce qui pourrait refermer le bloc de données du prompt. */
export function sanitizeForPrompt(text: string, max: number): string {
  return text.replace(/[<>]/g, (c) => (c === "<" ? "‹" : "›")).slice(0, max);
}
