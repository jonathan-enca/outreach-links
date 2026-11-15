import { normalize } from "./text";
import type { Category, ClassifierInput } from "./types";

/**
 * Règles déterministes, appliquées AVANT le modèle. Elles servent de plancher de sécurité pour les
 * catégories à risque (désinscription, plainte) : rappel élevé, aucun coût, aucune dépendance au
 * modèle. Elles s'appliquent au texte propre (citations et pied de page de nos messages retirés).
 */

export interface RuleHit {
  category: Category;
  confidence: number;
  justification: string;
}

const UNSUBSCRIBE: RegExp[] = [
  /\b(desinscri\w*|desabonn\w*|unsubscrib\w*)\b/,
  /\bne\s+(?:me\s+|m')?(?:contactez|contactes|ecrivez|ecris|envoyez|sollicitez|relancez|recontactez)\w*\s+(?:plus|jamais)\b/,
  /\bne\s+plus\s+(?:me\s+|m')?(?:contacter|ecrire|solliciter|envoyer|relancer|recevoir)\b/,
  /\bne\s+(?:souhaite|veux|desire|voudrais)\s+plus\s+(?:recevoir|etre\s+contacte|etre\s+sollicite|de\s+(?:vos\s+)?(?:mails?|emails?|messages?|courriels?))/,
  /\b(?:remove\s+me|take\s+me\s+off|opt[- ]?out|leave\s+me\s+alone|no\s+more\s+(?:e-?mails?|messages?))\b/,
  /\bstop\s+(?:e-?mailing|contacting|writing|sending|ces\s+(?:mails?|emails?|messages?)|de\s+m'(?:ecrire|envoyer|contacter))/,
  /\b(?:do\s*n'?o?t|don'?t|never)\s+(?:contact|e-?mail|write\s+to)\s+me\b/,
  /\b(?:retirez|retirer|supprimez|supprimer|enlevez|effacez)\b.{0,40}\b(?:adresse|mail|email|courriel|contact|liste|donnees|coordonnees)/,
  /\b(?:rgpd|gdpr)\b.{0,80}\b(?:supprim\w*|efface\w*|erasure|delet\w*|opposition|opposer|retir\w*)/,
  /\bdroit\s+(?:d'opposition|a\s+l'effacement)\b/,
];

const COMPLAINT: RegExp[] = [
  /\bspam(?:s|meur|meurs|ming)?\b/,
  /\b(?:cnil|plainte|plaintes|harcel\w*|arnaque\w*|escroqu\w*|scam\w*|phishing|harass\w*|abus(?:if|ive)?|abuse)\b/,
  /\bmise\s+en\s+demeure\b/,
  /\b(?:avocat|lawyer|legal\s+action|poursuite|poursuivre|porter\s+plainte|denonc\w*)\b/,
  /\b(?:je\s+(?:vais|vous)\s+signal\w*|signaler\s+(?:ce|cet|votre|vos|ces)|(?:report|reported|reporting)\s+(?:you|this|your))\b/,
  /\b(?:fuck\w*|shit|merde|connard\w*|salop\w*|degage\w*|foutez[- ]moi|ferme\s+ta)\b/,
];

/** « ce n'est pas du spam » n'est pas une plainte. */
const NEGATED_SPAM = /\b(?:pas|not|n't|jamais)\s+(?:du\s+|de\s+|a\s+|un\s+|d')?spam/;

function matchAny(patterns: RegExp[], text: string): RegExp | undefined {
  return patterns.find((p) => p.test(text));
}

export function ruleClassify(input: ClassifierInput, cleanBody: string): RuleHit | null {
  // Le type posé par la lecture IMAP (en-têtes, DSN) décide seul pour ces deux catégories.
  if (input.inboundKind === "rebond") {
    return { category: "rebond", confidence: 1, justification: "Rapport d'échec de livraison (DSN)." };
  }
  if (input.inboundKind === "reponse_automatique") {
    return {
      category: "reponse_automatique",
      confidence: 0.98,
      justification: "Réponse automatique détectée par les en-têtes ou l'objet.",
    };
  }

  const text = normalize(`${input.subject ?? ""}\n${cleanBody}`);
  const words = normalize(cleanBody).split(/[^a-z0-9']+/).filter(Boolean);

  const complaintText = NEGATED_SPAM.test(text) ? text.replace(NEGATED_SPAM, " ") : text;
  if (matchAny(COMPLAINT, complaintText)) {
    return {
      category: "plainte_hostile",
      confidence: 0.95,
      justification: "Mot de plainte, de menace ou d'hostilité détecté dans la réponse.",
    };
  }
  if (matchAny(UNSUBSCRIBE, text)) {
    return {
      category: "desinscription",
      confidence: 0.93,
      justification: "Demande explicite de ne plus être contacté.",
    };
  }
  // « STOP » seul (réponse au pied de page de nos messages).
  if (words.length > 0 && words.length <= 3 && words.includes("stop")) {
    return {
      category: "desinscription",
      confidence: 0.95,
      justification: "Réponse « stop » au pied de page de désinscription.",
    };
  }
  return null;
}
