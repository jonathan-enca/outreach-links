import type { Finding, FindingBrief, FindingContext, FindingKind, ReplacementHow } from "./types";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export interface BuildInput {
  kind: FindingKind;
  targetId: string;
  domain: string;
  pageUrl: string;
  pageTitle: string;
  quote: string;
  linkUrl: string | null;
  httpStatus: 404 | 410 | null;
  anchor: string | null;
  /** Mention : texte exact à transformer en lien. */
  matched?: string;
  resource: { url: string; title: string };
  replacementHow: ReplacementHow;
  /** Raison du jugement (lien inadapté) ou note (lien mort). */
  reason: string;
  toOwnSite?: boolean;
}

/** Phrase de la mention avec le texte à lier repéré par des crochets : la « phrase après ». */
export function proposedSentence(sentence: string, matched: string, url: string): string {
  const at = sentence.toLowerCase().indexOf(matched.toLowerCase());
  if (at < 0) return sentence;
  return `${sentence.slice(0, at)}[${sentence.slice(at, at + matched.length)}](${url})${sentence.slice(at + matched.length)}`;
}

/**
 * Les trois lignes de la demande (quoi, point précis de la page, ce que la cible y gagne) et le
 * brief du rédacteur. Aucune promesse chiffrée, aucune invention : tout vient de la page ou du
 * jugement vérifié. La présentation honnête (fondateur, équipe ou agence) dépend de la réponse de l'utilisateur et se fixe au pont vers le lot (MT.6) : `introduceAs` n'est que la valeur par défaut.
 */
export function buildFinding(input: BuildInput, ctx: Pick<FindingContext, "brandName">): Finding {
  const res = input.resource;
  const pageName = input.pageTitle ? `« ${clip(input.pageTitle, 90)} »` : input.domain;
  let lines: string[];
  let anchor = input.anchor;
  let proposed: string | null = null;
  let opening: string;
  if (input.kind === "lien_mort") {
    const label = input.anchor ? `« ${clip(input.anchor, 60)} »` : host(input.linkUrl ?? "");
    lines = input.toOwnSite
      ? [
          `Signaler que le lien ${label} de ${pageName} vers une ancienne page de ${ctx.brandName} renvoie une erreur ${input.httpStatus}, et proposer « ${res.title} » (${res.url}) à la place.`,
          `Point précis : « ${clip(input.quote, 220)} » (${input.linkUrl}).`,
          `Pour lui : un lien qui fonctionne de nouveau pour ses lecteurs.`,
        ]
      : [
          `Signaler le lien mort ${label} (${host(input.linkUrl ?? "")}, erreur ${input.httpStatus}) de ${pageName} et proposer « ${res.title} » (${res.url}) comme remplaçant.`,
          `Point précis : « ${clip(input.quote, 220)} » (${input.linkUrl}).`,
          `Pour lui : un lien qui fonctionne pour ses lecteurs, signalé par quelqu'un qui connaît le site proposé.`,
        ];
    opening = `Votre page ${pageName} contient un lien qui ne fonctionne plus : « ${clip(input.quote, 160)} ».`;
  } else if (input.kind === "lien_inadapte") {
    const label = input.anchor ? `« ${clip(input.anchor, 60)} »` : host(input.linkUrl ?? "");
    lines = [
      `Proposer « ${res.title} » (${res.url}) à la place, ou en complément, du lien ${label} vers ${host(input.linkUrl ?? "")} dans ${pageName}.`,
      `Point précis : « ${clip(input.quote, 220)} » (${input.linkUrl}).`,
      `Pourquoi : ${clip(input.reason.replace(/\.$/, ""), 200)}.`,
    ];
    opening = `Dans ${pageName}, vous renvoyez vers ${host(input.linkUrl ?? "")} : « ${clip(input.quote, 160)} ».`;
  } else {
    const matched = input.matched ?? input.anchor ?? ctx.brandName;
    anchor = matched;
    proposed = proposedSentence(input.quote, matched, res.url);
    lines = [
      `Demander de transformer la mention « ${clip(matched, 60)} » de ${pageName} en lien vers ${res.url}.`,
      `Phrase actuelle : « ${clip(input.quote, 220)} ». Phrase après : « ${clip(proposed, 260)} ».`,
      `Pour lui : ses lecteurs peuvent retrouver le site qu'il cite ; la page ne le lie pas encore (vérifié).`,
    ];
    opening = `Vous citez ${matched} dans ${pageName} : « ${clip(input.quote, 160)} ».`;
  }
  const brief: FindingBrief = {
    opening,
    resourceTitle: res.title,
    resourceUrl: res.url,
    anchor,
    introduceAs: "fondateur",
  };
  return {
    targetId: input.targetId,
    domain: input.domain,
    kind: input.kind,
    pageUrl: input.pageUrl,
    quote: input.quote,
    linkUrl: input.linkUrl,
    httpStatus: input.httpStatus,
    anchor,
    resourceUrl: res.url,
    resourceTitle: res.title,
    replacementHow: input.replacementHow,
    proposedSentence: proposed,
    reason: input.reason,
    requestLines: lines,
    brief,
  };
}
