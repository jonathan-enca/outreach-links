import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { AnchorProfile } from "@/features/profile/compute";
import { moveId, suggestAnchor } from "./anchors";
import { loadPlan, moveSelection, setSelection, validatePlan } from "./service";

const AUDIT = "11111111-1111-4111-8111-111111111111";
const WS = "22222222-2222-4222-8222-222222222222";

const profile = (
  over: Partial<AnchorProfile> = {},
  shares: Partial<AnchorProfile["shares"]> = {},
): AnchorProfile => ({
  sampleSize: 40,
  shares: { marque: 0.3, url: 0.1, generique: 0.1, autre: 0.1, vide: 0.4, ...shares },
  top: [],
  dofollowShare: 0.8,
  overOptimized: false,
  ...over,
});

describe("suggestAnchor", () => {
  const base = { domain: "mega-coloring.com", keyword: "coloriage licorne" };
  it("mention de marque et annuaire : marque", () => {
    expect(suggestAnchor({ ...base, type: "mention_marque", profile: profile() })).toEqual({
      kind: "marque",
      text: "mega coloring",
    });
    expect(suggestAnchor({ ...base, type: "annuaire", profile: profile() }).kind).toBe("marque");
  });
  it("profil sain : ancre descriptive", () => {
    expect(suggestAnchor({ ...base, type: "page_ressources", profile: profile() })).toEqual({
      kind: "descriptive",
      text: "coloriage licorne",
    });
  });
  it("profil sur-optimisé ou trop descriptif : pas d'ancre à mot-clé", () => {
    expect(
      suggestAnchor({ ...base, type: "lien_mort", profile: profile({ overOptimized: true }) }).kind,
    ).toBe("marque");
    expect(
      suggestAnchor({ ...base, type: "lien_mort", profile: profile({}, { autre: 0.4 }) }).kind,
    ).not.toBe("descriptive");
  });
  it("marque déjà dominante : adresse du site ; profil absent ou petit : marque", () => {
    expect(
      suggestAnchor({
        ...base,
        type: "lien_mort",
        profile: profile({ overOptimized: true }, { marque: 0.8 }),
      }).kind,
    ).toBe("url");
    expect(suggestAnchor({ ...base, type: "lien_mort", profile: null }).kind).toBe("marque");
    expect(
      suggestAnchor({ ...base, type: "lien_mort", profile: profile({ sampleSize: 2 }) }).kind,
    ).toBe("marque");
  });
  it("sans mot-clé : jamais descriptive", () => {
    expect(
      suggestAnchor({
        domain: base.domain,
        type: "ecart_domaines",
        keyword: null,
        profile: profile(),
      }).kind,
    ).not.toBe("descriptive");
  });
});

describe("moveId", () => {
  it("déplace d'un cran, sans sortir des bornes", () => {
    expect(moveId(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(moveId(["a", "b"], "a", "up")).toEqual(["a", "b"]);
    expect(moveId(["a", "b"], "z", "down")).toEqual(["a", "b"]);
  });
});

const opp = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  audit_id: AUDIT,
  type: "page_ressources",
  source_domain: `${id}.fr`,
  source_url: null,
  target_page_url: "https://mega-coloring.com/licorne",
  expected_link_type: "ressource",
  offer: "des coloriages",
  rationale: "r",
  priority: "haute",
  priority_score: 80,
  status: "nouveau",
  plan_position: null,
  broken_url: null,
  ...over,
});
const tables = () => ({
  audits: [
    {
      id: AUDIT,
      workspace_id: WS,
      site_id: "s1",
      opportunities_status: "termine",
      profile_data: { anchors: profile() },
      site_id2: 1,
    },
  ],
  sites: [{ id: "s1", domain: "mega-coloring.com" }],
  link_opportunities: [
    opp("a"),
    opp("b", { priority_score: 70 }),
    opp("c", { priority_score: 60 }),
  ],
  audit_pages: [
    {
      audit_id: AUDIT,
      url: "https://mega-coloring.com/licorne",
      is_priority: true,
      keywords_json: [{ keyword: "coloriage licorne" }],
    },
  ],
  link_plans: [],
  events: [],
});

describe("service du plan", () => {
  it("loadPlan : ancres suggérées, ordre par score", async () => {
    const { client } = fakeSupabase(tables());
    const v = await loadPlan(client, AUDIT);
    expect(v?.ready).toBe(true);
    expect(v?.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(v?.items[0]?.anchor.kind).toBe("descriptive");
  });

  it("retenir, ordonner, écarter", async () => {
    const x = fakeSupabase(tables());
    const svc = () => x.client;
    for (const id of ["a", "b", "c"])
      expect((await setSelection(x.client, AUDIT, id, true, svc)).status).toBe("ok");
    const pos = () => x.tables.link_opportunities!.map((o) => [o.id, o.plan_position]);
    expect(pos()).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    await moveSelection(x.client, AUDIT, "c", "up", svc);
    expect(pos()).toEqual([
      ["a", 1],
      ["b", 3],
      ["c", 2],
    ]);
    await setSelection(x.client, AUDIT, "a", false, svc);
    expect(x.tables.link_opportunities![0]).toMatchObject({
      status: "ecarte",
      plan_position: null,
    });
    expect((await moveSelection(x.client, AUDIT, "a", "up", svc)).status).toBe("error");
  });

  it("refuse sans connexion ou sans opportunités terminées", async () => {
    const anon = fakeSupabase(tables(), { userId: null });
    expect((await setSelection(anon.client, AUDIT, "a", true, () => anon.client)).status).toBe(
      "error",
    );
    const t = tables();
    t.audits[0]!.opportunities_status = "aucun";
    const x = fakeSupabase(t);
    expect((await setSelection(x.client, AUDIT, "a", true, () => x.client)).status).toBe("error");
  });

  it("validatePlan : exige une sélection, envoie les retenues dans l'ordre à la fonction atomique", async () => {
    let call: {
      name: string;
      args: { p_items: { opportunity_id: string; anchor_text: string }[] };
    } | null = null;
    const x = fakeSupabase(tables(), {
      rpc: (name, args) => {
        call = { name, args: args as never };
        return { data: [{ plan_id: "p", version: 3 }], error: null };
      },
    });
    const svc = () => x.client;
    expect((await validatePlan(x.client, AUDIT, svc)).status).toBe("error");
    await setSelection(x.client, AUDIT, "b", true, svc);
    await setSelection(x.client, AUDIT, "a", true, svc);
    const r = await validatePlan(x.client, AUDIT, svc);
    expect(r).toMatchObject({ status: "ok" });
    expect(r.message).toContain("3");
    expect(call!.name).toBe("create_link_plan");
    expect(call!.args.p_items.map((i) => i.opportunity_id)).toEqual(["b", "a"]);
    expect(x.tables.events!.some((e) => e.type === "plan.validated")).toBe(true);
  });

  it("validatePlan : erreur de la base = erreur claire, pas d'événement", async () => {
    const x = fakeSupabase(tables(), { rpc: () => ({ data: null, error: { message: "x" } }) });
    await setSelection(x.client, AUDIT, "a", true, () => x.client);
    expect((await validatePlan(x.client, AUDIT, () => x.client)).status).toBe("error");
    expect(x.tables.events).toHaveLength(0);
  });
});
