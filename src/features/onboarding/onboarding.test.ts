import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { DISCOVER_EVENT } from "@/features/audits/service";
import type { PageRead } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import { getLaunchPreview, launchJourney, saveCorrections, startFromUrl } from "./service";

const PAGE: PageRead = {
  url: "https://exemple-coloriage.fr/",
  status: 200,
  blockedByRobots: false,
  unreachable: false,
  title: "Coloriages à imprimer | Exemple",
  description: "",
  headings: [],
  text: "Coloriages de licornes et de chats à imprimer.",
  lang: "fr",
  links: [],
  mailtos: [],
  hasContactForm: false,
  viaFallback: false,
};

function llmReturning(data: unknown) {
  const generate = vi.fn(async () => ({ data }));
  return { llm: { generate } as unknown as LlmClient, generate };
}

function setup(
  over: { sites?: Record<string, unknown>[]; audits?: Record<string, unknown>[] } = {},
) {
  const user = fakeSupabase({
    workspaces: [{ id: "ws-1", plan: "gratuit", created_at: "2026-01-01" }],
    sites: over.sites ?? [],
    audits: over.audits ?? [],
    events: [],
  });
  const service = fakeSupabase({}, { uniqueActivePerSite: true });
  service.tables.audits = user.tables.audits!;
  service.tables.events = user.tables.events!;
  return { user, service, getService: () => service.client };
}

const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.set(k, v);
  return fd;
};

describe("startFromUrl", () => {
  it("refuse une adresse qui n'est pas un site public", async () => {
    const { user } = setup();
    const readHomepage = vi.fn();
    const res = await startFromUrl(user.client, "localhost", { readHomepage, makeLlm: () => null });
    expect(res.status).toBe("error");
    expect(readHomepage).not.toHaveBeenCalled();
  });

  it("crée le site avec thème, langue, pays et requêtes déduits, sans aucun autre champ", async () => {
    const { user } = setup();
    const { llm, generate } = llmReturning({
      theme: "coloriages à imprimer",
      language: "fr",
      queries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
    });
    const res = await startFromUrl(user.client, "https://www.Exemple-Coloriage.fr/page?x=1", {
      readHomepage: async () => PAGE,
      makeLlm: () => llm,
    });
    expect(res).toMatchObject({ status: "ok" });
    const site = user.tables.sites![0]!;
    expect(site).toMatchObject({
      workspace_id: "ws-1",
      domain: "exemple-coloriage.fr",
      niche: "coloriages à imprimer",
      language: "fr",
      country: "FR",
      priority_queries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
    });
    // Propriété, signature, actif offert et boîte : rien n'est demandé ni inventé.
    expect(site.signature_first_name).toBeUndefined();
    expect(site.offered_asset).toBeUndefined();
    expect(site.sender_email).toBeUndefined();
    expect(site.verified_at).toBeUndefined();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(user.tables.events!.map((e) => e.type)).toEqual(["site.created", "onboarding.deduced"]);
  });

  it("fonctionne sans clé LLM : thème tiré du titre, aucun appel payant", async () => {
    const { user } = setup();
    const res = await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: async () => PAGE,
      makeLlm: () => null,
    });
    expect(res.status).toBe("ok");
    expect(user.tables.sites![0]).toMatchObject({ niche: "coloriages à imprimer" });
  });

  it("site illisible : crée le site sans thème ni requêtes (l'écran les demandera)", async () => {
    const { user } = setup();
    const res = await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: async () => {
        throw new Error("réseau");
      },
      makeLlm: () => null,
    });
    expect(res.status).toBe("ok");
    expect(user.tables.sites![0]).toMatchObject({ niche: null, priority_queries: [] });
  });

  it("renvoie vers l'audit existant sans relire le site ni appeler le LLM", async () => {
    const { user } = setup({
      sites: [
        {
          id: "site-1",
          workspace_id: "ws-1",
          domain: "exemple-coloriage.fr",
          niche: "x",
          priority_queries: ["abc"],
        },
      ],
      audits: [{ id: "audit-1", site_id: "site-1", status: "en_cours", created_at: "2026-01-02" }],
    });
    const readHomepage = vi.fn();
    const makeLlm = vi.fn();
    const res = await startFromUrl(user.client, "exemple-coloriage.fr", { readHomepage, makeLlm });
    expect(res).toMatchObject({ status: "ok", siteId: "site-1", auditId: "audit-1" });
    expect(readHomepage).not.toHaveBeenCalled();
    expect(makeLlm).not.toHaveBeenCalled();
  });

  it("ne redéduit pas un site déjà cadré (pas de second appel LLM)", async () => {
    const { user } = setup({
      sites: [
        {
          id: "site-1",
          workspace_id: "ws-1",
          domain: "exemple-coloriage.fr",
          niche: "x",
          priority_queries: ["abc"],
        },
      ],
    });
    const makeLlm = vi.fn();
    const res = await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: vi.fn(),
      makeLlm,
    });
    expect(res).toMatchObject({ status: "ok", siteId: "site-1" });
    expect(makeLlm).not.toHaveBeenCalled();
  });
});

const SITE = {
  id: "site-1",
  workspace_id: "ws-1",
  domain: "exemple-coloriage.fr",
  niche: "coloriages",
  language: "fr",
  country: "FR",
  priority_queries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
};

describe("aperçu et lancement", () => {
  it("l'aperçu annonce le coût total du parcours (0 USD d'API pour l'afficher)", async () => {
    const { user } = setup({ sites: [SITE] });
    const p = await getLaunchPreview(user.client, "site-1");
    expect(p).toMatchObject({ domain: "exemple-coloriage.fr", verified: false, auditId: null });
    expect(p!.totalUsd).toBeGreaterThan(0);
    expect(p!.chain.totalUsd).toBe(p!.totalUsd);
    expect(p!.totalUsd).toBeLessThanOrEqual(p!.capUsd + p!.chain.opportunitiesUsd);
  });

  it("une seule confirmation : crée l'audit, le confirme et envoie l'événement une fois", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    const preview = (await getLaunchPreview(user.client, "site-1"))!;
    const sendEvent = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({}));
    const res = await launchJourney(
      user.client,
      "site-1",
      form({
        theme: "coloriages",
        query1: SITE.priority_queries[0]!,
        query2: SITE.priority_queries[1]!,
        query3: SITE.priority_queries[2]!,
        acceptedUsd: String(preview.totalUsd),
      }),
      getService,
      sendEvent,
    );
    expect(res.status).toBe("ok");
    const audit = service.tables.audits![0]!;
    expect(audit).toMatchObject({ status: "confirme", auto_chain: true });
    expect(sendEvent).toHaveBeenCalledTimes(1);
    expect(sendEvent.mock.calls[0]![0]).toMatchObject({ name: DISCOVER_EVENT });
    expect(user.tables.events!.map((e) => e.type)).toContain("onboarding.launched");
  });

  it("refuse de lancer si le coût recalculé dépasse celui que la personne a vu", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    const sendEvent = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({}));
    const res = await launchJourney(
      user.client,
      "site-1",
      form({
        theme: "coloriages",
        query1: "coloriage licorne",
        query2: "coloriage chat",
        query3: "coloriage dinosaure",
        acceptedUsd: "0.001",
      }),
      getService,
      sendEvent,
    );
    expect(res.status).toBe("error");
    expect(sendEvent).not.toHaveBeenCalled();
    expect(service.tables.audits![0]).toMatchObject({ status: "estime" });
  });

  it("les corrections du thème et des requêtes sont enregistrées et suivies par l'audit estimé", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    const sendEvent = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({}));
    // 1er essai : coût refusé, l'audit reste « estimé » avec les anciennes requêtes.
    await launchJourney(
      user.client,
      "site-1",
      form({
        theme: "coloriages",
        query1: "coloriage licorne",
        query2: "coloriage chat",
        query3: "coloriage dinosaure",
        acceptedUsd: "0.001",
      }),
      getService,
      sendEvent,
    );
    // 2e essai : la personne corrige à une seule requête et accepte le nouveau total.
    const res = await launchJourney(
      user.client,
      "site-1",
      form({ theme: "Coloriages Enfants", query1: "Coloriage  licorne", acceptedUsd: "5" }),
      getService,
      sendEvent,
    );
    expect(res.status).toBe("ok");
    expect(user.tables.sites![0]).toMatchObject({
      niche: "coloriages enfants",
      priority_queries: ["coloriage licorne"],
    });
    expect(service.tables.audits![0]).toMatchObject({
      status: "confirme",
      queries: ["coloriage licorne"],
    });
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });

  it("exige thème et au moins une recherche", async () => {
    const { user, getService } = setup({ sites: [SITE] });
    const sendEvent = vi.fn();
    const noTheme = await launchJourney(
      user.client,
      "site-1",
      form({ theme: "", query1: "coloriage", acceptedUsd: "1" }),
      getService,
      sendEvent,
    );
    const noQuery = await launchJourney(
      user.client,
      "site-1",
      form({ theme: "coloriages", acceptedUsd: "1" }),
      getService,
      sendEvent,
    );
    expect(noTheme.status).toBe("error");
    expect(noQuery.status).toBe("error");
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("saveCorrections enregistre thème et requêtes sans rien lancer", async () => {
    const { user, service } = setup({ sites: [{ ...SITE, niche: null, priority_queries: [] }] });
    const res = await saveCorrections(
      user.client,
      "site-1",
      form({ theme: "Coloriages", query1: "coloriage licorne" }),
    );
    expect(res.status).toBe("ok");
    expect(user.tables.sites![0]).toMatchObject({
      niche: "coloriages",
      priority_queries: ["coloriage licorne"],
    });
    expect(service.tables.audits ?? []).toHaveLength(0);
  });
});
