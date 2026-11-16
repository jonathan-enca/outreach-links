import type { Tactic } from "@/features/queries/schema";

/**
 * D'où vient un candidat brut. `lien_mort` : la page du candidat cite une page d'un CONCURRENT qui
 * n'existe plus (404 / 410) ; dans la source, `query` = adresse de la page disparue et `persona` =
 * domaine du concurrent (chantier D, tactique principale de MU.7).
 */
export const COLLECTION_SOURCES = [
  "intersection",
  "serp",
  "content",
  "mention",
  "lien_mort",
] as const;
export type CollectionSource = (typeof COLLECTION_SOURCES)[number];

/** Un candidat brut tel que trouvé par une source, avant fusion par domaine (MT.4 le qualifiera). */
export interface RawCandidate {
  domain: string;
  url: string | null;
  title: string | null;
  source: CollectionSource;
  tactic: Tactic;
  /** Requête SERP ou mot-clé Content Analysis d'origine. */
  query: string | null;
  persona: string | null;
  rank: number | null;
  /** Type de page Content Analysis (blogs, organization...). */
  pageType: string | null;
  /** Nombre de concurrents distincts qui lient ce domaine (recoupement), 0 sinon. */
  competitorsCount: number;
  domainRank: number | null;
  spamScore: number | null;
  /** Langue de la page selon le fournisseur, quand il la donne (filtre avant lecture, chantier G). */
  language?: string | null;
}

/** Contexte de filtrage gratuit appliqué à chaque candidat (avant tout appel au LLM). */
export interface CollectionContext {
  ownDomain: string;
  /** Tous les concurrents de l'audit (retenus ou non) : jamais des cibles. */
  competitorDomains: string[];
  language: string;
  /** Pays de la campagne (lieu des recherches Google). */
  country?: string;
  theme: string;
  nameVariants: string[];
  targetKeywords: string[];
}

export interface CollectionSourceRef {
  source: CollectionSource;
  query: string | null;
  persona: string | null;
  rank: number | null;
  pageType: string | null;
}

/** Candidat fusionné par domaine : plusieurs sources et tactiques possibles. */
export interface MergedCandidate {
  domain: string;
  url: string | null;
  title: string | null;
  tactics: Tactic[];
  sources: CollectionSourceRef[];
  competitorsCount: number;
  domainRank: number | null;
  spamScore: number | null;
  pageType: string | null;
  /** Nombre de sources distinctes qui l'ont trouvé : signal d'ordre pour MT.4, pas un score final. */
  signalCount: number;
  /** Langue de la page selon le fournisseur (null = inconnue). */
  language?: string | null;
}
