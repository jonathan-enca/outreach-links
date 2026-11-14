import { hostOf } from "@/features/audits/excluded-domains";
import type { BacklinksListResult } from "@/lib/dataforseo";
import type { RawBacklink } from "./clean";

type Item = NonNullable<BacklinksListResult["items"]>[number];

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const int = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;

/** "2025-06-02 00:00:00 +00:00" -> ISO ; null si illisible. */
export function parseSeen(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s.replace(" +00:00", "Z").replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface StoredBacklink extends RawBacklink {
  firstSeen: string | null;
  lastSeen: string | null;
}

/** Réponse DataForSEO (backlinks/backlinks) -> lignes normalisées. Ignore les lignes sans source. */
export function normalizeBacklinkItems(
  items: readonly Item[] | null | undefined,
  competitorDomain: string,
): StoredBacklink[] {
  const out: StoredBacklink[] = [];
  for (const it of items ?? []) {
    const sourceUrl = str(it.url_from);
    const sourceDomain = hostOf(it.domain_from || sourceUrl || "");
    if (!sourceUrl || !sourceDomain) continue;
    const extra = it as Record<string, unknown>;
    const spam = int(it.backlink_spam_score);
    out.push({
      competitorDomain,
      sourceDomain,
      sourceUrl,
      targetUrl: str(it.url_to),
      anchor: str(it.anchor),
      itemType: str(extra.item_type) ?? str(it.type),
      dofollow: it.dofollow ?? null,
      isBroken: it.is_broken ?? null,
      spamScore: spam === null ? null : Math.min(100, Math.max(0, spam)),
      sourceRank: int(extra.domain_from_rank) ?? int(it.page_from_rank) ?? int(it.rank),
      firstSeen: parseSeen(it.first_seen),
      lastSeen: parseSeen(it.last_seen),
    });
  }
  return out;
}
