import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { t } from "@/lib/messages";
import type { TargetsView } from "./service";
import { LiveBanner, MoreSites } from "./targets-screen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));

type More = TargetsView["more"];
type Auto = More["auto"];
const auto = (a: Partial<Auto> = {}): Auto => ({
  status: "termine",
  added: 4,
  lots: 2,
  startedAt: null,
  costUsd: 0.2,
  stop: null,
  ...a,
});
const funnel = (stock: number) =>
  ({
    candidates: 1400,
    preRead: [],
    preReadTotal: 0,
    pagesRead: 500,
    judged: 300,
    relevant: 80,
    shortlist: 60,
    stock,
  }) satisfies NonNullable<TargetsView["funnel"]>;
const card = (stock: number, more: More) =>
  renderToStaticMarkup(createElement(MoreSites, { funnel: funnel(stock), more }));
const banner = (stock: number, more: More) =>
  renderToStaticMarkup(
    createElement(LiveBanner, {
      view: { funnel: funnel(stock), more, cards: [{ id: "a" }, { id: "b" }] } as never,
      hidden: 0,
      onReveal: () => {},
    }),
  );

/** Tout texte d'une branche de messages, fonctions appelées avec des nombres. */
function texts(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (typeof node === "function")
    return [String(node(3, 45)), String(node(1, 45)), String(node(0, 45))];
  if (node && typeof node === "object") return Object.values(node).flatMap(texts);
  return [];
}

describe("textes de la lecture des autres sites", () => {
  it("ni jargon ni argent : pas de « lot », de budget, de coût, de rendement, de volume", () => {
    const all = [...texts(t.targets.live), ...texts(t.targets.more)];
    expect(all.length).toBeGreaterThan(20);
    for (const s of all) {
      expect(s).not.toMatch(
        /\blots?\b|budget|co[uû]t|dollar|euro|USD|€|\$|rendement|volume|exigence|factur|pay/i,
      );
    }
  });
});

describe("carte et bandeau", () => {
  it("pendant la lecture automatique : aucun bouton, « N restent à lire », une barre d'avancement", () => {
    const more: More = { status: "en_cours", added: null, auto: auto({ status: "en_cours" }) };
    expect(card(412, more)).toBe("");
    const out = banner(412, more);
    expect(out).not.toContain("<button");
    expect(out).toContain("412 restent à lire. La liste se met à jour toute seule.");
    expect(out).toMatch(/role="progressbar"[^>]*aria-valuenow="70"/);
    expect(out).toContain("988 sites examinés sur 1400");
    expect(out).toMatch(/role="status"[^>]*>La recherche continue\./);
  });
  it("après un arrêt avec des sites non lus : ce qui reste à lire, sans bouton ni phrase d'arrêt", () => {
    const out = card(640, { status: "termine", added: 5, auto: auto({ stop: "budget" }) });
    expect(out).toContain("Il reste 640 sites à lire.");
    expect(out).not.toContain("<button");
    expect(out).not.toContain("Continuer la recherche");
    expect(out).not.toMatch(/\$|USD|budget/i);
  });
  it("après un arrêt, le bandeau ne dit pas « terminée » s'il reste des sites à lire", () => {
    const stopped: More = { status: "termine", added: 5, auto: auto({ stop: "duree" }) };
    expect(banner(211, stopped)).toContain("s&#x27;est arrêtée avant la fin");
    expect(banner(0, { ...stopped, auto: auto({ stop: "reserve_epuisee" }) })).toContain(
      "Recherche terminée",
    );
  });
  it("tout est lu après une lecture : pas de carte ; sans lecture : pas de carte", () => {
    expect(card(0, { status: "termine", added: 3, auto: auto({ stop: "reserve_epuisee" }) })).toBe(
      "",
    );
    expect(card(0, { status: "aucun", added: null, auto: auto({ status: "aucun" }) })).toBe("");
  });
});
