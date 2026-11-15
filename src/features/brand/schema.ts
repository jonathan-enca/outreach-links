import { z } from "zod";

/** Langues des sites (identique à `sites/schema`, recopié : ce module est importé côté navigateur). */
export const BRAND_LANGUAGES = ["fr", "en"] as const;

/**
 * MT.1 : profil de marque. Un contenu structuré, validé par zod à l'écriture (sortie du modèle)
 * et à la lecture (une ligne illisible est ignorée, jamais affichée de travers).
 */

export const personaSchema = z.object({
  /** Qui : « Enseignants et assistantes maternelles ». */
  label: z.string().trim().min(3).max(80),
  /** Où on les trouve : types de sites concrets (blogs de classe, médiathèques...). */
  sites: z.string().trim().min(3).max(200),
  /** Pourquoi ils auraient une raison de citer le site. */
  reason: z.string().trim().min(5).max(240),
});
export type Persona = z.infer<typeof personaSchema>;

export const resourceSchema = z.object({
  url: z.string().trim().max(300),
  title: z.string().trim().min(2).max(120),
  /** MT.2a : page cochée à l'écran de relecture. Absent = cochée (profils d'avant MT.2a). */
  selected: z.boolean().optional(),
});
export type LinkableResource = z.infer<typeof resourceSchema>;

export const brandProfileSchema = z.object({
  activity: z.string().trim().min(5).max(300),
  offer: z.string().trim().min(3).max(300),
  language: z.enum(BRAND_LANGUAGES),
  audience: z.array(z.string().trim().min(2).max(120)).min(1).max(6),
  linkable_resources: z.array(resourceSchema).max(8),
  name_variants: z.array(z.string().trim().min(2).max(60)).max(10),
  tone: z.string().trim().max(120),
  personas: z.array(personaSchema).min(2).max(8),
});
export type BrandProfile = z.infer<typeof brandProfileSchema>;

export const PROFILE_SOURCES = ["llm", "utilisateur"] as const;
export type ProfileSource = (typeof PROFILE_SOURCES)[number];

export interface PageRef {
  url: string;
  title: string;
}

export interface StoredBrandProfile {
  version: number;
  source: ProfileSource;
  profile: BrandProfile;
  pagesRead: PageRef[];
  costUsd: number;
  createdAt: string;
}
