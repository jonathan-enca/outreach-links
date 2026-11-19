import type { PageRead } from "@/features/triage/page-reader";
import { PROPOSAL_LIMITS, type ProposedSite } from "./schema";

/** Motif de rejet d'une proposition : affiché tel quel dans le rapport d'écart. */
export type RejectReason =
  | "adresse_invalide"
  | "site_propre"
  | "hors_domaine"
  | "injoignable"
  | "robots"
  | "statut_http"
  | "page_vide"
  | "ressource_absente"
  | "doublon";

export interface VerifiedSite {
  domaine: string;
  /** Adresse lue en HTTP 200 (jamais celle que le modèle a écrite si elle diffère). */
  page: string;
  ressource: string;
  raison: string;
}

export interface RejectedSite {
  domaine: string;
  page: string;
  motif: RejectReason;
}

export interface ProposalCheck {
  themes: string[];
  kept: VerifiedSite[];
  rejected: RejectedSite[];
  /** Nombre de sites proposés par le modèle (avant vérification). */
  proposed: number;
  /** Part des propositions écartées, de 0 à 1 ; null si rien n'a été proposé. */
  gapRate: number | null;
}

export type PageLookup = (url: string) => Promise<PageRead>;

/** Minuscules, sans accents, espaces réduits : compare un nom de ressource à un texte de page. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Hôte sans « www. » ni port, en minuscules ; null si l'adresse n'en est pas une. */
export function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const sameSite = (a: string, b: string) => a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);

/**
 * Vérifie une proposition : l'adresse existe, appartient au domaine proposé, n'est pas le site
 * lui-même, répond 200, a un vrai contenu, et cite bien la ressource annoncée.
 * Pur à la lecture près (la lecture de page est injectée).
 */
export async function checkProposal(
  p: ProposedSite,
  siteDomain: string,
  read: PageLookup,
): Promise<{ ok: true; site: VerifiedSite } | { ok: false; motif: RejectReason }> {
  const host = hostnameOf(p.page);
  const declared = hostnameOf(`https://${p.domaine}`);
  if (!host || !declared) return { ok: false, motif: "adresse_invalide" };
  const own = hostnameOf(`https://${siteDomain}`);
  if (own && sameSite(host, own)) return { ok: false, motif: "site_propre" };
  if (!sameSite(host, declared)) return { ok: false, motif: "hors_domaine" };

  const page = await read(p.page);
  // Interdite par robots.txt avant tout : la page n'a pas été lue, donc son statut vaut 0 par construction.
  if (page.blockedByRobots) return { ok: false, motif: "robots" };
  if (page.unreachable || page.status === 0) return { ok: false, motif: "injoignable" };
  if (page.status !== 200) return { ok: false, motif: "statut_http" };
  if (page.text.trim().length < PROPOSAL_LIMITS.minTextChars)
    return { ok: false, motif: "page_vide" };

  const haystack = normalizeText(
    [page.title, page.description, ...page.headings, page.text].join(" \n "),
  );
  if (!haystack.includes(normalizeText(p.ressource)))
    return { ok: false, motif: "ressource_absente" };

  return {
    ok: true,
    site: {
      domaine: p.domaine,
      page: page.url || p.page,
      ressource: p.ressource,
      raison: p.raison,
    },
  };
}

/**
 * Vérifie toutes les propositions (lectures par petits lots), écarte les doublons d'adresse, et calcule
 * le taux d'écart. Rien n'entre dans `kept` sans avoir passé toutes les vérifications.
 */
export async function verifyProposals(
  sites: readonly ProposedSite[],
  siteDomain: string,
  read: PageLookup,
  themes: string[] = [],
): Promise<ProposalCheck> {
  const kept: VerifiedSite[] = [];
  const rejected: RejectedSite[] = [];
  const seen = new Set<string>();
  const queue = [...sites];
  const work = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const key = p.page.trim().toLowerCase();
      if (seen.has(key)) {
        rejected.push({ domaine: p.domaine, page: p.page, motif: "doublon" });
        continue;
      }
      seen.add(key);
      const res = await checkProposal(p, siteDomain, read);
      if (res.ok) kept.push(res.site);
      else rejected.push({ domaine: p.domaine, page: p.page, motif: res.motif });
    }
  };
  await Promise.all(Array.from({ length: PROPOSAL_LIMITS.readConcurrency }, work));
  const proposed = sites.length;
  return {
    themes,
    kept,
    rejected,
    proposed,
    gapRate: proposed === 0 ? null : rejected.length / proposed,
  };
}

/** Ligne du rapport : « 4 sur 12 propositions écartées (33 %) ». */
export function gapLabel(check: Pick<ProposalCheck, "proposed" | "rejected">): string {
  if (check.proposed === 0) return "Aucune proposition de Claude.";
  const pct = Math.round((check.rejected.length / check.proposed) * 100);
  return `${check.rejected.length} sur ${check.proposed} propositions écartées (${pct} %).`;
}
