import { isLoginWall, isParked, looksHacked, sellsLinks } from "@/features/triage/rules";
import type { PageRead, PageReader } from "@/features/triage/page-reader";
import {
  DEFAULT_EXCLUDED_DOMAINS,
  hostOf,
  isExcludedDomain,
  isValidHost,
} from "@/features/audits/excluded-domains";
import { isPlatformUserSite, registrableDomain } from "@/features/collection/hosts";
import { stageTwoReason } from "./free";
import { wellFormed } from "@/lib/well-formed";
import { QUALIFY_LIMITS } from "./limits";
import type { ExclusionReason, PageCites, PageSnapshot, QualCandidate, QualContext } from "./types";

const LINK_SIGNALS: [RegExp, string][] = [
  [/contact|nous-ecrire|ecrivez-nous/i, "page contact"],
  [/mentions?[-_ ]?l[eé]gales|legal|impressum/i, "mentions légales"],
  [/a-propos|about|qui-(?:sommes|suis)|presentation|notre-histoire/i, "page à propos"],
  [/equipe|team|auteurs?|author|redaction/i, "auteurs"],
];

const TEXT_SIGNALS: [RegExp, string][] = [
  [/mentions\s+l[ée]gales/i, "mentions légales"],
  [/directeur\s+(?:de\s+(?:la\s+)?)?publication|[ée]diteur\s+du\s+site/i, "éditeur déclaré"],
  [/(?:©|copyright)\s*(?:\d{4})?\s*[A-ZÀ-Ý]/i, "copyright nominatif"],
  [/(?:r[ée]dig[ée]|[ée]crit|publi[ée])\s+par\s+[A-ZÀ-Ý]/i, "auteur nommé"],
  [/qui\s+(?:suis-je|sommes-nous)|[àa]\s+propos\s+de\s+(?:moi|nous)/i, "présentation"],
];

/** Signaux d'un éditeur identifiable (quelqu'un à qui écrire), lus dans la page déjà téléchargée. */
export function publisherSignals(
  page: Pick<PageRead, "links" | "mailtos" | "hasContactForm" | "text">,
): string[] {
  const out = new Set<string>();
  for (const l of page.links) {
    for (const [re, label] of LINK_SIGNALS) if (re.test(`${l.href} ${l.text}`)) out.add(label);
  }
  if (page.mailtos.length > 0) out.add("email publié");
  if (page.hasContactForm) out.add("formulaire");
  for (const [re, label] of TEXT_SIGNALS) if (re.test(page.text)) out.add(label);
  return [...out];
}

/** Programme de contribution sans tarif (« devenir contributeur ») : signe d'un site déjà sollicité. */
export function hasContributorProgram(text: string): boolean {
  return /devenir\s+(?:contributeur|r[ée]dacteur|auteur\s+invit[ée])|proposer\s+un\s+article|write\s+for\s+us|guest\s+post/i.test(
    text,
  );
}

const sameSite = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/**
 * Ce que la page cite déjà (MC.6b), relevé dans les liens sortants déjà lus (gratuit) : les sites
 * extérieurs cités dans le CONTENU (ni menu, ni pied de page, ni réseaux sociaux ou plateformes), et la
 * ressource comparable qui a fait trouver la page, avec le passage qui l'entoure. C'est ce qui permet de
 * reconnaître une page qui recommande des ressources à ses lecteurs, sans lire toute la page au modèle.
 */
export function pageCites(
  read: Pick<PageRead, "outbound">,
  c: Pick<QualCandidate, "domain" | "sources">,
): PageCites {
  const own = registrableDomain(hostOf(c.domain));
  const sites = new Set<string>();
  const links: PageCites["links"] = [];
  for (const o of read.outbound) {
    if (o.zone !== "body") continue;
    const host = hostOf(o.url);
    if (!isValidHost(host)) continue;
    // Boutons de partage, vidéos, places de marché : ce ne sont pas des ressources citées.
    if (!isPlatformUserSite(host) && isExcludedDomain(host, [], DEFAULT_EXCLUDED_DOMAINS)) continue;
    const site = isPlatformUserSite(host) ? host : registrableDomain(host);
    if (site === own || sites.has(site)) continue;
    sites.add(site);
    if (links.length < QUALIFY_LIMITS.citedLinks) {
      links.push({ anchor: wellFormed(o.anchor.slice(0, 60)), domain: site });
    }
  }
  const resource = c.sources.find((x) => x.source === "citation" && x.persona)?.persona ?? null;
  if (!resource) return { sites: sites.size, links };
  const hit =
    read.outbound.find((o) => o.zone === "body" && sameSite(hostOf(o.url), resource)) ??
    read.outbound.find((o) => sameSite(hostOf(o.url), resource));
  return {
    sites: sites.size,
    links,
    resource: {
      domain: resource,
      found: Boolean(hit),
      context: hit ? wellFormed(hit.context.slice(0, QUALIFY_LIMITS.citedContextChars)) : "",
    },
  };
}

export function snapshotOf(
  read: PageRead,
  c?: Pick<QualCandidate, "domain" | "sources">,
): PageSnapshot {
  // Une coupe au milieu d'un émoji laisse une demi-paire UTF-16 : chaque extrait est rendu bien formé.
  return {
    url: read.url,
    status: read.status,
    lang: read.lang,
    title: wellFormed(read.title.slice(0, 200)),
    description: wellFormed(read.description.slice(0, 300)),
    headings: read.headings.slice(0, 8).map((h) => wellFormed(h.slice(0, 120))),
    excerpt: wellFormed(read.text.slice(0, QUALIFY_LIMITS.excerptChars)),
    publisherSignals: publisherSignals(read),
    contributorProgram: hasContributorProgram(read.text),
    ...(c ? { cites: pageCites(read, c) } : {}),
  };
}

export interface PageVerdict {
  page: PageSnapshot | null;
  reason: ExclusionReason | null;
  detail: string | null;
}

/**
 * Étage 3 (gratuit) : décision sur une page lue. Mêmes preuves nettes que le tri M3.1 (HTTP, parqué,
 * piraté, vente de liens, mur de connexion) + langue de la page + éditeur identifiable. Une page
 * ambiguë n'est jamais exclue ici : c'est au LLM de juger.
 */
export function pageVerdict(read: PageRead, c: QualCandidate, ctx: QualContext): PageVerdict {
  if (read.blockedByRobots) {
    return { page: null, reason: "robots", detail: "le robots.txt interdit la lecture" };
  }
  if (read.status === 404 || read.status === 410) {
    return { page: null, reason: "page_morte", detail: `HTTP ${read.status}` };
  }
  if (read.unreachable || read.status !== 200) {
    return {
      page: null,
      reason: "injoignable",
      detail: read.status ? `HTTP ${read.status}` : "pas de réponse",
    };
  }
  const page = snapshotOf(read, c);
  const all = `${read.title} ${read.description} ${read.text}`;
  if (isParked(all)) return { page, reason: "parque", detail: "site parqué, suspendu ou à vendre" };
  if (looksHacked(all)) return { page, reason: "pirate", detail: "contenu de spam injecté" };
  if (sellsLinks(all)) {
    return { page, reason: "vend_des_liens", detail: "articles ou liens sponsorisés proposés" };
  }
  if (isLoginWall(read)) return { page, reason: "mur_connexion", detail: "connexion obligatoire" };
  const lang = stageTwoReason({ ...c, spamScore: null, domainRank: null }, ctx, read.lang);
  if (lang) return { page, reason: lang.reason, detail: lang.detail };
  if (page.publisherSignals.length === 0) {
    return { page, reason: "editeur_introuvable", detail: "ni contact, ni mentions, ni auteur" };
  }
  return { page, reason: null, detail: null };
}

/**
 * Lit la page d'un candidat (sinon son accueil) avec le lecteur sûr (robots.txt, SSRF, délai par
 * hôte). Une page trouvée par la collecte peut avoir disparu alors que le site vit : l'accueil la
 * remplace dans ce cas (la cible reste le site).
 */
export async function readCandidate(
  reader: Pick<PageReader, "read">,
  c: QualCandidate,
): Promise<PageRead> {
  const home = `https://${c.domain}/`;
  const first = await reader.read(c.url ?? home);
  if (
    c.url &&
    c.url !== home &&
    (first.status === 404 || first.status === 410 || first.unreachable)
  ) {
    const h = await reader.read(home);
    if (h.status === 200) return h;
  }
  return first;
}

/**
 * Chantier D.2 : « éditeur introuvable » vu sur UNE page (un article, un forum) ne veut pas dire que
 * le site n'a pas d'éditeur : son accueil, lui, porte souvent le menu « Contact » ou « À propos ».
 * Avant d'écarter, on lit l'accueil. Ce qu'il prouve compte : un accueil parqué, piraté, vendeur de
 * liens ou derrière une connexion écarte le site pour ce vrai motif ; un accueil qui montre un
 * éditeur sauve le site (la page jugée reste la page d'origine, avec les signaux de l'accueil). Aucune
 * règle de tri ne change : seul l'éditeur est cherché au bon endroit.
 */
export function rescueFromHome(
  v: PageVerdict,
  home: PageRead,
  c: QualCandidate,
  ctx: QualContext,
): { verdict: PageVerdict; rescued: boolean } {
  if (v.reason !== "editeur_introuvable" || !v.page) return { verdict: v, rescued: false };
  if (home.status !== 200 || home.blockedByRobots) return { verdict: v, rescued: false };
  const hv = pageVerdict(home, c, ctx);
  if (hv.reason !== null && hv.reason !== "editeur_introuvable") {
    return { verdict: { ...hv, page: v.page }, rescued: false };
  }
  const signals = publisherSignals(home);
  if (signals.length === 0) return { verdict: v, rescued: false };
  return {
    verdict: { page: { ...v.page, publisherSignals: signals }, reason: null, detail: null },
    rescued: true,
  };
}

/** Vrai si l'adresse est déjà l'accueil du site (inutile de le relire). */
export function isHomeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.pathname === "/" || u.pathname === "") && u.search === "";
  } catch {
    return false;
  }
}
