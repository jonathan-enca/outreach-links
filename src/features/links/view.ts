import type { BadgeTone } from "@/components/ui/badge";
import { t } from "@/lib/messages";

export interface LinkRowView {
  id: string;
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  status: string;
  rel: string | null;
  contextual: boolean | null;
  indexable: boolean | null;
  exactPage: boolean | null;
  anchorFound: string | null;
  checksDone: number;
  nextCheckAt: string | null;
  firstLiveAt: string | null;
  alert: string | null;
}

const L = t.links;

/** Étiquette d'état : « Introuvable » si le lien n'a jamais été vu, « Disparu » s'il l'a été. */
export function statusLabel(r: Pick<LinkRowView, "status" | "firstLiveAt">): {
  label: string;
  tone: BadgeTone;
} {
  switch (r.status) {
    case "live":
      return { label: L.status.live, tone: "success" };
    case "disparu":
      return r.firstLiveAt
        ? { label: L.status.disparu, tone: "danger" }
        : { label: L.status.disparuNeverSeen, tone: "warning" };
    case "injoignable":
      return { label: L.status.injoignable, tone: "warning" };
    default:
      return { label: L.status.a_verifier, tone: "neutral" };
  }
}

/** Détails d'un lien en ligne (type, texte, indexabilité, page), en phrases courtes. */
export function detailFlags(r: LinkRowView): string[] {
  if (r.status !== "live") return [];
  const out: string[] = [];
  if (r.rel) out.push(L.rel[r.rel as keyof typeof L.rel] ?? r.rel);
  if (r.contextual !== null) out.push(r.contextual ? L.flags.contextual : L.flags.notContextual);
  if (r.indexable !== null) out.push(r.indexable ? L.flags.indexable : L.flags.notIndexable);
  if (r.exactPage !== null) out.push(r.exactPage ? L.flags.exactPage : L.flags.otherPage);
  return out;
}

export function alertText(alert: string | null): string | null {
  return alert ? (L.alerts[alert as keyof typeof L.alerts] ?? null) : null;
}
