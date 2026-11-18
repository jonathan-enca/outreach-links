import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AUTO_LIMITS, type AutoStop } from "@/features/qualification/background";
import { t } from "@/lib/messages";
import type { TargetsView } from "./service";
import { autoStopLine, LiveBanner, MoreSites } from "./targets-screen";

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
const idle = async () => ({ status: "idle" as const });
const card = (stock: number, more: More) =>
  renderToStaticMarkup(createElement(MoreSites, { funnel: funnel(stock), more, start: idle }));
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
  it("le seul bouton s'appelle « Continuer la recherche »", () => {
    expect(t.targets.more.button).toBe("Continuer la recherche");
  });
});

describe("phrase d'arrêt (valeurs réelles de `auto_stop`)", () => {
  const minutes = AUTO_LIMITS.maxMs / 60_000;
  it("une phrase pour chaque raison d'arrêt de `decideNext`, avec le nombre de sites non lus", () => {
    const stops: AutoStop[] = ["reserve_epuisee", "budget", "duree", "erreur", "rendement_faible"];
    for (const stop of stops) {
      expect(autoStopLine(auto({ stop }), 211), stop).toContain("211 sites");
    }
  });
  it("durée : la vraie limite (45 minutes), jamais un chiffre écrit en dur", () => {
    expect(minutes).toBe(45);
    expect(autoStopLine(auto({ stop: "duree" }), 211)).toBe(
      "La lecture s'est arrêtée au bout de 45 minutes, sa durée maximale : 211 sites ne sont pas lus.",
    );
  });
  it("limite de la campagne : dite sans parler d'argent", () => {
    expect(autoStopLine(auto({ stop: "budget" }), 1)).toBe(
      "La lecture s'est arrêtée pour cette campagne : 1 site n'est pas lu.",
    );
  });
  it("erreur (chaîne en échec ou arrêt « erreur ») : ce qui s'est passé, ce qui est conservé", () => {
    const line = autoStopLine(auto({ status: "echoue", stop: "erreur" }), 388);
    expect(line).toContain("erreur de notre côté : 388 sites ne sont pas lus");
    expect(autoStopLine(auto({ stop: "erreur" }), 388)).toBe(line);
  });
  it("plus rien à lire : « tous les sites trouvés ont été lus », quelle que soit la raison", () => {
    expect(autoStopLine(auto({ stop: "reserve_epuisee" }), 0)).toBe(
      t.targets.more.auto.stop.allRead,
    );
    expect(autoStopLine(auto({ stop: "duree" }), 0)).toBe(t.targets.more.auto.stop.allRead);
  });
  it("lecture jamais lancée ou en cours : rien à dire", () => {
    expect(autoStopLine(auto({ status: "aucun" }), 120)).toBeNull();
    expect(autoStopLine(auto({ status: "en_cours" }), 120)).toBeNull();
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
  it("après un arrêt avec des sites non lus : la phrase, puis un seul bouton secondaire", () => {
    const out = card(640, { status: "termine", added: 5, auto: auto({ stop: "budget" }) });
    expect(out).toContain("640 sites ne sont pas lus");
    expect(out.match(/<button/g)).toHaveLength(1);
    expect(out).toContain("Continuer la recherche");
    expect(out).not.toMatch(/\$|USD|budget/i);
  });
  it("après un arrêt, le bandeau ne dit pas « terminée » s'il reste des sites à lire", () => {
    const stopped: More = { status: "termine", added: 5, auto: auto({ stop: "duree" }) };
    expect(banner(211, stopped)).toContain("s&#x27;est arrêtée avant la fin");
    expect(banner(0, { ...stopped, auto: auto({ stop: "reserve_epuisee" }) })).toContain(
      "Recherche terminée",
    );
  });
  it("tout est lu : pas de bouton ; réserve vide sans lecture : pas de carte", () => {
    const done = card(0, { status: "termine", added: 3, auto: auto({ stop: "reserve_epuisee" }) });
    expect(done).toContain("tous les sites trouvés ont été lus");
    expect(done).not.toContain("<button");
    expect(card(0, { status: "aucun", added: null, auto: auto({ status: "aucun" }) })).toBe("");
  });
});
