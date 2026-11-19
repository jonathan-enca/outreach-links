import { describe, expect, it } from "vitest";
import {
  formatTrackingMarkdown,
  pisteFromTactics,
  pisteOf,
  summarizeTracking,
  SANS_PISTE,
  type TrackedTarget,
} from "./tracking";
import { joinTracking } from "./tracking-report";

const t = (over: Partial<TrackedTarget> = {}): TrackedTarget => ({
  piste: "citation",
  niveau: 0,
  siteType: "blog",
  sent: false,
  replied: false,
  linked: false,
  ...over,
});

describe("piste de découverte", () => {
  it("prend la source la plus forte, dans l'ordre de PISTES", () => {
    expect(pisteOf([{ source: "serp" }, { source: "lien_mort" }], ["inconnus"])).toBe("lien_mort");
    expect(pisteOf([{ source: "content" }, { source: "citation" }], ["ressources"])).toBe(
      "citation",
    );
    expect(pisteOf([{ source: "intersection" }], ["inconnus"])).toBe("intersection");
  });

  it("n'est jamais vide : à défaut de source, la tactique suffit", () => {
    expect(pisteOf([], ["mentions"])).toBe("mention");
    expect(pisteOf([], ["ressources"])).toBe("citation");
    expect(pisteOf([], ["inconnus"])).toBe("serp");
    expect(pisteFromTactics([])).toBe("serp");
  });
});

describe("summarizeTracking", () => {
  const rows: TrackedTarget[] = [
    t({ piste: "citation", niveau: 0, siteType: "blog", sent: true, replied: true, linked: true }),
    t({ piste: "citation", niveau: 0, siteType: "mairie", sent: true }),
    t({ piste: "lien_mort", niveau: 1, siteType: "blog", sent: true, replied: true }),
    t({ piste: null, niveau: 1, siteType: null }),
  ];

  it("compte cibles, envois, réponses et liens par piste", () => {
    const lines = summarizeTracking(rows, "piste");
    expect(lines.find((l) => l.key === "citation")).toEqual({
      key: "citation",
      cibles: 2,
      envois: 2,
      reponses: 1,
      liens: 1,
    });
    expect(lines.find((l) => l.key === SANS_PISTE)?.cibles).toBe(1);
  });

  it("trie les niveaux par ordre croissant", () => {
    expect(summarizeTracking(rows, "niveau").map((l) => l.key)).toEqual(["0", "1"]);
  });

  it("compte par type de site, type non jugé compris", () => {
    const lines = summarizeTracking(rows, "siteType");
    expect(lines[0]).toMatchObject({ key: "blog", cibles: 2, reponses: 2, liens: 1 });
    expect(lines.some((l) => l.key === "(type non jugé)")).toBe(true);
  });

  it("une liste vide donne des tableaux vides mais valides", () => {
    const md = formatTrackingMarkdown([]);
    expect(md).toContain("## Par piste (0 cibles)");
    expect(md.split("\n").filter((l) => l.startsWith("|---")).length).toBe(3);
  });

  it("le tableau Markdown affiche les libellés et les taux", () => {
    const md = formatTrackingMarkdown(rows);
    expect(md).toContain("Cite déjà une ressource comparable");
    expect(md).toContain("Boule de neige, niveau 1");
    expect(md).toContain("| Cite déjà une ressource comparable | 2 | 2 | 1 | 1 | 50 % | 50 % |");
  });
});

describe("joinTracking", () => {
  const base = {
    targets: [
      {
        id: "q1",
        audit_id: "a1",
        domain: "ecole.fr",
        piste: "citation",
        niveau: 0,
        site_type: "ecole",
      },
      {
        id: "q2",
        audit_id: "a1",
        domain: "ferme.com",
        piste: "lien_mort",
        niveau: 1,
        site_type: null,
      },
      { id: "q3", audit_id: "a2", domain: "ecole.fr", piste: "serp", niveau: 0, site_type: "blog" },
    ],
    plans: [
      { id: "p1", audit_id: "a1" },
      { id: "p2", audit_id: "a2" },
    ],
    items: [
      { id: "i1", plan_id: "p1", source_domain: "ecole.fr" },
      { id: "i2", plan_id: "p1", source_domain: "ferme.com" },
      { id: "i3", plan_id: "p2", source_domain: "ecole.fr" },
    ],
    drafts: [
      { id: "d1", plan_item_id: "i1" },
      { id: "d2", plan_item_id: "i2" },
    ],
    sent: [{ id: "s1", draft_id: "d1" }],
    replies: [{ sent_message_id: "s1" }],
    liveLinks: [{ plan_item_id: "i1" }],
  };

  it("rattache envoi, réponse et lien à la bonne cible, dans le bon audit", () => {
    const out = joinTracking(base);
    expect(out[0]).toEqual({
      piste: "citation",
      niveau: 0,
      siteType: "ecole",
      sent: true,
      replied: true,
      linked: true,
    });
    // Pas d'envoi pour ferme.com : un message n'est pas un envoi.
    expect(out[1]).toMatchObject({ sent: false, replied: false, linked: false });
    // Même domaine dans un autre audit : rien n'est partagé.
    expect(out[2]).toMatchObject({ sent: false, linked: false, siteType: "blog" });
  });

  it("une cible sans élément de plan n'a rien d'envoyé", () => {
    const out = joinTracking({ ...base, items: [], drafts: [] });
    expect(out.every((x) => !x.sent && !x.linked)).toBe(true);
  });
});
