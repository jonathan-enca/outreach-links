import { hostOf, isExcludedDomain, isOwnDomain } from "@/features/audits/excluded-domains";
import type { PageOutbound, PageRead } from "@/features/triage/page-reader";
import { FINDINGS_LIMITS } from "./limits";
import type {
  DeadLinkHit,
  FindingContext,
  LinkCandidate,
  LinkOrigin,
  MentionHit,
  ReplacementHow,
} from "./types";

const FR_TLDS = new Set([
  "fr",
  "be",
  "ch",
  "lu",
  "mc",
  "re",
  "gp",
  "mq",
  "gf",
  "nc",
  "pf",
  "yt",
  "pm",
  "wf",
  "tf",
]);
const GENERIC_TLDS = new Set(["com", "net", "org", "io", "co", "info", "eu", "app", "me"]);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Écritures du nom à chercher : variantes du profil, nom de marque, domaine (avec et sans www). */
export function nameVariantsOf(
  ctx: Pick<FindingContext, "nameVariants" | "brandName" | "ownDomain">,
) {
  const all = [...ctx.nameVariants, ctx.brandName, ctx.ownDomain, `www.${ctx.ownDomain}`]
    .map((v) => v.trim())
    .filter((v) => v.length >= 4);
  const seen = new Set<string>();
  return all
    .filter((v) => !seen.has(norm(v)) && seen.add(norm(v)))
    .sort((a, b) => b.length - a.length);
}

/**
 * Expression qui reconnaît une écriture du nom : espace, tiret et rien se valent entre deux mots
 * (« Mega Coloring », « Mega-Coloring », « megacoloring »), mots entiers seulement, casse ignorée.
 */
export function nameRegex(variant: string): RegExp {
  const body = variant
    .split(/[\s\u2010-\u2015-]+/)
    .map(escapeRe)
    .join("[\\s\\u2010-\\u2015-]*");
  return new RegExp(`(?<![\\p{L}\\p{N}-])${body}(?![\\p{L}\\p{N}-])`, "iu");
}

/** Phrase de `text` qui contient la position `at` (bornée à ~300 caractères). */
export function sentenceAround(text: string, at: number, len: number): string {
  const before = text.slice(Math.max(0, at - 220), at);
  const after = text.slice(at + len, at + len + 220);
  const left = Math.max(
    before.lastIndexOf(". "),
    before.lastIndexOf("! "),
    before.lastIndexOf("? "),
  );
  const rightCut = after.search(/[.!?](\s|$)/);
  const start = left >= 0 ? left + 2 : Math.max(0, before.length - 160);
  const end = rightCut >= 0 ? rightCut + 1 : Math.min(after.length, 160);
  return `${before.slice(start)}${text.slice(at, at + len)}${after.slice(0, end)}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

/**
 * Passages de la page où le site est NOMMÉ (variantes du nom, domaine écrit en toutes lettres).
 * Au plus `maxMentions` passages distincts. Ne dit rien de leur sens (un homonyme passe) : c'est au
 * jugement de trancher, et à `ownLinkState` de dire si la page lie déjà le site.
 */
export function findMentions(
  read: Pick<PageRead, "text">,
  ctx: Pick<FindingContext, "nameVariants" | "brandName" | "ownDomain">,
  max: number = FINDINGS_LIMITS.maxMentions,
): MentionHit[] {
  const text = read.text;
  const hits: { at: number; len: number; matched: string }[] = [];
  for (const v of nameVariantsOf(ctx)) {
    const re = nameRegex(v);
    for (const m of text.matchAll(new RegExp(re.source, "giu"))) {
      const at = m.index ?? 0;
      if (hits.some((h) => at < h.at + h.len && h.at < at + m[0].length)) continue;
      hits.push({ at, len: m[0].length, matched: m[0] });
    }
  }
  hits.sort((a, b) => a.at - b.at);
  const out: MentionHit[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const sentence = sentenceAround(text, h.at, h.len);
    if (seen.has(sentence)) continue;
    seen.add(sentence);
    out.push({ matched: h.matched, sentence });
    if (out.length >= max) break;
  }
  return out;
}

export interface OwnLinkState {
  /** Au moins un lien de la page mène au site (n'importe où dans la page). */
  linked: boolean;
  /** Tous ces liens sont nofollow, sponsored ou ugc. */
  onlyNofollow: boolean;
  urls: string[];
}

/** La page lie-t-elle déjà le site ? (vérification exigée avant toute demande de mention) */
export function ownLinkState(read: Pick<PageRead, "outbound">, ownDomain: string): OwnLinkState {
  const own = read.outbound.filter((l) => isOwnDomain(hostOf(l.url), ownDomain));
  return {
    linked: own.length > 0,
    onlyNofollow:
      own.length > 0 &&
      own.every((l) => l.rel.some((r) => ["nofollow", "sponsored", "ugc"].includes(r))),
    urls: own.map((l) => l.url).slice(0, 5),
  };
}

export function originOf(host: string, language: string): LinkOrigin {
  if (language !== "fr") return "ambigu";
  const tld = host.split(".").pop() ?? "";
  if (FR_TLDS.has(tld)) return "local";
  if (GENERIC_TLDS.has(tld)) return "ambigu";
  return "etranger";
}

const ORIGIN_ORDER: Record<LinkOrigin, number> = { etranger: 0, ambigu: 1, local: 2 };

/**
 * Liens du CONTENU (pas menu ni pied de page) qu'on peut juger « inadaptés » : ni le site, ni ses
 * concurrents, ni une référence neutre (encyclopédie, institution, réseau social), ni un lien
 * sponsorisé, ni une image seule. Les étrangers puis les ambigus d'abord. Le jugement vient après.
 */
const SECOND_LEVEL = new Set(["co", "com", "org", "net", "ac", "gouv", "gov", "edu"]);

/** Domaine de l'éditeur (approximation : deux dernières étiquettes, trois pour co.uk, ac-lyon.fr non fusionné). */
export function publisherDomain(host: string): string {
  const parts = hostOf(host).split(".");
  const n = parts.length >= 3 && SECOND_LEVEL.has(parts[parts.length - 2]!) ? 3 : 2;
  return parts.slice(-n).join(".");
}

export function linkCandidates(
  read: Pick<PageRead, "outbound"> & Partial<Pick<PageRead, "url">>,
  ctx: Pick<FindingContext, "ownDomain" | "competitorDomains" | "language"> &
    Partial<Pick<FindingContext, "nameVariants" | "brandName">>,
  max: number = FINDINGS_LIMITS.maxLinkCandidates,
): LinkCandidate[] {
  const competitors = ctx.competitorDomains.map(hostOf);
  const names = nameVariantsOf({ nameVariants: [], brandName: "", ...ctx }).map((v) =>
    nameRegex(v),
  );
  const pagePublisher = read.url ? publisherDomain(read.url) : null;
  const seenHosts = new Set<string>();
  const kept: Omit<LinkCandidate, "index">[] = [];
  for (const l of read.outbound) {
    if (l.zone !== "body" || l.imageOnly || l.anchor.length < 2) continue;
    if (l.rel.includes("sponsored")) continue;
    const host = hostOf(l.url);
    if (isOwnDomain(host, ctx.ownDomain)) continue;
    if (competitors.some((c) => host === c || host.endsWith(`.${c}`))) continue;
    if (isExcludedDomain(host) || UTILITY_HOSTS.some((u) => host === u || host.endsWith(`.${u}`)))
      continue;
    // Même éditeur (sous-domaine, PDF hébergé ailleurs sur son domaine) : pas un lien à remplacer.
    if (pagePublisher && publisherDomain(host) === pagePublisher) continue;
    if (seenHosts.has(host)) continue;
    // Un lien dont l'ancre est notre nom (fiche d'annuaire, présentation) parle de nous : pas un lien à remplacer.
    if (names.some((n) => n.test(l.anchor))) continue;
    seenHosts.add(host);
    kept.push({
      url: l.url,
      host,
      anchor: l.anchor,
      context: l.context,
      origin: originOf(host, ctx.language),
    });
  }
  return kept
    .map((c, i) => ({ c, i }))
    .sort((a, b) => ORIGIN_ORDER[a.c.origin] - ORIGIN_ORDER[b.c.origin] || a.i - b.i)
    .slice(0, max)
    .map(({ c }, index) => ({ ...c, index }));
}

/** Liens à vérifier (404/410) : le contenu d'abord, puis le reste ; jamais plus de `max`. */
export function linksToCheck(
  read: Pick<PageRead, "outbound">,
  max: number = FINDINGS_LIMITS.maxLinksChecked,
): PageOutbound[] {
  const body = read.outbound.filter((l) => l.zone === "body");
  const chrome = read.outbound.filter((l) => l.zone === "chrome");
  return [...body, ...chrome].slice(0, max);
}

export function toDeadHit(link: PageOutbound, status: 404 | 410, ownDomain: string): DeadLinkHit {
  return {
    url: link.url,
    anchor: link.anchor,
    context: link.context,
    status,
    toOwnSite: isOwnDomain(hostOf(link.url), ownDomain),
  };
}

const STOP = new Set([
  "les",
  "des",
  "une",
  "pour",
  "avec",
  "dans",
  "sur",
  "plus",
  "com",
  "www",
  "http",
  "https",
  "html",
  "php",
  "fr",
]);
const words = (s: string) =>
  norm(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));

/**
 * Page du site qui remplace au mieux un lien : recoupement des mots de l'URL cassée, de l'ancre et
 * de la phrase avec le titre et l'adresse de chaque page proposable ; à défaut la page préférée du
 * jugement MT.4 (`preferred`), sinon l'accueil. Aucun appel payant.
 */
export function pickReplacement(
  link: { url: string; anchor: string; context: string },
  resources: readonly { url: string; title: string }[],
  preferred: number,
): { index: number; how: ReplacementHow } {
  if (resources.length === 0) return { index: 0, how: "accueil" };
  const want = new Set(
    words(`${decodeURIComponent(safePath(link.url))} ${link.anchor} ${link.context}`),
  );
  let best = { index: -1, overlap: 0 };
  resources.forEach((r, i) => {
    if (i === 0) return; // l'accueil n'est qu'un repli
    const have = new Set(words(`${r.title} ${safePath(r.url)}`));
    const overlap = [...have].filter((w) => want.has(w)).length;
    if (overlap > best.overlap) best = { index: i, overlap };
  });
  if (best.index >= 0) return { index: best.index, how: "recoupement" };
  if (preferred > 0 && preferred < resources.length) return { index: preferred, how: "jugement" };
  return { index: 0, how: "accueil" };
}

function safePath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname} ${u.pathname}`;
  } catch {
    return url;
  }
}

const TOPIC_STOP = new Set([
  "enfants",
  "gratuit",
  "gratuits",
  "gratuite",
  "pages",
  "page",
  "site",
  "sites",
  "classe",
  "classes",
  "accueil",
  "pour",
  "avec",
  "dans",
  "plus",
  "vous",
  "nous",
  "votre",
  "autres",
  "idees",
  "liens",
  "free",
  "kids",
  "with",
  "your",
  "from",
  "this",
  "that",
  "best",
  "online",
]);

/** Racines de 5 lettres des mots utiles d'un texte (« coloriages », « colorier » et « coloring » partagent « color »). */
export function stems(s: string): Set<string> {
  return new Set(
    words(s)
      .filter((w) => w.length >= 4 && !TOPIC_STOP.has(w))
      .map((w) => w.slice(0, 5)),
  );
}

/**
 * Garde-fou GRATUIT du jugement « lien inadapté » : le lien (ancre, phrase, adresse, titre de la page)
 * doit partager au moins une racine de mot avec le sujet de la page proposée (titre, adresse, thème du
 * site). Sans recoupement, la page proposée ne remplace pas ce lien : un blog de pâtisserie ne se
 * remplace pas par des coloriages, quoi que dise le modèle.
 */
export function replacesTopic(
  link: { url: string; anchor: string; context: string },
  pageTitle: string,
  resource: { url: string; title: string },
  theme: string,
): boolean {
  const have = stems(`${resource.title} ${safePath(resource.url)} ${theme}`);
  const want = stems(
    `${link.anchor} ${sentenceWith(link.context, link.anchor)} ${safePath(link.url)} ${pageTitle}`,
  );
  return [...want].some((w) => have.has(w));
}

/** La phrase du passage qui contient l'ancre (la phrase voisine ne dit rien du lien) ; sinon tout le passage. */
export function sentenceWith(context: string, anchor: string): string {
  const parts = context.split(/(?<=[.!?])\s+/);
  const a = anchor.toLowerCase();
  return (a && parts.find((p) => p.toLowerCase().includes(a))) || context;
}

/** Boutons d'impression, de partage ou d'ajout : des outils de la page, pas des ressources citées. */
export const UTILITY_HOSTS = [
  "printfriendly.com",
  "addtoany.com",
  "sharethis.com",
  "addthis.com",
  "feedburner.com",
  "gstatic.com",
  "doubleclick.net",
];

/**
 * Preuve factuelle (gratuite) qu'un lien est bien « étranger » pour le lecteur : la page de
 * destination déclare une autre langue que celle du site ; sans langue déclarée, seul un domaine
 * clairement étranger suffit. Un site dans la langue du lecteur sert le lecteur : jamais inadapté.
 */
export function destinationIsForeign(
  destLang: string | null,
  origin: LinkOrigin,
  language: string,
): boolean {
  if (destLang) return !destLang.toLowerCase().startsWith(language.toLowerCase());
  return origin === "etranger";
}
