import { existsSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/status-badge";
import { NAV_ITEMS } from "@/lib/navigation";
import { STATUS_KEYS, STATUS_TONES, statusLabel } from "@/lib/statuses";
import { t } from "@/lib/messages";

describe("système de statuts", () => {
  it("couvre exactement les statuts de CLAUDE.md 4.2 (cycle prospect + vues inbox)", () => {
    expect(STATUS_KEYS).toHaveLength(16);
    for (const key of STATUS_KEYS) {
      expect(STATUS_TONES[key]).toBeTruthy();
      expect(statusLabel(key)).toBe(t.status[key]);
    }
    expect(Object.keys(t.status).sort()).toEqual([...STATUS_KEYS].sort());
  });

  it("affiche le libellé français dans le badge unique", () => {
    const html = renderToStaticMarkup(createElement(StatusBadge, { status: "lien_pose" }));
    expect(html).toContain("Lien posé");
    expect(html).toContain('data-status="lien_pose"');
  });
});

describe("navigation", () => {
  it("expose les six écrans, chacun avec une page existante et ses textes", () => {
    expect(NAV_ITEMS.map((i) => i.label)).toEqual([
      "Audit",
      "Plan",
      "Lots",
      "Inbox",
      "Liens",
      "Garde-fous",
    ]);
    for (const item of NAV_ITEMS) {
      const page = path.resolve(import.meta.dirname, "..", "app", `.${item.href}`, "page.tsx");
      expect(existsSync(page)).toBe(true);
      expect(t.pages[item.key].emptyTitle).toBeTruthy();
    }
  });
});
