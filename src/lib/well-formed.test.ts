import { describe, expect, it } from "vitest";
import { QUALIFY_LIMITS } from "@/features/qualification/limits";
import { snapshotOf } from "@/features/qualification/page";
import type { PageRead } from "@/features/triage/page-reader";
import { deepWellFormed, safeStep, wellFormed } from "./well-formed";

const emoji = "🎨";
const half = emoji.slice(0, 1);
const ok = (s: string) => (s as unknown as { isWellFormed: () => boolean }).isWellFormed();

describe("texte bien formé dans l'état des steps", () => {
  it("une demi-paire isolée est remplacée, le reste est inchangé", () => {
    expect(ok(`abc${half}`)).toBe(false);
    expect(wellFormed(`abc${half}`)).toBe("abc�");
    expect(wellFormed(`abc${emoji}`)).toBe(`abc${emoji}`);
    expect(wellFormed("été")).toBe("été");
  });

  it("toutes les chaînes d'une valeur, clés comprises", () => {
    const out = deepWellFormed({ a: [`x${half}`, 1, null], [`k${half}`]: { b: `y${half}` } });
    expect(ok(JSON.stringify(out))).toBe(true);
    expect(out.a[1]).toBe(1);
    expect(deepWellFormed(null)).toBeNull();
  });

  it("l'extrait d'une page coupé au milieu d'un émoji reste bien formé (run réel du 17/11)", () => {
    const limit = QUALIFY_LIMITS.excerptChars;
    const text = `${"a".repeat(limit - 1)}${emoji} suite`;
    const read = {
      url: "https://exemple.fr/",
      status: 200,
      lang: "fr",
      title: `${"t".repeat(199)}${emoji}`,
      description: "",
      headings: [`${"h".repeat(119)}${emoji}`],
      text,
      links: [],
      mailtos: [],
      hasContactForm: false,
    } as unknown as PageRead;
    const snap = snapshotOf(read);
    expect(ok(JSON.stringify(snap))).toBe(true);
    expect(snap.excerpt).toHaveLength(limit);
  });

  it("le résultat d'un step est rendu bien formé avant d'être mémorisé", async () => {
    const stored: unknown[] = [];
    const step = safeStep(async (_id, fn) => {
      const v = await fn();
      stored.push(v);
      return v;
    });
    const out = await step("lecture", async () => ({ excerpt: `page${half}` }));
    expect(out.excerpt).toBe("page�");
    expect(ok(JSON.stringify(stored))).toBe(true);
  });
});
