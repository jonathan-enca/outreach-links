import { z } from "zod";

/** Langues des sites (identique à `sites/schema`, recopié : ce module est importé côté navigateur). */
export const BRAND_LANGUAGES = ["fr", "en"] as const;

/**
 * MT.1 : profil de marque. Un contenu structuré, validé par zod à l'écriture (sortie du modèle)
 * et à la lecture (une ligne illisible est ignorée, jamais affichée de travers).
 */

export const personaSchema = z.object({
  /** Qui : la famille d'éditeurs, au pluriel. */
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

/**
 * Catégories GÉNÉRIQUES d'éditeurs (chantier H). Elles ne décrivent aucun thème : elles servent à
 * choisir des gabarits de requêtes. Les types d'éditeurs d'un site (leur nom, leurs mots) viennent
 * toujours de son profil, jamais du code.
 */
export const PUBLISHER_CATEGORIES = [
  "ecole",
  "collectivite",
  "association",
  "bibliotheque",
  "forum",
  "media",
  "boutique",
  "annuaire",
  "blog",
  "professionnel",
  "autre",
] as const;
export type PublisherCategory = (typeof PUBLISHER_CATEGORIES)[number];

export const PUBLISHER_ORIGINS = ["persona", "voisin", "utilisateur"] as const;

/** Un type d'éditeur à chercher : « qui peut vous citer », en étiquette modifiable. */
export const publisherTypeSchema = z.object({
  /** Nom affiché, au pluriel, dans la langue de la campagne. */
  label: z.string().trim().min(2).max(80),
  category: z.enum(PUBLISHER_CATEGORIES),
  /** Mots qu'on trouve dans le nom ou le titre de ces sites (servent aux requêtes). */
  terms: z.array(z.string().trim().min(2).max(40)).min(1).max(4),
  /** Déduit d'une persona du profil, type voisin proposé, ou ajouté par l'utilisateur. */
  origin: z.enum(PUBLISHER_ORIGINS),
  /** Étiquette désactivée par l'utilisateur : gardée, jamais cherchée. Absent = active. */
  active: z.boolean().optional(),
});
export type PublisherType = z.infer<typeof publisherTypeSchema>;

export const MAX_PUBLISHER_TYPES = 12;

export const brandProfileSchema = z.object({
  activity: z.string().trim().min(5).max(300),
  offer: z.string().trim().min(3).max(300),
  language: z.enum(BRAND_LANGUAGES),
  audience: z.array(z.string().trim().min(2).max(120)).min(1).max(6),
  linkable_resources: z.array(resourceSchema).max(8),
  name_variants: z.array(z.string().trim().min(2).max(60)).max(10),
  tone: z.string().trim().max(120),
  personas: z.array(personaSchema).min(2).max(8),
  /** Chantier H : types d'éditeurs à chercher (absent des profils antérieurs : déduits des personas). */
  publisher_types: z.array(publisherTypeSchema).max(MAX_PUBLISHER_TYPES).optional(),
  /** Expressions courtes qui nomment le sujet du site, de la plus précise à la plus large. */
  theme_terms: z.array(z.string().trim().min(2).max(40)).max(5).optional(),
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
