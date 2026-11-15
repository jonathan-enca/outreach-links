import { describe, expect, it, vi } from "vitest";
import { TEST_COST_CAP_USD } from "@/features/sites/test-domains";
import { fakeSupabase } from "./fake-supabase";
import { confirmAudit, createAudit, DISCOVER_EVENT, transitionAudit } from "./service";

const SITE = {
  id: "site-1",
  workspace_id: "ws-1",
  domain: "exemple-coloriage.fr",
  priority_queries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
};

function setup(
  over: {
    sites?: unknown[];
    audits?: unknown[];
    workspaces?: unknown[];
    userId?: string | null;
  } = {},
) {
  const user = fakeSupabase(
    {
      sites: (over.sites ?? [SITE]) as Record<string, unknown>[],
      audits: (over.audits ?? []) as Record<string, unknown>[],
      workspaces: (over.workspaces ?? [{ id: "ws-1", plan: "gratuit" }]) as Record<
        string,
        unknown
      >[],
      events: [],
    },
    { userId: over.userId },
  );
  // Le client service partage les mêmes tables que le client utilisateur.
  const service = fakeSupabase({}, { uniqueActivePerSite: true });
  service.tables.audits = user.tables.audits!;
  service.tables.events = user.tables.events!;
  return { user, service, getService: () => service.client };
}

describe("createAudit", () => {
  it("crée l'audit et le passe de en_attente à estime avec le coût estimé", async () => {
    const { user, service, getService } = setup();
    const res = await createAudit(user.client, "site-1", getService);
    expect(res.status).toBe("ok");
    const audit = service.tables.audits![0]!;
    expect(audit).toMatchObject({
      status: "estime",
      plan: "gratuit",
      max_competitors: 3,
      cost_cap_usd: 0.25,
      estimated_cost_usd: 0.018,
      queries: SITE.priority_queries,
    });
    // L'historique des écritures prouve le passage par en_attente.
    const writes = service.log.filter((l) => l.table === "audits").map((l) => l.op);
    expect(writes).toEqual(["insert", "update"]);
    expect(user.tables.events!.map((e) => e.type)).toEqual(["audit.estimated"]);
  });

  it("applique les plafonds du plan payant", async () => {
    const { user, service, getService } = setup({ workspaces: [{ id: "ws-1", plan: "payant" }] });
    await createAudit(user.client, "site-1", getService);
    expect(service.tables.audits![0]).toMatchObject({
      plan: "payant",
      max_competitors: 20,
      cost_cap_usd: 2,
    });
  });

  it("lève les plafonds pour un site de test, même en plan gratuit", async () => {
    const { user, service, getService } = setup({
      sites: [{ ...SITE, domain: "mega-coloring.com" }],
    });
    await createAudit(user.client, "site-1", getService);
    expect(service.tables.audits![0]).toMatchObject({
      plan: "payant",
      max_competitors: 20,
      cost_cap_usd: TEST_COST_CAP_USD,
    });
  });

  it("refuse un site sans requête prioritaire, sans toucher aux audits", async () => {
    const { user, service, getService } = setup({ sites: [{ ...SITE, priority_queries: [] }] });
    const res = await createAudit(user.client, "site-1", getService);
    expect(res.status).toBe("error");
    expect(service.tables.audits ?? []).toHaveLength(0);
  });

  it("refuse un site introuvable (autre workspace) et un utilisateur déconnecté", async () => {
    const a = setup({ sites: [] });
    expect((await createAudit(a.user.client, "site-1", a.getService)).status).toBe("error");
    const b = setup({ userId: null });
    expect((await createAudit(b.user.client, "site-1", b.getService)).status).toBe("error");
  });

  it("réutilise l'audit actif au lieu d'en créer un second", async () => {
    const { user, service, getService } = setup({
      audits: [{ id: "a1", site_id: "site-1", status: "estime" }],
    });
    const res = await createAudit(user.client, "site-1", getService);
    expect(res).toMatchObject({ status: "ok", auditId: "a1" });
    expect(service.tables.audits).toHaveLength(1);
  });

  it("signale l'indisponibilité si la clé service est absente", async () => {
    const { user } = setup();
    const res = await createAudit(user.client, "site-1", () => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
    });
    expect(res.status).toBe("error");
  });
});

describe("transitionAudit", () => {
  it("est atomique : la seconde transition identique ne fait rien", async () => {
    const { service } = setup({ audits: [{ id: "a1", status: "estime" }] });
    expect(await transitionAudit(service.client, "a1", "estime", "confirme")).toBe(true);
    expect(await transitionAudit(service.client, "a1", "estime", "confirme")).toBe(false);
  });
  it("refuse une transition interdite", async () => {
    const { service } = setup({ audits: [{ id: "a1", status: "estime" }] });
    await expect(transitionAudit(service.client, "a1", "estime", "en_cours")).rejects.toThrow(
      /interdite/,
    );
    expect(service.tables.audits![0]!.status).toBe("estime");
  });
});

describe("confirmAudit", () => {
  const estimed = {
    id: "a1",
    workspace_id: "ws-1",
    site_id: "site-1",
    status: "estime",
    estimated_cost_usd: 0.018,
    cost_cap_usd: 0.25,
  };

  it("estime -> confirme, journalise et envoie l'événement avec un identifiant stable", async () => {
    const { user, service, getService } = setup({ audits: [estimed] });
    const send = vi.fn(async () => undefined);
    const res = await confirmAudit(user.client, "a1", getService, send);
    expect(res.status).toBe("ok");
    expect(service.tables.audits![0]!.status).toBe("confirme");
    expect(service.tables.audits![0]!.confirmed_at).toBeTruthy();
    expect(send).toHaveBeenCalledWith({
      id: "audit-discover-a1",
      name: DISCOVER_EVENT,
      data: { auditId: "a1", workspaceId: "ws-1" },
    });
    expect(user.tables.events!.map((e) => e.type)).toEqual(["audit.confirmed"]);
  });

  it("n'envoie rien si l'audit n'est pas encore estimé", async () => {
    const { user, getService } = setup({ audits: [{ ...estimed, status: "en_attente" }] });
    const send = vi.fn(async () => undefined);
    const res = await confirmAudit(user.client, "a1", getService, send);
    expect(res.status).toBe("error");
    expect(send).not.toHaveBeenCalled();
  });

  it("refuse si le coût estimé dépasse le plafond", async () => {
    const { user, service, getService } = setup({
      audits: [{ ...estimed, estimated_cost_usd: 0.3 }],
    });
    const send = vi.fn(async () => undefined);
    const res = await confirmAudit(user.client, "a1", getService, send);
    expect(res.status).toBe("error");
    expect(service.tables.audits![0]!.status).toBe("estime");
    expect(send).not.toHaveBeenCalled();
  });

  it("un audit déjà lancé n'est pas relancé", async () => {
    for (const status of ["en_cours", "termine", "echoue"]) {
      const { user, getService } = setup({ audits: [{ ...estimed, status }] });
      const send = vi.fn(async () => undefined);
      const res = await confirmAudit(user.client, "a1", getService, send);
      expect(res.status).toBe("ok");
      expect(send).not.toHaveBeenCalled();
    }
  });

  it("si l'envoi Inngest échoue, l'audit reste confirme et le renvoi est possible", async () => {
    const { user, service, getService } = setup({ audits: [estimed] });
    const failing = vi.fn(async () => {
      throw new Error("pas de clé d'événement");
    });
    const first = await confirmAudit(user.client, "a1", getService, failing);
    expect(first.status).toBe("error");
    expect(service.tables.audits![0]!.status).toBe("confirme");
    const ok = vi.fn(async () => undefined);
    const second = await confirmAudit(user.client, "a1", getService, ok);
    expect(second.status).toBe("ok");
    expect(ok).toHaveBeenCalledTimes(1);
    // Une seule ligne d'événement de confirmation : pas de double journalisation.
    expect(user.tables.events!.filter((e) => e.type === "audit.confirmed")).toHaveLength(1);
  });

  it("audit introuvable ou utilisateur déconnecté", async () => {
    const a = setup();
    expect((await confirmAudit(a.user.client, "nope", a.getService, vi.fn())).status).toBe("error");
    const b = setup({ audits: [estimed], userId: null });
    expect((await confirmAudit(b.user.client, "a1", b.getService, vi.fn())).status).toBe("error");
  });
});
