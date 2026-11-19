import { z } from "zod";

/**
 * MQ.5 : thèmes et sites proposés par Claude. Chaque site proposé doit être vérifié avant d'entrer dans
 * une liste (voir verify.ts) : ces bornes ne servent qu'à tenir le coût et la sortie du modèle petits.
 */
export const PROPOSAL_LIMITS = {
  /** Thèmes demandés au plus (informatifs : un thème n'est pas une adresse, il n'est pas vérifié). */
  maxThemes: 8,
  /** Sites proposés au plus, avant vérification. */
  maxSites: 15,
  /** Requêtes Search Console montrées au modèle au plus (les plus vues d'abord). */
  maxSearchQueries: 30,
  maxOutputTokens: 2000,
  /** Coût réservé annoncé pour l'appel (USD) : un appel, modèle fort, sortie courte. Mesuré à valider. */
  reservedUsd: 0.05,
  /** Lectures HTTP simultanées pendant la vérification. */
  readConcurrency: 4,
  /** Texte minimum d'une page pour qu'elle compte comme contenu réel. */
  minTextChars: 300,
} as const;

export const proposalsSchema = z.object({
  themes: z.array(z.string().trim().min(3).max(120)).max(PROPOSAL_LIMITS.maxThemes),
  sites: z
    .array(
      z.object({
        /** Domaine tel qu'il est écrit (sans protocole). */
        domaine: z.string().trim().min(3).max(120),
        /** Adresse exacte d'une page de contenu qui cite déjà une ressource comparable. */
        page: z.string().trim().min(8).max(300),
        /** Nom de la ressource citée, tel qu'il apparaît sur la page. */
        ressource: z.string().trim().min(2).max(120),
        raison: z.string().trim().max(200),
      }),
    )
    .max(PROPOSAL_LIMITS.maxSites),
});

export type ProposalsOutput = z.infer<typeof proposalsSchema>;
export type ProposedSite = ProposalsOutput["sites"][number];
