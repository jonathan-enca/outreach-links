import { AUDIT_BUDGET } from "@/features/audits/beta";
import { QUERY_LIMITS } from "@/features/queries/limits";
import { PRICING } from "@/lib/dataforseo/endpoints";

/**
 * Plafonds de la collecte de candidats (MT.3, docs/audit-v2.md phase 3 et section 6).
 * La collecte reçoit 55 % du budget cible d'un audit ; ce budget est réparti entre quatre phases dont
 * chacune est un plafond SOUPLE (la phase s'arrête, la suivante continue). Les plafonds durs
 * (audit, sécurité, jour) sont contrôlés avant chaque appel payant, en plus.
 */
export const COLLECTION_LIMITS = {
  /**
   * Part du budget cible d'audit réservée à la collecte (docs/audit-v2.md section 6). MC.6a (18/11/2026) :
   * 0,55 -> 0,74 pour loger la phase « citations » (0,19 USD : 6 appels et le choix des ressources par le modèle) SANS réduire les autres : leurs budgets en
   * USD sont inchangés (ex. recherches Google 0,242 USD).
   */
  shareOfTarget: 0.74,
  /**
   * Part de ce budget par phase (somme = 1) : le pire cas annoncé est donc le budget cible.
   * Chantier H (17/11/2026) : les recherches Google passent de 27,5 % à 44 % (40 requêtes garanties
   * par type d'éditeur) ; le recoupement (1 cible pour 169 candidats au run de référence) et les
   * mentions (0 cible) gardent juste de quoi faire leurs appels.
   */
  phaseShare: {
    intersection: 0.0595,
    mentions: 0.0632,
    morts: 0.1152,
    serp: 0.327,
    content: 0.1784,
    citations: 0.2567,
  },
  intersection: {
    /** 8 au plus : le filtre serveur « autorité > 0 » compte une condition par cible (8 conditions maximum). */
    maxTargets: 8,
    /** Un domaine dont le score de spam des liens atteint ce seuil est écarté (0-100, mesuré au run réel). */
    spamMax: 30,
    /** Un domaine n'est candidat que s'il lie au moins 2 concurrents (« recoupement »). */
    minCompetitors: 2,
    rowsPerPage: 500,
    maxPages: 2,
    /** Une 2e page n'est demandée que si la 1re était pleine et a donné au moins ce nombre de recoupements. */
    secondPageMinHits: 10,
    /** Part des lignes demandées réellement renvoyées, pour le coût ATTENDU (le pire cas = 100 %). */
    typicalFill: 0.75,
  },
  serp: {
    depth: QUERY_LIMITS.serpDepth,
    maxQueries: QUERY_LIMITS.maxQueries,
  },
  /** Arrêt par rendement décroissant (mécanisme 2) : requêtes classées par rendement attendu. */
  yieldStop: {
    /** On ne s'arrête jamais avant d'avoir exécuté ce nombre de requêtes. */
    minQueries: 8,
    /** Fenêtre glissante de requêtes récentes. */
    window: 4,
    /** Seuil : moyenne de nouveaux domaines par requête sur la fenêtre. */
    minNewPerQuery: 3,
  },
  /**
   * Liens morts des concurrents (chantier D) : pages disparues (404 / 410) qui reçoivent encore des
   * liens. UN appel Backlinks par concurrent (un lien par domaine source), les plus gros concurrents
   * d'abord ; chaque domaine qui cite une page disparue est une cible.
   */
  deadPages: {
    maxCompetitors: 5,
    rowsPerCall: 100,
    /** Un lien dont le score de spam atteint ce seuil est écarté (0-100). */
    spamMax: 30,
    typicalFill: 0.75,
  },
  content: {
    rowsPerCall: 150,
    /** Types de pages (l'ordre = priorité), correspondant aux sites que personne ne sollicite. */
    pageTypes: ["blogs", "organization", "message-boards", "ecommerce"] as const,
    /** Mots-clés de l'utilisateur ajoutés au thème (objectif « mots-clés »), sur ces types seulement. */
    keywordPageTypes: ["blogs", "organization"] as const,
    maxKeywords: 2,
    typicalFill: 0.75,
    /** Pages dont le score de spam atteint ce seuil sont écartées (filtre serveur ET client). */
    spamMax: 50,
  },
  /**
   * Pages qui citent déjà une ressource comparable (MC.6a, essai MC.0b du 18/11/2026) : UN appel Backlinks
   * par ressource, une ligne par domaine source, pages dans la langue de la campagne. Mesuré : 0,024 à
   * 0,03 USD par ressource pour 150 pages ; 300 à 900 domaines candidats pour 6 ressources.
   */
  citations: {
    /** Ressources interrogées au plus (6 x 0,0294 = 0,176 USD : sous le budget de phase de 0,18 USD ; 6 comme à l'essai MC.0b). */
    maxResources: 6,
    /**
     * Sites de l'audit proposés au choix du modèle (le reste vient des recherches). 40 depuis MC.6b : les
     * concurrents NON retenus par l'audit en font partie. Mesuré le 18/11/2026 : les vrais sites
     * comparables d'un site de test étaient presque tous parmi eux, et aucun parmi les 10 retenus.
     */
    poolSize: 40,
    rowsPerCall: 150,
    /** Un lien dont le score de spam atteint ce seuil est écarté (filtre serveur ET client). */
    spamMax: 40,
    /** Autorité minimale du domaine qui cite (filtre serveur, valeur de l'essai MC.0b). */
    minDomainRank: 20,
    /** Part des lignes demandées réellement renvoyées, pour le coût ATTENDU. */
    typicalFill: 0.9,
    /** Une ressource trouvée par les recherches (hors concurrents de l'audit) doit sortir sur au moins N recherches. */
    minTopicQueries: 2,
  },
  mentions: {
    maxVariants: 3,
    rowsPerCall: 100,
    maxSerpQueries: 3,
  },
} as const;

export type CollectionPhase = keyof typeof COLLECTION_LIMITS.phaseShare;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Budget cible de la collecte (USD) : 55 % du budget cible d'audit. */
export function collectionTargetUsd(auditTargetUsd: number = AUDIT_BUDGET.targetUsd): number {
  return r6(auditTargetUsd * COLLECTION_LIMITS.shareOfTarget);
}

/** Budget souple d'une phase (USD). */
export function phaseBudgetUsd(
  phase: CollectionPhase,
  auditTargetUsd: number = AUDIT_BUDGET.targetUsd,
): number {
  return r6(collectionTargetUsd(auditTargetUsd) * COLLECTION_LIMITS.phaseShare[phase]);
}

/** Coût d'un appel Content Analysis de `rows` lignes (USD). */
export function contentCallUsd(rows: number): number {
  return r6(PRICING.contentAnalysisPerRequest + rows * PRICING.contentAnalysisPerRow);
}

/** Coût d'un appel Backlinks (liens morts d'un concurrent) de `rows` lignes (USD). */
export function deadPagesCallUsd(rows: number): number {
  return r6(PRICING.backlinksPerRequest + rows * PRICING.backlinksPerRow);
}

/** Coût d'un appel Backlinks « qui cite cette ressource » de `rows` lignes (USD). */
export function citationsCallUsd(rows: number): number {
  return r6(PRICING.backlinksPerRequest + rows * PRICING.backlinksPerRow);
}

/** Coût d'une page de Domain Intersection de `rows` lignes (USD). */
export function intersectionPageUsd(rows: number): number {
  return r6(PRICING.backlinksPerRequest + rows * PRICING.backlinksPerRow);
}
