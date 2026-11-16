import { QUALIFY_LIMITS } from "./limits";
import type {
  ContactOutcome,
  ExclusionReason,
  LlmJudgement,
  PageSnapshot,
  QualCandidate,
  QualContext,
  ScoreParts,
  SiteType,
} from "./types";

/**
 * « Personne ne la sollicite » par type de site (docs/audit-v2.md, angle des cibles de Jonathan) :
 * mairies, associations, écoles, photographes, petits e-commerces et forums modérés reçoivent peu
 * de demandes de liens ; les blogs davantage ; les médias et annuaires beaucoup. [HYPOTHÈSE, à recaler
 * sur les réponses réelles (phase 5).]
 */
export const UNSOLICITED_BY_TYPE: Record<SiteType, number> = {
  mairie: 1,
  association: 1,
  ecole: 1,
  photographe: 0.95,
  forum_modere: 0.9,
  ecommerce: 0.85,
  blog: 0.75,
  autre: 0.65,
  annuaire: 0.5,
  media: 0.45,
};

const CONTACT_EASE: Partial<Record<ContactOutcome["status"], number>> = {
  email_verifie: 1,
  email_a_verifier: 0.8,
  formulaire: 0.65,
};

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Autorité plafonnée : au-delà de `authorityCap` elle ne rapporte plus rien ; inconnue = moyenne. */
export function cappedAuthority(rank: number | null): number {
  if (rank === null) return 0.75;
  return (
    0.6 +
    0.4 * (Math.min(Math.max(rank, 0), QUALIFY_LIMITS.authorityCap) / QUALIFY_LIMITS.authorityCap)
  );
}

/** Facteur « personne ne la sollicite » : type de site, programme de contribution, grande autorité. */
export function unsolicitedFactor(
  j: LlmJudgement,
  page: PageSnapshot | null,
  rank: number | null,
): number {
  let f = UNSOLICITED_BY_TYPE[j.siteType];
  if (page?.contributorProgram) f *= 0.85;
  if (rank !== null && rank >= 400) f *= 0.8;
  return f;
}

/** Pertinence : adéquation du LLM, renforcée par le recoupement des concurrents (un site qui cite déjà le thème). */
export function pertinence(j: LlmJudgement, c: QualCandidate): number {
  return clamp(j.fit * (1 + 0.08 * Math.min(c.competitorsCount, 3)));
}

/** Score final (0-100) = pertinence × personne ne la sollicite × facilité de contact × autorité plafonnée. */
export function finalScore(
  c: QualCandidate,
  j: LlmJudgement,
  page: PageSnapshot | null,
  contact: ContactOutcome,
): { score: number; parts: ScoreParts } | null {
  const ease = CONTACT_EASE[contact.status];
  if (ease === undefined) return null;
  const parts: ScoreParts = {
    pertinence: r3(pertinence(j, c)),
    unsolicited: r3(unsolicitedFactor(j, page, c.domainRank)),
    contactEase: ease,
    authority: r3(cappedAuthority(c.domainRank)),
  };
  const score = 100 * parts.pertinence * parts.unsolicited * parts.contactEase * parts.authority;
  return { score: Math.round(score * 10) / 10, parts };
}

/** Exclusion après le LLM (étage 4), dans l'ordre de gravité. */
export function judgementExclusion(
  j: LlmJudgement,
  minFit: number = QUALIFY_LIMITS.minFit,
): { reason: ExclusionReason; detail: string } | null {
  if (j.sellsLinks) return { reason: "vend_des_liens", detail: j.fitReason };
  if (j.sameOffer) return { reason: "concurrent", detail: j.fitReason };
  if (j.unrealistic) return { reason: "irrealiste", detail: j.fitReason };
  if (j.fit < minFit) return { reason: "hors_sujet", detail: j.fitReason };
  return null;
}

/** Score de priorité après le LLM (avant contact) : ordre de l'enquête de contact. */
export function preContactScore(
  c: QualCandidate,
  j: LlmJudgement,
  page: PageSnapshot | null,
): number {
  return (
    pertinence(j, c) * unsolicitedFactor(j, page, c.domainRank) * cappedAuthority(c.domainRank)
  );
}

const SITE_TYPE_LABEL: Record<SiteType, string> = {
  mairie: "site de mairie ou de collectivité",
  association: "site d'association",
  ecole: "site d'école ou d'enseignant",
  photographe: "site de photographe",
  ecommerce: "petite boutique en ligne",
  forum_modere: "forum modéré",
  blog: "blog",
  media: "média",
  annuaire: "annuaire",
  autre: "site",
};

/** Ce que la cible gagne à citer la page proposée, selon son type (jamais de promesse chiffrée). */
const ANGLE: Record<SiteType, string> = {
  mairie: "une ressource utile aux familles, à ajouter à ses liens utiles",
  association: "une ressource pratique pour ses adhérents et ses animateurs",
  ecole: "une ressource à donner aux élèves ou aux parents",
  photographe: "un complément pour ses visiteurs, sur un sujet proche du sien",
  ecommerce: "un contenu utile pour ses clients, sans rapport commercial",
  forum_modere: "une réponse utile à ses membres, si la modération l'accepte",
  blog: "un complément utile à son article pour ses lecteurs",
  media: "une source pour un futur article ou une mise à jour",
  annuaire: "une inscription dans la bonne rubrique",
  autre: "une page utile à ses lecteurs",
};

/**
 * La demande en trois lignes et le pourquoi (sans LLM : modèles + citation vérifiée + ressource choisie).
 * Ce n'est pas l'email (M3.3 le rédige) : c'est ce qu'on va demander, où, et pourquoi c'est légitime.
 */
export function requestAndWhy(
  c: QualCandidate,
  j: LlmJudgement,
  page: PageSnapshot,
  ctx: QualContext,
): { lines: string[]; why: string } {
  const res = ctx.resources[j.resource] ??
    ctx.resources[0] ?? { url: `https://${ctx.ownDomain}/`, title: ctx.brandName };
  const where = page.title ? `sa page « ${page.title.slice(0, 90)} »` : c.domain;
  const lines = [
    `Proposer « ${res.title} » (${res.url}) à ${where}.`,
    j.hook
      ? `Point de départ : « ${j.hook.slice(0, 160)} ».`
      : `Point de départ : le sujet de la page, ${ctx.theme || "proche du vôtre"}.`,
    `Pour lui : ${ANGLE[j.siteType]}.`,
  ];
  const signals: string[] = [];
  if (c.competitorsCount >= 2) signals.push(`il lie déjà ${c.competitorsCount} de vos concurrents`);
  if (
    ["mairie", "association", "ecole", "photographe", "forum_modere", "ecommerce"].includes(
      j.siteType,
    )
  ) {
    signals.push(`${SITE_TYPE_LABEL[j.siteType]}, rarement sollicité pour des liens`);
  } else signals.push(SITE_TYPE_LABEL[j.siteType]);
  if (c.tactics.includes("mentions")) signals.push("il parle déjà de vous");
  return { lines, why: `${j.fitReason.replace(/\.$/, "")} ; ${signals.join(" ; ")}.` };
}
