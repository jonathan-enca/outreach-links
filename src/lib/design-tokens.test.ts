import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fr } from "../../messages/fr";

const css = readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8");

/** Lit les jetons `--nom: #hex` d'un bloc (`:root` ou `.surface-night`). */
function tokens(selector: string): Record<string, string> {
  const block = css.split(selector + " {")[1]?.split("}")[0] ?? "";
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  );
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Paires de texte lisible (WCAG AA : 4,5 pour le texte courant).
const PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["primary-foreground", "primary"],
  ["primary", "background"],
  ["primary", "card"],
  ["info", "card"],
  ["warning", "card"],
  ["success", "card"],
  ["danger", "card"],
  ["highlight-foreground", "highlight"],
];

describe("jetons de la direction artistique", () => {
  const light = tokens(":root");
  const night = tokens(".surface-night");

  it.each(PAIRS)("clair : %s sur %s atteint 4,5:1", (fg, bg) => {
    expect(contrast(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PAIRS.filter(([, bg]) => bg !== "highlight"))(
    "nuit : %s sur %s atteint 4,5:1",
    (fg, bg) => {
      if (!night[fg] || !night[bg]) return; // jeton hérité du clair (ex. highlight)
      expect(contrast(night[fg], night[bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("le survol d'un bouton principal reste lisible, en clair comme en nuit", () => {
    expect(contrast(light["primary-foreground"], light["primary-hover"])).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(night["primary-foreground"], night["primary-hover"])).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("la surface nuit redéfinit tous les jetons sémantiques", () => {
    for (const key of [
      "background",
      "foreground",
      "card",
      "muted",
      "border",
      "primary",
      "primary-hover",
      "ring",
    ]) {
      expect(night[key], key).toBeDefined();
    }
  });
});

describe("nom de marque", () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return sources(full);
      return /\.(ts|tsx|css)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
    });
  }

  it("n'est écrit qu'une fois, dans messages/fr.ts", () => {
    const name = fr.app.name.split(".")[0].toLowerCase();
    const hits = sources(path.resolve(import.meta.dirname, "..")).filter((f) =>
      readFileSync(f, "utf8").toLowerCase().includes(name),
    );
    expect(hits).toEqual([]);
  });
});
