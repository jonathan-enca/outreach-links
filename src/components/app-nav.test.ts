import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "./app-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/cibles" }));

const html = renderToStaticMarkup(
  createElement(AppNav, {
    sites: [{ id: "s1", domain: "exemple.fr" }],
    currentSite: "s1",
    counts: { toValidate: 11, conversations: 0 },
  }),
);

describe("menu du parcours (maquette du 20/11)", () => {
  it("un seul groupe Prospection : pas de groupe Messagerie", () => {
    expect(html).toContain("Prospection");
    expect(html).not.toContain("Messagerie");
  });
  it("trois étapes numérotées : Cibles, À approuver, Envois", () => {
    const labels = [...html.matchAll(/<span class="flex-1 truncate">([^<]+)<\/span>/g)].map(
      (m) => m[1],
    );
    expect(labels.filter((l) => ["Cibles", "À approuver", "Envois"].includes(l))).toEqual([
      "Cibles",
      "À approuver",
      "Envois",
    ]);
    expect(html).not.toContain("Mails envoyés");
    expect(html).not.toContain("À valider");
  });
  it("Campagnes reste au-dessus, sans numéro d'étape", () => {
    const campagnes = html.indexOf("Campagnes");
    const cibles = html.indexOf("Cibles");
    expect(campagnes).toBeGreaterThan(-1);
    expect(campagnes).toBeLessThan(cibles);
  });
  it("le compteur « à approuver » suit les messages à valider", () => {
    expect(html).toMatch(/>11</);
  });
});
