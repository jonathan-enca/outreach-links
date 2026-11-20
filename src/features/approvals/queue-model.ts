import type { PendingForm, PendingMessage, PendingReply, QueueView } from "./service";

/** Les trois natures de la file, dans l'ordre d'affichage : une réponse d'abord, quelqu'un attend. */
export type Nature = "reponses" | "messages" | "formulaires";

interface RowBase {
  id: string;
  planId: string;
  /** Campagne de la ligne : le site (voir `campaignOf`). */
  campaignId: string;
  campaign: string;
}

export type QueueRow =
  | (RowBase & { nature: "reponses"; item: PendingReply })
  | (RowBase & { nature: "messages"; item: PendingMessage })
  | (RowBase & { nature: "formulaires"; item: PendingForm });

/**
 * Campagne d'un élément : son site quand il est connu, sinon son plan. Plusieurs plans d'un même site
 * ne forment qu'une campagne à l'écran (retour de Jonathan, 20/11 : la même campagne apparaissait
 * quatre fois).
 */
export function campaignOf(x: { planId: string; campaignId?: string }): string {
  return x.campaignId ?? x.planId;
}

export interface CampaignGroup {
  id: string;
  label: string;
  rows: QueueRow[];
}

type Lists = Pick<QueueView, "messages" | "replies" | "forms">;

/** La file à plat : réponses, puis emails, puis formulaires (pur, testé). */
export function queueRows(view: Lists): QueueRow[] {
  return [
    ...view.replies.map((item): QueueRow => ({
      nature: "reponses",
      id: item.id,
      planId: item.planId,
      campaignId: campaignOf(item),
      campaign: item.campaign,
      item,
    })),
    ...view.messages.map((item): QueueRow => ({
      nature: "messages",
      id: item.id,
      planId: item.planId,
      campaignId: campaignOf(item),
      campaign: item.campaign,
      item,
    })),
    ...view.forms.map((item): QueueRow => ({
      nature: "formulaires",
      id: item.id,
      planId: item.planId,
      campaignId: campaignOf(item),
      campaign: item.campaign,
      item,
    })),
  ];
}

/**
 * Range les lignes par campagne, dans l'ordre des campagnes reçu ; l'ordre des lignes est gardé
 * (réponses d'abord). Une campagne sans ligne n'apparaît pas ; une ligne sans campagne connue forme
 * un dernier groupe sans nom plutôt que de disparaître.
 */
export function groupByCampaign(
  rows: readonly QueueRow[],
  campaigns: readonly { id: string; label: string }[],
): CampaignGroup[] {
  const groups = new Map<string, CampaignGroup>(
    campaigns.map((c) => [c.id, { id: c.id, label: c.label, rows: [] }]),
  );
  for (const r of rows) {
    let g = groups.get(r.campaignId);
    if (!g) {
      g = { id: r.campaignId, label: r.campaign, rows: [] };
      groups.set(r.campaignId, g);
    }
    g.rows.push(r);
  }
  return [...groups.values()].filter((g) => g.rows.length > 0);
}

export interface SelectionSummary {
  total: number;
  /** Ce qu'une approbation enverrait vraiment. */
  approveMessageIds: string[];
  approveReplyIds: string[];
  /** Ce qu'un refus écarterait (un formulaire ne se refuse pas ici). */
  refuseMessageIds: string[];
  refuseReplyIds: string[];
  laterIds: string[];
  /** Ce qu'une approbation laisserait dans la file, et pourquoi. */
  notReady: number;
  noMailbox: number;
  forms: number;
  campaigns: { id: string; label: string; count: number }[];
}

/** Ce que ferait chaque action groupée sur la sélection, avant de cliquer (pur, testé). */
export function selectionSummary(
  rows: readonly QueueRow[],
  picked: ReadonlySet<string>,
  hasMailbox: boolean,
): SelectionSummary {
  const chosen = rows.filter((r) => picked.has(r.id));
  const messages = chosen.filter((r) => r.nature === "messages");
  const replies = chosen.filter((r) => r.nature === "reponses");
  const ready = messages.filter((r) => r.nature === "messages" && r.item.ready);
  const campaigns = new Map<string, { id: string; label: string; count: number }>();
  for (const r of chosen) {
    const c = campaigns.get(r.campaignId) ?? { id: r.campaignId, label: r.campaign, count: 0 };
    c.count++;
    campaigns.set(r.campaignId, c);
  }
  return {
    total: chosen.length,
    approveMessageIds: hasMailbox ? ready.map((r) => r.id) : [],
    approveReplyIds: replies.map((r) => r.id),
    refuseMessageIds: messages.map((r) => r.id),
    refuseReplyIds: replies.map((r) => r.id),
    laterIds: chosen.map((r) => r.id),
    notReady: messages.length - ready.length,
    noMailbox: hasMailbox ? 0 : ready.length,
    forms: chosen.filter((r) => r.nature === "formulaires").length,
    campaigns: [...campaigns.values()],
  };
}

/** L'élément à ouvrir après une décision : le suivant, sinon le précédent, sinon rien (pur, testé). */
export function nextRowId(rows: readonly { id: string }[], id: string): string | null {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return rows[0]?.id ?? null;
  return rows[i + 1]?.id ?? rows[i - 1]?.id ?? null;
}

/** Initiale affichée dans la pastille d'une campagne (le nom du site reste toujours écrit à côté). */
export function campaignInitial(label: string): string {
  return (label.replace(/^www\./, "").match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase();
}
