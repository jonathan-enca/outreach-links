import { describe, expect, it, vi } from "vitest";
import { advanceChain, estimateChain } from "./chain";
import { chainProgressView } from "./chain-progress";
import { fakeSupabase } from "./fake-supabase";
import { confirmAudit, createAudit } from "./service";

const SITE = {
  domain: "mega-coloring.com",
  niche: "coloriages",
  priorityQueries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
  offeredAsset: "coloriages gratuits à imprimer",
};

describe("estimateChain (MA.6)", () => {
  it("additionne les étapes et reste dans le plafond de l'audit gratuit", () => {
    const e = estimateChain({ plan: "gratuit", discoveryUsd: 0.018, capUsd: 0.25, site: SITE });
    expect(e.uncovered).toEqual([]);
    expect(e.backlinksUsd).toBeGreaterThan(0);
    expect(e.profileUsd).toBeGreaterThan(0);
    expect(e.opportunitiesUsd).toBeGreaterThan(0);
    // Découverte + backlinks + profil partagent le plafond de l'audit ; opportunités a le sien.
    expect(e.discoveryUsd + e.backlinksUsd + e.profileUsd).toBeLessThanOrEqual(0.25 + 1e-9);
    expect(e.totalUsd).toBeCloseTo(
      e.discoveryUsd + e.backlinksUsd + e.profileUsd + e.opportunitiesUsd,
      6,
    );
  });

  it("signale les étapes que le plafond ne couvre pas, sans les compter", () => {
    const e = estimateChain({ plan: "gratuit", discoveryUsd: 0.018, capUsd: 0.03, site: SITE });
    expect(e.uncovered).toContain("backlinks");
    expect(e.uncovered).toContain("profile");
    expect(e.backlinksUsd).toBe(0);
    expect(e.profileUsd).toBe(0);
  });
});

describe("chainProgressView", () => {
  it("affiche l'état de chaque étape, « manuel » si le plafond ne la couvre pas", () => {
    const v = chainProgressView({
      auditStatus: "termine",
      backlinks: "termine",
      profile: "en_cours",
      opportunities: "aucun",
      uncovered: ["opportunities"],
    });
    expect(v.stages.map((s) => s.state)).toEqual(["termine", "termine", "en_cours", "manuel"]);
  });
});

function auditRow(over: Record<string, unknown> = {}) {
  return {
    id: "audit-1",
    workspace_id: "ws-1",
    site_id: "site-1",
    status: "termine",
    plan: "gratuit",
    cost_cap_usd: 0.25,
    auto_chain: true,
    created_by: "user-1",
    backlinks_status: "aucun",
    profile_status: "aucun",
    opportunities_status: "aucun",
    backlinks_stats: {},
    profile_limits: {},
    opportunities_limits: {},
    ...over,
  };
}

function chainSetup(audit: Record<string, unknown>) {
  const service = fakeSupabase({
    audits: [audit],
    competitors: [
      { id: "c1", audit_id: "audit-1", selected: true, referring_domains: 100 },
      { id: "c2", audit_id: "audit-1", selected: true, referring_domains: 200 },
      { id: "c3", audit_id: "audit-1", selected: true, referring_domains: 300 },
    ],
    sites: [
      {
        id: "site-1",
        ...SITE,
        priority_queries: SITE.priorityQueries,
        offered_asset: SITE.offeredAsset,
      },
    ],
    cost_ledger: [],
    events: [],
  });
  const sendEvent = vi.fn(async () => ({}));
  return { service, sendEvent };
}

describe("advanceChain", () => {
  it("lance les backlinks après la découverte, au nom de l'auteur de l'audit", async () => {
    const { service, sendEvent } = chainSetup(auditRow());
    const res = await advanceChain(service.client, "audit-1", sendEvent);
    expect(res.started).toBe("backlinks");
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "audit/backlinks.requested" }),
    );
    expect(service.tables.audits![0]).toMatchObject({ backlinks_status: "confirme" });
    expect(service.tables.events![0]).toMatchObject({
      type: "audit.backlinks_confirmed",
      actor_id: "user-1",
    });
  });

  it("enchaîne le profil puis les opportunités, et s'arrête ensuite", async () => {
    const a = chainSetup(auditRow({ backlinks_status: "termine" }));
    expect((await advanceChain(a.service.client, "audit-1", a.sendEvent)).started).toBe("profile");
    const b = chainSetup(auditRow({ backlinks_status: "termine", profile_status: "termine" }));
    expect((await advanceChain(b.service.client, "audit-1", b.sendEvent)).started).toBe(
      "opportunities",
    );
    const c = chainSetup(
      auditRow({
        backlinks_status: "termine",
        profile_status: "termine",
        opportunities_status: "termine",
      }),
    );
    expect((await advanceChain(c.service.client, "audit-1", c.sendEvent)).started).toBeNull();
    expect(c.sendEvent).not.toHaveBeenCalled();
  });

  it("ne fait rien hors parcours unique, sur étape en cours ou échouée", async () => {
    for (const over of [
      { auto_chain: false },
      { backlinks_status: "en_cours" },
      { backlinks_status: "echoue" },
      { status: "echoue" },
      { backlinks_status: "termine", profile_status: "echoue" },
    ]) {
      const { service, sendEvent } = chainSetup(auditRow(over));
      expect((await advanceChain(service.client, "audit-1", sendEvent)).started).toBeNull();
      expect(sendEvent).not.toHaveBeenCalled();
    }
  });

  it("est rejouable : un second appel ne relance pas une étape déjà en cours", async () => {
    const { service, sendEvent } = chainSetup(auditRow());
    await advanceChain(service.client, "audit-1", sendEvent);
    // Étape confirmée mais pas encore démarrée : l'événement est renvoyé avec le même id (dédoublonné par Inngest).
    await advanceChain(service.client, "audit-1", sendEvent);
    const ids = sendEvent.mock.calls.map((c) => (c as unknown as [{ id: string }])[0].id);
    expect(new Set(ids).size).toBe(1);
  });
});

describe("parcours unique à la création et à la confirmation", () => {
  it("stocke le coût total à la création puis active auto_chain à la confirmation", async () => {
    const user = fakeSupabase(
      {
        sites: [
          {
            id: "site-1",
            workspace_id: "ws-1",
            domain: SITE.domain,
            niche: SITE.niche,
            offered_asset: SITE.offeredAsset,
            priority_queries: SITE.priorityQueries,
          },
        ],
        audits: [],
        workspaces: [{ id: "ws-1", plan: "gratuit" }],
        events: [],
      },
      { userId: "user-1" },
    );
    const service = fakeSupabase({}, { uniqueActivePerSite: true });
    service.tables.audits = user.tables.audits!;
    service.tables.events = user.tables.events!;

    const created = await createAudit(user.client, "site-1", () => service.client);
    expect(created.status).toBe("ok");
    const audit = service.tables.audits![0]!;
    const details = audit.estimate_details as { chain: { totalUsd: number; uncovered: string[] } };
    expect(details.chain.totalUsd).toBeGreaterThan(audit.estimated_cost_usd as number);
    expect(details.chain.uncovered).toEqual([]);
    expect(audit.auto_chain).toBeUndefined();

    const send = vi.fn(async () => ({}));
    await confirmAudit(user.client, audit.id as string, () => service.client, send);
    expect(service.tables.audits![0]).toMatchObject({ status: "confirme", auto_chain: true });
  });
});
