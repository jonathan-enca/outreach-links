import {
  DEFAULT_EXCLUDED_DOMAINS,
  GIANT_DOMAINS,
  hostOf,
  isExcludedDomain,
  isOwnDomain,
  isValidHost,
} from "@/features/audits/excluded-domains";
import {
  blogPlatformOf,
  dedupKey,
  isPlatformRoot,
  isPlatformUserSite,
  registrableDomain,
} from "@/features/collection/hosts";
import { normalizeKey } from "@/features/queries/plan";
import { QUALIFY_LIMITS } from "./limits";
import { preReadLanguage } from "./prefilter";
import type { ExclusionReason, QualCandidate, QualContext } from "./types";

export interface FreeVerdict {
  candidate: QualCandidate;
  stage: 1 | 2;
  reason: ExclusionReason | null;
  detail: string | null;
  /** Vrai si le motif vient du filtre avant lecture (langue visible sans télécharger la page). */
  preRead?: boolean;
  platformHosted: boolean;
  /** Score provisoire (gratuit) : ordre de lecture des pages et de passage au LLM. */
  provisionalScore: number;
}

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** Faux domaine : pas un nom d'hôte, adresse IP, ou étiquette aberrante (générée). */
export function isFakeDomain(host: string): boolean {
  if (!isValidHost(host) || IPV4.test(host)) return true;
  const labels = host.split(".");
  return labels.some((l) => l.length > 45) || (host.match(/-/g)?.length ?? 0) >= 6;
}

const inList = (host: string, list: readonly string[]) =>
  list.some((d) => {
    const x = hostOf(d);
    return host === x || host.endsWith(`.${x}`) || registrableDomain(host) === x;
  });

/**
 * Étage 1 (gratuit) pour UN candidat : propre site, concurrent, racine de plateforme, plateforme ou
 * géant (listes de M1.3 et MA.1), faux domaine, liste « ne pas contacter », déjà contacté ailleurs.
 * Un blog hébergé (monblog.over-blog.com) n'est PAS une plateforme : il passe.
 */
export function stageOneReason(
  c: QualCandidate,
  ctx: QualContext,
): { reason: ExclusionReason; detail: string } | null {
  const host = hostOf(c.domain);
  if (isFakeDomain(host)) return { reason: "faux_domaine", detail: host };
  if (isOwnDomain(host, ctx.ownDomain)) return { reason: "propre_site", detail: host };
  if (inList(host, ctx.competitorDomains)) return { reason: "concurrent", detail: host };
  if (isPlatformRoot(host)) {
    return { reason: "plateforme", detail: `${host} héberge des blogs, ce n'est pas un éditeur` };
  }
  if (!isPlatformUserSite(host)) {
    if (isExcludedDomain(host, [], GIANT_DOMAINS)) return { reason: "geant", detail: host };
    if (isExcludedDomain(host, [], DEFAULT_EXCLUDED_DOMAINS)) {
      return { reason: "plateforme", detail: host };
    }
  }
  if (inList(host, ctx.suppressedDomains)) return { reason: "ne_pas_contacter", detail: host };
  if (ctx.contactedElsewhere.some((d) => hostOf(d) === host)) {
    return { reason: "deja_contacte", detail: "déjà sollicité récemment par un autre utilisateur" };
  }
  return null;
}

/** Étage 2 (signaux déjà fournis par DataForSEO) : spam, langue de la page, autorité irréaliste. */
export function stageTwoReason(
  c: QualCandidate,
  ctx: QualContext,
  pageLanguage: string | null = null,
): { reason: ExclusionReason; detail: string } | null {
  if (c.spamScore !== null && c.spamScore >= QUALIFY_LIMITS.spamMax) {
    return { reason: "spam", detail: `score de spam ${c.spamScore}` };
  }
  if (pageLanguage && pageLanguage.slice(0, 2).toLowerCase() !== ctx.language.slice(0, 2)) {
    return { reason: "langue", detail: `page en « ${pageLanguage} »` };
  }
  if (c.domainRank !== null && c.domainRank >= QUALIFY_LIMITS.unrealisticRank) {
    return { reason: "irrealiste", detail: `autorité ${c.domainRank} : très gros site` };
  }
  return null;
}

/** Types de pages Content Analysis les plus proches des sites « que personne ne sollicite ». */
const PAGE_TYPE_WEIGHT: Record<string, number> = {
  organization: 1.15,
  "message-boards": 1.1,
  blogs: 1.05,
  ecommerce: 0.95,
  news: 0.8,
};

/**
 * Score provisoire GRATUIT (0-100), pour dépenser d'abord sur les meilleurs : recoupement des
 * concurrents (la source la plus fiable), nombre de sources, type de page, autorité plafonnée. Un
 * domaine sans autorité n'est PAS écarté (petit site neuf possible), il est seulement moins prioritaire.
 */
export function provisionalScore(c: QualCandidate): number {
  const overlap = 1 + 0.25 * Math.min(c.competitorsCount, 4);
  const sources = 1 + 0.1 * Math.min(c.signalCount - 1, 4);
  const type = c.pageType ? (PAGE_TYPE_WEIGHT[c.pageType] ?? 1) : 1;
  const r = c.domainRank;
  const auth = r === null ? 0.8 : 0.6 + 0.4 * (Math.min(r, QUALIFY_LIMITS.authorityCap) / 300);
  const mentions = c.tactics.includes("mentions") ? 1.1 : 1;
  // Une page qui cite une page disparue d'un concurrent : la preuve est sur la page, on la lit d'abord.
  const deadLink = c.sources.some((x) => x.source === "lien_mort") ? 1.4 : 1;
  return Math.round(40 * overlap * sources * type * auth * mentions * deadLink * 10) / 10;
}

/**
 * Étages 1 et 2 sur toute la collecte. Doublons : une clé par éditeur (`dedupKey`), le meilleur
 * candidat garde la place, les autres sont « doublon » avec le domaine gardé en détail.
 */
export function runFreeStages(cands: readonly QualCandidate[], ctx: QualContext): FreeVerdict[] {
  const out: FreeVerdict[] = [];
  const kept = new Map<string, FreeVerdict>();
  const sorted = [...cands].sort(
    (a, b) => provisionalScore(b) - provisionalScore(a) || a.domain.localeCompare(b.domain),
  );
  for (const c of sorted) {
    const host = hostOf(c.domain);
    const base = {
      candidate: { ...c, domain: host },
      platformHosted: isPlatformUserSite(host),
      provisionalScore: provisionalScore(c),
    };
    const one = stageOneReason(c, ctx);
    if (one) {
      out.push({ ...base, stage: 1, reason: one.reason, detail: one.detail });
      continue;
    }
    const key = isValidHost(host) ? dedupKey(host) : host;
    const first = kept.get(key);
    if (first) {
      out.push({
        ...base,
        stage: 1,
        reason: "doublon",
        detail: `même éditeur que ${first.candidate.domain}`,
      });
      continue;
    }
    const lang = preReadLanguage(c, ctx);
    const two =
      stageTwoReason(c, ctx) ?? (lang ? { reason: "langue" as const, detail: lang } : null);
    const v: FreeVerdict = {
      ...base,
      stage: 2,
      reason: two?.reason ?? null,
      detail: two?.detail ?? null,
      ...(two ? { preRead: true } : {}),
    };
    if (!two) kept.set(key, v);
    out.push(v);
  }
  return out;
}

export interface AuthorityImpact {
  total: number;
  /** Autorité inconnue (SERP, mentions : DataForSEO ne la donne pas). */
  unknown: number;
  zero: number;
  positive: number;
  /** Candidats qu'un filtre « autorité > 0 » appliqué à TOUTES les sources aurait retirés. */
  wouldDrop: number;
  bySource: Record<string, { total: number; zero: number; unknown: number }>;
}

/**
 * Mesure de l'effet du filtre « autorité > 0 » (dette de MT.3) : sur les candidats d'une collecte,
 * combien ont une autorité nulle et par quelle source ils arrivent. Le recoupement filtre déjà côté
 * serveur (sinon 85 % de lignes inutiles) ; Content Analysis et la SERP ne filtrent pas.
 */
export function authorityImpact(cands: readonly QualCandidate[]): AuthorityImpact {
  const out: AuthorityImpact = {
    total: cands.length,
    unknown: 0,
    zero: 0,
    positive: 0,
    wouldDrop: 0,
    bySource: {},
  };
  for (const c of cands) {
    const src = c.sources[0]?.source ?? "inconnue";
    const s = (out.bySource[src] ??= { total: 0, zero: 0, unknown: 0 });
    s.total++;
    if (c.domainRank === null) {
      out.unknown++;
      s.unknown++;
    } else if (c.domainRank <= 0) {
      out.zero++;
      s.zero++;
    } else out.positive++;
  }
  out.wouldDrop = out.zero;
  return out;
}

/** Hôte de plateforme (pour l'affichage) : « over-blog.com » pour monblog.over-blog.com. */
export const platformLabel = (domain: string) => blogPlatformOf(domain);

/** Longueur de la racine comparée (« coloriages » et « coloring » partagent « color »). */
const THEME_STEM = 5;

/**
 * Vrai si le NOM de domaine porte un mot du thème de la campagne (18/11/2026, chantier D.4) : sur
 * l'audit de référence, 16 des 60 concurrents jugés en avaient un, contre 2 cibles sur 72. Ce n'est
 * pas une preuve (jamais un motif d'exclusion) : le site passe en fin de file de lecture. Les mots
 * viennent du thème de la campagne, rien n'est écrit en dur pour un sujet.
 */
export function nameCarriesTheme(domain: string, theme: string): boolean {
  const stems = new Set(
    normalizeKey(theme)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= THEME_STEM)
      .map((w) => w.slice(0, THEME_STEM)),
  );
  if (stems.size === 0) return false;
  const label = normalizeKey(registrableDomain(hostOf(domain)).replace(/\.[a-z.]+$/, "")).replace(
    /[^a-z0-9]/g,
    "",
  );
  return [...stems].some((st) => label.includes(st));
}
