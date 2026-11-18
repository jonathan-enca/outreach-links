import { describe, expect, it } from "vitest";
import { catalogueCap, pickCatalogueUrls } from "./catalogue";
import { DRAFT_LIMITS } from "./limits";
import { shortlistCatalogue, words, type CatalogueEntry } from "./shortlist";

const entry = (slug: string, title = "", description = ""): CatalogueEntry => ({
  url: `https://site.example/${slug}`,
  title,
  description,
});

describe("words", () => {
  it("ignore les mots vides, les accents, les pluriels simples et les nombres", () => {
    expect(words("Les Écoles et les 3 Jardins d'enfants")).toEqual(["ecole", "jardin", "enfant"]);
  });
});

describe("présélection du catalogue (MC.6e)", () => {
  const many: CatalogueEntry[] = [
    entry("recettes/gateau-chocolat", "Gâteau au chocolat facile"),
    entry("voitures/course", "Voitures de course à imprimer"),
    entry("paques/lapin", "Lapin de Pâques"),
    ...Array.from({ length: 120 }, (_, i) => entry(`divers/page-${i}`, `Divers numéro ${i}`)),
  ];

  it("garde tout un petit catalogue", () => {
    expect(
      shortlistCatalogue({ url: "https://x.fr/a", title: "a" }, many.slice(0, 10), 25),
    ).toHaveLength(10);
  });

  it("retrouve les pages qui partagent des mots avec la cible, même absentes d'un échantillon de tête", () => {
    const out = shortlistCatalogue(
      {
        url: "https://blog.example/idees-gouter",
        title: "Idées de gâteaux au chocolat pour le goûter",
        text: "Une recette de gâteau au chocolat pour les enfants.",
      },
      many,
      25,
    );
    expect(out.length).toBeLessThanOrEqual(25);
    expect(out[0]!.url).toContain("gateau-chocolat");
  });

  it("utilise les mots de l'adresse quand la page du site n'a pas de titre", () => {
    const out = shortlistCatalogue(
      { url: "https://blog.example/voitures-de-course", title: "Course" },
      [...many, entry("voitures-de-course-a-colorier")],
      25,
    );
    expect(out.map((p) => p.url)).toContain("https://site.example/voitures-de-course-a-colorier");
  });

  it("montre toujours quelques pages même quand rien n'a de mot commun", () => {
    const out = shortlistCatalogue({ url: "https://z.example/xyz", title: "Zzz qqq" }, many, 25);
    expect(out.length).toBeGreaterThanOrEqual(8);
  });
});

describe("plafond du catalogue par palier", () => {
  it("100, 200, 500 puis 1 000 pages", () => {
    expect(
      (["gratuit", "starter", "pro", "business"] as const).map((p) => catalogueCap(p)),
    ).toEqual([100, 200, 500, 1_000]);
    expect(DRAFT_LIMITS.shortlistPages).toBeGreaterThanOrEqual(20);
    expect(DRAFT_LIMITS.shortlistPages).toBeLessThanOrEqual(30);
  });
});

describe("plafond du catalogue : une page sur N", () => {
  it("garde des pages de bout en bout du sitemap, pas seulement sa tête", () => {
    const all = Array.from({ length: 300 }, (_, i) => `https://site.example/rubrique/sujet-${i}`);
    const out = pickCatalogueUrls("site.example", all, "fr", 100);
    expect(out).toHaveLength(100);
    expect(out[0]).toBe("https://site.example/rubrique/sujet-0");
    expect(out.at(-1)).toMatch(/sujet-29\d$/);
  });
});
