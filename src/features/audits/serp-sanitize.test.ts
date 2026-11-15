import { describe, expect, it } from "vitest";
import { isExcludedDomain, isValidHost } from "./excluded-domains";
import { resolveRedirect, serpEntries } from "./discover";

/** Valeurs réelles vues dans le premier audit de production (15/11/2026). */
describe("SERP : seuls de vrais domaines deviennent des concurrents", () => {
  it("reconnaît les noms de domaine valides et refuse le texte de la page", () => {
    for (const ok of [
      "crayola.com",
      "go.library.illinois.edu",
      "you-color.com",
      "coloriagegratuit.fr",
      "creativecenter.brother",
    ]) {
      expect(isValidHost(ok), ok).toBe(true);
    }
    for (const bad of [
      "il y a 3 mois",
      "plus de 114,7 k abonnés",
      "il y a 1 an",
      "il y a 6 jours",
      "localhost",
      "",
      "a b.fr",
      "exemple",
    ]) {
      expect(isValidHost(bad), bad).toBe(false);
    }
  });

  it("une redirection Google dont le fil d'Ariane est une date n'est pas un site", () => {
    expect(
      resolveRedirect({
        url: "https://www.google.com/goto?url=x",
        domain: "www.google.com",
        breadcrumb: "il y a 3 mois › vidéo",
      }),
    ).toBeNull();
    expect(
      resolveRedirect({
        url: "https://www.google.com/goto?url=x",
        domain: "www.google.com",
        breadcrumb: "https://www.exemple.fr › guide › page",
      }),
    ).toMatchObject({ domain: "exemple.fr", exact: false });
  });

  it("serpEntries ignore les éléments sans domaine valide", () => {
    const entries = serpEntries({
      items: [
        {
          type: "organic",
          rank_group: 1,
          url: "https://crayola.com/x",
          domain: "www.crayola.com",
          title: "a",
        },
        {
          type: "organic",
          rank_group: 2,
          url: "https://www.google.com/goto?q=1",
          domain: "www.google.com",
          breadcrumb: "plus de 114,7 k abonnés",
          title: "b",
        },
      ],
    } as never);
    expect(entries.map((e) => e.domain)).toEqual(["crayola.com"]);
  });

  it("écarte les hébergeurs évidents", () => {
    expect(isExcludedDomain("aut.crayocom.cloud.sitefinity.com")).toBe(true);
    expect(isExcludedDomain("dropbox.com")).toBe(true);
    expect(isExcludedDomain("coloringlib.com")).toBe(false);
  });
});
