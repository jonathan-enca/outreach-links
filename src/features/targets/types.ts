import type { FindingKind } from "@/features/findings/types";
import type { SiteType } from "@/features/qualification/types";
import type { Tactic } from "@/features/queries/schema";

/** Comment l'utilisateur se présente aux éditeurs (jamais supposé : `sites.founder_role`). */
export const FOUNDER_ROLES = ["fondateur", "equipe", "agence"] as const;
export type FounderRole = (typeof FOUNDER_ROLES)[number];

export const isFounderRole = (v: unknown): v is FounderRole =>
  typeof v === "string" && (FOUNDER_ROLES as readonly string[]).includes(v);

export type TacticFilter = "toutes" | Tactic;

/** Un constat de MT.5 tel qu'affiché : la citation est celle de la page. */
export interface FindingView {
  id: string;
  kind: FindingKind;
  quote: string;
  pageUrl: string;
  linkUrl: string | null;
  httpStatus: number | null;
  anchor: string | null;
  resourceUrl: string;
  resourceTitle: string;
  proposedSentence: string | null;
  reason: string;
  requestLines: string[];
  /** Ouverture suggérée au rédacteur (point précis de la page), issue du brief de MT.5. */
  opening: string;
}

export type ContactKind = "email" | "formulaire" | "aucun";

export interface TargetContact {
  kind: ContactKind;
  /** Email vérifié valide (envoyable) ; un email « à vérifier » reste à confirmer. */
  verified: boolean;
  email: string | null;
  url: string | null;
}

/** Une carte = un site de la liste courte (ou une cible « mentions » sans contact). */
export interface TargetCard {
  id: string;
  rank: number | null;
  domain: string;
  pageUrl: string | null;
  pageTitle: string | null;
  siteType: SiteType | null;
  /** Tactiques de la collecte. */
  tactics: Tactic[];
  why: string | null;
  hook: string | null;
  contact: TargetContact;
  /** Demande en trois lignes de la qualification (sans constat). */
  requestLines: string[];
  /** Constats MT.5, les plus précis d'abord. */
  findings: FindingView[];
  /** Cible « mentions » écartée faute de contact : visible, jamais validée. */
  contactless: boolean;
  domainRank: number | null;
  platformHosted: boolean;
  /** Une demande validée existe déjà pour cette cible (un plan précédent). */
  alreadyValidated: boolean;
  /** Ressource du site la plus utile pour ce lecteur (jugement MT.4), pour une demande sans constat. */
  resource: { url: string; title: string } | null;
  /** Type d'éditeur cherché auquel la cible correspond (chantier H) ; null = autres sites. */
  publisher?: string | null;
}

/** Ce que l'analyse a examiné, en chiffres lisibles (chantier G). */
export interface FunnelView {
  candidates: number;
  /** Écartés avant lecture, par motif. */
  preRead: { reason: string; count: number }[];
  preReadTotal: number;
  pagesRead: number;
  judged: number;
  relevant: number;
  shortlist: number;
  /** Sites jamais lus, gardés en stock. */
  stock: number;
}

/** État de « Lire d'autres sites ». */
export interface MoreView {
  status: "aucun" | "demande" | "en_cours" | "termine" | "echoue";
  /** Cibles ajoutées par le dernier lot. */
  added: number | null;
}

export interface TargetsRunView {
  status: "aucun" | "confirme" | "en_cours" | "termine" | "echoue";
  costUsd: number | null;
  stop: string | null;
  error: string | null;
}
