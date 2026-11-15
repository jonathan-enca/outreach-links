import { t } from "@/lib/messages";

/**
 * Message de relance d'un formulaire : court, signé du prénom, avec la même URL que le message
 * initial (déjà vérifiée en 200 à la génération). Pas de LLM : gabarit sobre, aucune mention de l'IA.
 */
export function buildFollowUpMessage(input: { url: string; firstName: string }): string {
  const M = t.tasks.followUpMessage;
  return [
    M.line1,
    M.line2.replace("{url}", input.url),
    M.line3,
    `${M.line4}\n${input.firstName.trim()}`,
  ].join("\n\n");
}
