import { t } from "@/lib/messages";
import { EXCLUSION_REASONS, type ExclusionReason } from "./clean";

export interface CsvBacklink {
  competitorDomain: string;
  sourceDomain: string;
  sourceUrl: string;
  targetUrl: string | null;
  anchor: string | null;
  itemType: string | null;
  dofollow: boolean | null;
  isBroken: boolean | null;
  spamScore: number | null;
  sourceRank: number | null;
  lastSeen: string | null;
  cleanStatus: string;
  reasons: string[];
}

const L = t.backlinks;

export function reasonLabel(code: string): string {
  return (EXCLUSION_REASONS as readonly string[]).includes(code)
    ? L.reasons[code as ExclusionReason]
    : code;
}

/**
 * Cellule CSV : guillemets doublés, et neutralisation de l'injection de formule
 * (une cellule qui commence par = + - @ serait exécutée par un tableur ; les données
 * viennent de pages web tierces, donc non fiables).
 */
export function csvCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "boolean" ? (v ? "oui" : "non") : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Séparateur point-virgule et BOM UTF-8 : s'ouvre correctement dans Excel en français. */
export function backlinksToCsv(rows: readonly CsvBacklink[]): string {
  const lines = [L.csv.headers.map(csvCell).join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.competitorDomain,
        r.sourceDomain,
        r.sourceUrl,
        r.targetUrl,
        r.anchor,
        r.itemType,
        r.dofollow,
        r.isBroken,
        r.spamScore,
        r.sourceRank,
        r.lastSeen ? r.lastSeen.slice(0, 10) : null,
        r.cleanStatus === "garde" ? L.csv.kept : L.csv.excluded,
        r.reasons.map(reasonLabel).join(", "),
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
