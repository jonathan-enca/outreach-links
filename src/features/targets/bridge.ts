import type { Json } from "@/lib/supabase/database.types";
import { primaryRequest, type PrimaryRequest } from "./cards";
import type { FounderRole, TargetCard } from "./types";

/** Contexte du site pour passer de la liste courte à un plan de liens. */
export interface BridgeContext {
  siteDomain: string;
  brandName: string;
  /** Pages proposables du site, l'accueil d'abord (même liste que la qualification). */
  resources: { url: string; title: string }[];
  /** Réponse de l'utilisateur : jamais « fondateur » sans son accord. */
  role: FounderRole;
  offeredAsset: string | null;
}

/** Brief du rédacteur (stocké dans `plan_item_briefs.brief`). */
export interface DraftBriefData {
  kind: PrimaryRequest["kind"];
  opening: string;
  resourceTitle: string;
  resourceUrl: string;
  anchor: string | null;
  presentation: FounderRole;
  quote: string | null;
  linkUrl: string | null;
  httpStatus: number | null;
  proposedSentence: string | null;
}

export interface BridgeItem {
  card: TargetCard;
  request: PrimaryRequest;
  /** Ligne JSON de `create_link_plan` (l'ordre du tableau = la position). */
  planItem: Record<string, Json>;
  triage: { resolvedUrl: string; hook: string | null; pageTitle: string | null };
  contact: {
    status: "email_verifie" | "email_a_verifier" | "formulaire";
    email: string | null;
    verified: boolean;
    contactUrl: string | null;
    formUrl: string | null;
  };
  brief: DraftBriefData;
}

export interface BridgeSkip {
  domain: string;
  reason: "contact" | "page" | "deja_validee";
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

const PLAN_TYPE: Record<PrimaryRequest["kind"], string> = {
  lien_mort: "lien_mort",
  lien_inadapte: "lien_inadapte",
  mention_sans_lien: "mention",
  page_ressources: "page_ressources",
  site_non_sollicite: "site_non_sollicite",
};

const EXPECTED_LINK: Record<PrimaryRequest["kind"], string> = {
  lien_mort: "reprise_lien_mort",
  lien_inadapte: "editorial",
  mention_sans_lien: "mention_a_lier",
  page_ressources: "ressource",
  site_non_sollicite: "editorial",
};

/**
 * Passe de la liste courte retenue aux éléments d'un plan de liens (mêmes tables que le plan de M2.3),
 * pour que triage, contacts, rédaction et lots existants s'appliquent sans changement. Une cible sans
 * contact, sans page lue ou déjà validée est ignorée avec son motif, jamais devinée.
 */
export function buildBridge(
  cards: readonly TargetCard[],
  ctx: BridgeContext,
): { items: BridgeItem[]; skipped: BridgeSkip[] } {
  const items: BridgeItem[] = [];
  const skipped: BridgeSkip[] = [];
  const home = ctx.resources[0] ?? { url: `https://${ctx.siteDomain}/`, title: ctx.brandName };
  for (const card of cards) {
    if (card.alreadyValidated) {
      skipped.push({ domain: card.domain, reason: "deja_validee" });
      continue;
    }
    if (card.contactless || card.contact.kind === "aucun") {
      skipped.push({ domain: card.domain, reason: "contact" });
      continue;
    }
    const request = primaryRequest(card);
    const f = request.finding;
    const pageUrl = f?.pageUrl ?? card.pageUrl;
    if (!pageUrl || request.lines.length !== 3) {
      skipped.push({ domain: card.domain, reason: "page" });
      continue;
    }
    const resource = f ? { url: f.resourceUrl, title: f.resourceTitle } : (card.resource ?? home);
    const anchorText = f?.anchor?.trim() || clip(resource.title, 60);
    const brandLower = ctx.brandName.toLowerCase();
    const anchorKind = anchorText.toLowerCase().includes(brandLower) ? "marque" : "descriptive";
    const rank = card.rank ?? 40;
    const quote = request.quote ? clip(request.quote, 160) : null;
    const title = card.pageTitle ? `« ${clip(card.pageTitle, 90)} »` : card.domain;
    const opening =
      f?.opening ??
      (quote ? `Sur votre page ${title}, vous écrivez : « ${quote} ».` : `Votre page ${title}.`);
    const brief: DraftBriefData = {
      kind: request.kind,
      opening,
      resourceTitle: resource.title,
      resourceUrl: resource.url,
      anchor: f?.anchor ?? null,
      presentation: ctx.role,
      quote: request.quote,
      linkUrl: f?.linkUrl ?? null,
      httpStatus: f?.httpStatus ?? null,
      proposedSentence: f?.proposedSentence ?? null,
    };
    const verified = card.contact.kind === "email" && card.contact.verified;
    items.push({
      card,
      request,
      brief,
      planItem: {
        type: PLAN_TYPE[request.kind],
        source_domain: card.domain,
        source_url: pageUrl,
        url_exact: true,
        target_page_url: resource.url,
        anchor_kind: anchorKind,
        anchor_text: anchorText,
        expected_link_type: EXPECTED_LINK[request.kind],
        offer: ctx.offeredAsset?.trim() || null,
        rationale: card.why ?? request.lines[1] ?? "Cible de la liste courte.",
        priority: rank <= 10 ? "haute" : rank <= 25 ? "moyenne" : "basse",
        priority_score: Math.max(10, Math.min(100, 100 - 2 * rank)),
        broken_url: request.kind === "lien_mort" ? (f?.linkUrl ?? null) : null,
      },
      triage: { resolvedUrl: pageUrl, hook: quote ?? card.hook, pageTitle: card.pageTitle },
      contact:
        card.contact.kind === "formulaire"
          ? {
              status: "formulaire",
              email: null,
              verified: false,
              contactUrl: card.contact.url,
              formUrl: card.contact.url,
            }
          : {
              status: verified ? "email_verifie" : "email_a_verifier",
              email: card.contact.email,
              verified,
              contactUrl: card.contact.url,
              formUrl: null,
            },
    });
  }
  return { items, skipped };
}
