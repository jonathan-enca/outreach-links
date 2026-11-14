import { hostOf, isExcludedDomain, isOwnDomain } from "@/features/audits/excluded-domains";
import type { PlanKey } from "@/features/audits/plans";
import type { SerpEntry } from "@/features/audits/discover";
import { t } from "@/lib/messages";

/**
 * Génération des opportunités de liens (PLAN 2.1). Fonctions pures : aucune E/S.
 * Les types « jamais sollicité », « page ressources », « annuaire » et « mention de marque »
 * viennent de requêtes SERP thématiques ; « écart de domaines » vient de M1.5 (gratuit).
 * `lien_mort` est réservé au sous-jalon 2.2.
 */
export const OPPORTUNITY_TYPES = [
  "ecart_domaines",
  "mention_marque",
  "page_ressources",
  "jamais_sollicite",
  "annuaire",
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export type ExpectedLinkType = "editorial" | "ressource" | "mention_a_lier" | "annuaire";
export type PriorityLabel = "haute" | "moyenne" | "basse";

/** Type de lien attendu par type d'opportunité. */
export const EXPECTED_LINK: Record<OpportunityType, ExpectedLinkType> = {
  ecart_domaines: "editorial",
  mention_marque: "mention_a_lier",
  page_ressources: "ressource",
  jamais_sollicite: "editorial",
  annuaire: "annuaire",
};

/** Priorité de base par type (0 à 100) : le plus facile à obtenir d'abord. */
const BASE_SCORE: Record<OpportunityType, number> = {
  mention_marque: 80,
  ecart_domaines: 65,
  page_ressources: 60,
  jamais_sollicite: 55,
  annuaire: 40,
};

export interface SiteContext {
  domain: string;
  niche: string | null;
  priorityQueries: string[];
  offeredAsset: string | null;
}

export interface OpportunityQuery {
  type: Exclude<OpportunityType, "ecart_domaines">;
  query: string;
}

/** Combien de requêtes SERP par type, selon le plan (coût borné : 0,002 USD par requête top 10). */
export const QUERIES_PER_TYPE: Record<PlanKey, Record<OpportunityQuery["type"], number>> = {
  gratuit: { mention_marque: 1, page_ressources: 1, annuaire: 1, jamais_sollicite: 2 },
  payant: { mention_marque: 1, page_ressources: 2, annuaire: 1, jamais_sollicite: 4 },
};

/** Profondeur SERP des requêtes d'opportunités. */
export const OPPORTUNITY_SERP_DEPTH = 10;

/** Nom de marque : première étiquette du domaine (mega-coloring.com -> "mega coloring"). */
export function brandOf(domain: string): string {
  const host = hostOf(domain);
  const label = host.split(".")[0] ?? host;
  return label.replace(/[-_]+/g, " ").trim();
}

/** Thème de la recherche : niche, sinon première requête prioritaire, sinon la marque. */
export function topicOf(site: SiteContext): string {
  return site.niche?.trim() || site.priorityQueries[0]?.trim() || brandOf(site.domain);
}

/** Requêtes SERP à lancer, dans un ordre stable (les premières sont les plus utiles). */
export function buildQueries(site: SiteContext, plan: PlanKey): OpportunityQuery[] {
  const topic = topicOf(site);
  const own = hostOf(site.domain);
  const pool: Record<OpportunityQuery["type"], string[]> = {
    mention_marque: [`"${brandOf(site.domain)}" -site:${own}`],
    page_ressources: [`${topic} ressources liens utiles`, `${topic} sites recommandés`],
    annuaire: [`annuaire ${topic}`],
    jamais_sollicite: [
      `${topic} association`,
      `${topic} blog passionné`,
      `${topic} mairie`,
      `${topic} forum`,
    ],
  };
  const out: OpportunityQuery[] = [];
  for (const type of Object.keys(pool) as OpportunityQuery["type"][]) {
    for (const query of pool[type].slice(0, QUERIES_PER_TYPE[plan][type])) {
      out.push({ type, query });
    }
  }
  return out;
}

export interface Candidate {
  type: OpportunityType;
  domain: string;
  url: string | null;
  title: string | null;
  rationale: string;
  originQuery: string | null;
  /** Rang SERP (1 = meilleur) ou nombre de concurrents cités pour l'écart. */
  rank: number | null;
  competitorsCount?: number;
}

export interface PriorityPage {
  url: string;
  keywords: string[];
}

export interface FinalOpportunity extends Candidate {
  targetPageUrl: string;
  priorityScore: number;
  priority: PriorityLabel;
  expectedLinkType: ExpectedLinkType;
  offer: string | null;
}

export function priorityLabel(score: number): PriorityLabel {
  return score >= 75 ? "haute" : score >= 50 ? "moyenne" : "basse";
}

/** Score 0 à 100 : base du type, bonus de rang SERP (top 3 +10, top 5 +5), bonus de citations. */
export function scoreOf(c: Candidate): number {
  let s = BASE_SCORE[c.type];
  if (c.type === "ecart_domaines") {
    s += Math.min(25, Math.max(0, (c.competitorsCount ?? 1) - 1) * 12);
  } else if (c.rank !== null) {
    s += c.rank <= 3 ? 10 : c.rank <= 5 ? 5 : 0;
  }
  return Math.max(0, Math.min(100, s));
}

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);

/**
 * Page du site à promouvoir : les mentions de marque pointent vers l'accueil ; sinon la page
 * prioritaire dont les mots-clés recoupent le mieux la cible ; sinon rotation sur les pages
 * prioritaires (pour ne pas tout concentrer sur une page) ; sinon l'accueil.
 */
export function pickTargetPage(
  c: Candidate,
  pages: PriorityPage[],
  homepage: string,
  index: number,
): string {
  if (c.type === "mention_marque" || pages.length === 0) return homepage;
  const text = new Set(tokens(`${c.title ?? ""} ${c.url ?? ""} ${c.domain}`));
  let best: { url: string; overlap: number } | null = null;
  for (const p of pages) {
    const words = new Set(p.keywords.flatMap(tokens));
    const overlap = [...words].filter((w) => text.has(w)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { url: p.url, overlap };
  }
  return best?.url ?? pages[index % pages.length]!.url;
}

export interface FinalizeOptions {
  site: SiteContext;
  /** Domaines des concurrents retenus : jamais une cible. */
  competitorDomains: readonly string[];
  pages: PriorityPage[];
  homepage: string;
}

/**
 * Filtre (domaine du site, concurrents, plateformes exclues), dédoublonne par domaine en
 * gardant le meilleur score, associe une page cible, trie par priorité décroissante.
 */
export function finalizeOpportunities(
  candidates: Candidate[],
  opts: FinalizeOptions,
): FinalOpportunity[] {
  const competitors = new Set(opts.competitorDomains.map(hostOf));
  const best = new Map<string, { c: Candidate; score: number }>();
  for (const c of candidates) {
    const domain = hostOf(c.domain);
    if (!domain || isOwnDomain(domain, opts.site.domain)) continue;
    if (competitors.has(domain) || isExcludedDomain(domain)) continue;
    const score = scoreOf(c);
    const cur = best.get(domain);
    if (!cur || score > cur.score) best.set(domain, { c: { ...c, domain }, score });
  }
  const sorted = [...best.values()].sort(
    (a, b) => b.score - a.score || a.c.domain.localeCompare(b.c.domain),
  );
  return sorted.map(({ c, score }, i) => ({
    ...c,
    targetPageUrl: pickTargetPage(c, opts.pages, opts.homepage, i),
    priorityScore: score,
    priority: priorityLabel(score),
    expectedLinkType: EXPECTED_LINK[c.type],
    offer: opts.site.offeredAsset?.trim() || null,
  }));
}

/** Candidats issus d'une SERP : une ligne organique = un candidat du type de la requête. */
export function candidatesFromSerp(q: OpportunityQuery, entries: SerpEntry[]): Candidate[] {
  return entries.map((e) => ({
    type: q.type,
    domain: e.domain,
    url: e.url,
    title: e.title,
    rationale: t.opportunities.rationale[q.type].replace("{query}", q.query),
    originQuery: q.query,
    rank: e.rank,
  }));
}
