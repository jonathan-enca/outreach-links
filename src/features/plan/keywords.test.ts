import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { collectKeywordChoices, loadKeywordChoice, saveTargetKeywords } from "./keywords";

const AUDIT = "11111111-1111-4111-8111-111111111111";

const pages = [
  {
    audit_id: AUDIT,
    url: "https://mega-coloring.com/licorne",
    keywords_json: [
      { keyword: "Coloriage  Licorne", position: 7, volume: 9000 },
      { keyword: "licorne a imprimer", position: 12, volume: 500 },
    ],
  },
  {
    audit_id: AUDIT,
    url: "https://mega-coloring.com/chat",
    keywords_json: [
      { keyword: "coloriage licorne", position: 4, volume: 9000 },
      { keyword: "coloriage chat", position: 15, volume: 2000 },
      { keyword: 42, position: 3 },
    ],
  },
];

function setup(goal: string, selected: string[] = []) {
  return fakeSupabase({
    audits: [{ id: AUDIT, workspace_id: "ws-1", site_id: "s1" }],
    sites: [{ id: "s1", domain: "mega-coloring.com", goal, target_keywords: selected }],
    audit_pages: pages,
  });
}

describe("collectKeywordChoices", () => {
  it("un exemplaire par mot-clé (meilleure position), trié par volume puis position", () => {
    const out = collectKeywordChoices(pages);
    expect(out.map((c) => c.keyword)).toEqual([
      "coloriage licorne",
      "coloriage chat",
      "licorne a imprimer",
    ]);
    expect(out[0]).toMatchObject({ position: 4, url: "https://mega-coloring.com/chat" });
  });
  it("ignore les lignes illisibles", () => {
    expect(collectKeywordChoices([{ url: "u", keywords_json: null }])).toEqual([]);
    expect(collectKeywordChoices([{ url: "u", keywords_json: [{ keyword: "ab" }] }])).toEqual([]);
  });
});

describe("choix des mots-clés dans le Plan de liens (MT.2a)", () => {
  it("lit les mots-clés réels de l'audit et l'objectif, sans aucun appel externe", async () => {
    const { client } = setup("mots_cles", ["coloriage chat"]);
    const view = await loadKeywordChoice(client, AUDIT);
    expect(view).toMatchObject({
      goal: "mots_cles",
      selected: ["coloriage chat"],
      maxSelected: 10,
    });
    expect(view!.choices).toHaveLength(3);
  });

  it("en autorité générale : rien à choisir, l'enregistrement est refusé", async () => {
    const { client, tables } = setup("autorite_generale");
    expect((await loadKeywordChoice(client, AUDIT))!.goal).toBe("autorite_generale");
    const r = await saveTargetKeywords(client, AUDIT, ["coloriage chat"]);
    expect(r.status).toBe("error");
    expect(tables.sites![0]!.target_keywords).toEqual([]);
  });

  it("enregistre des mots-clés réels, dédoublonnés et normalisés", async () => {
    const { client, tables } = setup("mots_cles");
    const r = await saveTargetKeywords(client, AUDIT, ["Coloriage  chat", "coloriage chat"]);
    expect(r.status).toBe("ok");
    expect(tables.sites![0]!.target_keywords).toEqual(["coloriage chat"]);
    expect(tables.events!.map((e) => e.type)).toContain("site.target_keywords_set");
  });

  it("refuse un mot-clé qui n'est pas dans ceux du site (pas de saisie libre)", async () => {
    const { client, tables } = setup("mots_cles");
    const r = await saveTargetKeywords(client, AUDIT, ["acheter des liens"]);
    expect(r.status).toBe("error");
    expect(tables.sites![0]!.target_keywords).toEqual([]);
  });

  it("décocher tout est permis", async () => {
    const { client, tables } = setup("mots_cles", ["coloriage chat"]);
    const r = await saveTargetKeywords(client, AUDIT, []);
    expect(r).toMatchObject({ status: "ok" });
    expect(tables.sites![0]!.target_keywords).toEqual([]);
  });

  it("refuse plus de 10 mots-clés", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      keyword: `mot clé ${i}`,
      position: 5,
      volume: 100,
    }));
    const { client } = fakeSupabase({
      audits: [{ id: AUDIT, workspace_id: "ws-1", site_id: "s1" }],
      sites: [{ id: "s1", goal: "mots_cles", target_keywords: [] }],
      audit_pages: [{ audit_id: AUDIT, url: "u", keywords_json: many }],
    });
    const r = await saveTargetKeywords(
      client,
      AUDIT,
      many.map((m) => m.keyword),
    );
    expect(r.status).toBe("error");
  });
});
