import type { FindingKind } from "@/features/findings/types";
import type { Tactic } from "@/features/queries/schema";
import type { FindingView, MessageState, TacticFilter, TargetCard } from "./types";

/** Les constats les plus probants d'abord : une preuve constatée (404/410), puis la mention vérifiée. */
const KIND_ORDER: FindingKind[] = ["lien_mort", "mention_sans_lien", "lien_inadapte"];

export function sortFindings<T extends { kind: FindingKind }>(findings: readonly T[]): T[] {
  return [...findings].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/** Tactique que sert un constat : liens morts et inadaptés = pages ressources, mention = mentions. */
export function tacticOfFinding(kind: FindingKind): Tactic {
  return kind === "mention_sans_lien" ? "mentions" : "ressources";
}

/** Tactiques d'une carte : celles de la collecte, plus celles que ses constats prouvent. */
export function cardTactics(card: Pick<TargetCard, "tactics" | "findings">): Tactic[] {
  const set = new Set<Tactic>(card.tactics);
  for (const f of card.findings) set.add(tacticOfFinding(f.kind));
  return [...set];
}

/**
 * LA catégorie d'une cible à l'écran : celle de la demande qui sera faite (le constat le plus probant,
 * sinon la tactique la plus précise de la collecte). Une seule par cible, pour que les compteurs des
 * filtres s'additionnent exactement (retour de Jonathan, 18/11 : « 57 + 15 n'est pas égal à 61 »).
 */
export function primaryTactic(card: Pick<TargetCard, "tactics" | "findings">): Tactic {
  const f = sortFindings(card.findings)[0];
  if (f) return tacticOfFinding(f.kind);
  if (card.tactics.includes("mentions")) return "mentions";
  if (card.tactics.includes("ressources")) return "ressources";
  return "inconnus";
}

export function filterCards(cards: readonly TargetCard[], filter: TacticFilter): TargetCard[] {
  if (filter === "toutes") return [...cards];
  return cards.filter((c) => primaryTactic(c) === filter);
}

export function countByTactic(cards: readonly TargetCard[]): Record<TacticFilter, number> {
  const out: Record<TacticFilter, number> = {
    toutes: cards.length,
    inconnus: 0,
    ressources: 0,
    mentions: 0,
  };
  for (const c of cards) out[primaryTactic(c)]++;
  return out;
}

export interface PrimaryRequest {
  kind: FindingKind | "site_non_sollicite" | "page_ressources";
  lines: string[];
  /** Citation exacte de la page de la cible ; null sans constat ni accroche vérifiée. */
  quote: string | null;
  finding: FindingView | null;
}

/**
 * La demande qui deviendra le message : celle du constat le plus probant ; à défaut, la demande de la
 * qualification (accroche = citation vérifiée du jugement MT.4, jamais inventée).
 */
export function primaryRequest(card: TargetCard): PrimaryRequest {
  const f = sortFindings(card.findings)[0];
  if (f) return { kind: f.kind, lines: f.requestLines, quote: f.quote, finding: f };
  return {
    kind: card.tactics.includes("ressources") ? "page_ressources" : "site_non_sollicite",
    lines: card.requestLines,
    quote: card.hook,
    finding: null,
  };
}

/** Une demande ne peut être validée que pour une cible de la liste courte avec un contact utilisable. */
export function isEligible(card: TargetCard): boolean {
  return (
    !card.contactless &&
    !card.alreadyValidated &&
    card.contact.kind !== "aucun" &&
    card.requestLines.length === 3
  );
}

export function eligibleIds(cards: readonly TargetCard[]): string[] {
  return cards.filter(isEligible).map((c) => c.id);
}

/** Nombre de cibles retenues dans chaque état de message. */
export function countStates(
  kept: readonly TargetCard[],
  messages: Readonly<Record<string, { state: MessageState }>>,
): Record<MessageState, number> {
  const out: Record<MessageState, number> = {
    en_redaction: 0,
    a_rediger: 0,
    a_relire: 0,
    approuve: 0,
    refuse: 0,
  };
  for (const c of kept) out[messages[c.id]?.state ?? "en_redaction"]++;
  return out;
}
