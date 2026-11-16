import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "@/env";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { DISCOVER_EVENT } from "@/features/audits/service";
import type { PageRead } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import { profileToFields } from "@/features/brand/form";
import type { BrandProfile } from "@/features/brand/schema";
import type { SiteRead } from "@/features/brand/read-site";
import {
  getLaunchPreview,
  launchJourney,
  readMarket,
  saveCorrections,
  startFromUrl,
  urlChecker,
} from "./service";

// MU.1 : ces tests décrivent l'ANCIENNE chaîne (backlinks, profil, opportunités), conservée derrière
// le réglage `LEGACY_CHAIN`. Le comportement par défaut (analyse unique) est testé dans
// `src/features/analysis/analysis.test.ts`.
const legacyEnv = env as { LEGACY_CHAIN: boolean };
beforeAll(() => {
  legacyEnv.LEGACY_CHAIN = true;
});
afterAll(() => {
  legacyEnv.LEGACY_CHAIN = false;
});

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
  outbound: [],
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
          country: "FR",
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
          country: "FR",
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

  it("la correction du thème est enregistrée ; les recherches internes restent celles déduites", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    const sendEvent = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({}));
    const res = await launchJourney(
      user.client,
      "site-1",
      form({ theme: "Coloriages  Enfants", acceptedUsd: "5" }),
      getService,
      sendEvent,
    );
    expect(res.status).toBe("ok");
    expect(user.tables.sites![0]).toMatchObject({
      niche: "coloriages enfants",
      priority_queries: SITE.priority_queries,
    });
    expect(service.tables.audits![0]).toMatchObject({
      status: "confirme",
      queries: SITE.priority_queries,
    });
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });

  it("exige un thème ; le formulaire ne contient plus de recherches à saisir", async () => {
    const { user, getService } = setup({ sites: [SITE] });
    const sendEvent = vi.fn();
    const noTheme = await launchJourney(
      user.client,
      "site-1",
      form({ theme: "", acceptedUsd: "1" }),
      getService,
      sendEvent,
    );
    expect(noTheme.status).toBe("error");
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("saveCorrections enregistre le thème et tire les recherches internes du thème (repli MA.4)", async () => {
    const { user, service } = setup({ sites: [{ ...SITE, niche: null, priority_queries: [] }] });
    const res = await saveCorrections(user.client, "site-1", form({ theme: "Coloriages" }));
    expect(res.status).toBe("ok");
    expect(user.tables.sites![0]).toMatchObject({
      niche: "coloriages",
      priority_queries: ["coloriages", "coloriages en ligne", "coloriages guide"],
    });
    expect(service.tables.audits ?? []).toHaveLength(0);
  });

  describe("objectif (MT.2a)", () => {
    it("par défaut l'objectif est l'autorité générale ; sans objectif envoyé, on garde l'actuel", async () => {
      const { user, getService } = setup({
        sites: [{ ...SITE, goal: "mots_cles" }],
      });
      expect((await getLaunchPreview(setup({ sites: [SITE] }).user.client, "site-1"))!.goal).toBe(
        "autorite_generale",
      );
      await launchJourney(
        user.client,
        "site-1",
        form({ theme: "coloriages", acceptedUsd: "5" }),
        getService,
        vi.fn(async () => ({})),
      );
      expect(user.tables.sites![0]).toMatchObject({ goal: "mots_cles" });
    });

    it("choisir l'autorité générale vide les mots-clés retenus", async () => {
      const { user, getService } = setup({
        sites: [{ ...SITE, goal: "mots_cles", target_keywords: ["a"] }],
      });
      const preview = (await getLaunchPreview(user.client, "site-1"))!;
      expect(preview.goal).toBe("mots_cles");
      const res = await launchJourney(
        user.client,
        "site-1",
        form({
          theme: "coloriages",
          goal: "autorite_generale",
          acceptedUsd: String(preview.totalUsd),
        }),
        getService,
        vi.fn(async () => ({})),
      );
      expect(res.status).toBe("ok");
      expect(user.tables.sites![0]).toMatchObject({
        goal: "autorite_generale",
        target_keywords: [],
      });
    });

    it("« mots-clés » est enregistré sans choisir de mot-clé maintenant", async () => {
      const { user, getService } = setup({ sites: [SITE] });
      const preview = (await getLaunchPreview(user.client, "site-1"))!;
      const res = await launchJourney(
        user.client,
        "site-1",
        form({ theme: "coloriages", goal: "mots_cles", acceptedUsd: String(preview.totalUsd) }),
        getService,
        vi.fn(async () => ({})),
      );
      expect(res.status).toBe("ok");
      expect(user.tables.sites![0]).toMatchObject({ goal: "mots_cles" });
      expect(user.tables.sites![0]!.target_keywords ?? []).toEqual([]);
      expect(
        user.tables.events!.find((e) => e.type === "onboarding.launched")!.payload,
      ).toMatchObject({
        goal: "mots_cles",
      });
    });

    it("un objectif inconnu est refusé avant tout audit", async () => {
      const { user, service, getService } = setup({ sites: [SITE] });
      const sendEvent = vi.fn();
      const res = await launchJourney(
        user.client,
        "site-1",
        form({ theme: "coloriages", goal: "garanti", acceptedUsd: "5" }),
        getService,
        sendEvent,
      );
      expect(res.status).toBe("error");
      expect(service.tables.audits ?? []).toHaveLength(0);
      expect(sendEvent).not.toHaveBeenCalled();
    });
  });
});

const BRAND: BrandProfile = {
  activity: "Site de coloriages gratuits à imprimer pour les enfants.",
  offer: "Des coloriages classés par thème, en PDF.",
  language: "fr",
  audience: ["Parents", "Enseignants"],
  linkable_resources: [{ url: "https://exemple-coloriage.fr/guide", title: "Guide" }],
  name_variants: ["Exemple Coloriage", "exemple-coloriage.fr"],
  tone: "chaleureux",
  personas: [
    { label: "Enseignants", sites: "blogs de classe", reason: "Activités à imprimer en classe." },
    {
      label: "Médiathèques",
      sites: "pages ressources",
      reason: "Activités gratuites pour enfants.",
    },
  ],
};

const SITE_READ = (): SiteRead => ({
  domain: "exemple-coloriage.fr",
  home: PAGE,
  pages: [{ ...PAGE, url: "https://exemple-coloriage.fr/guide" }],
  knownUrls: ["https://exemple-coloriage.fr/guide"],
  sitemapUsed: true,
  requests: 5,
});

describe("profil de marque dans l'onboarding (MT.1)", () => {
  const brandDeps = (generate = vi.fn(async () => ({ data: BRAND, costUsd: 0.001 }))) => ({
    generate,
    deps: {
      readSite: vi.fn(async () => SITE_READ()),
      makeLlm: () => ({ generate }) as unknown as LlmClient,
    },
  });
  const startLlm = () =>
    llmReturning({ theme: "coloriages", language: "fr", queries: ["coloriage licorne"] }).llm;

  it("établit le profil (version 1) pendant la déduction et l'enregistre avec son coût", async () => {
    const { user } = setup();
    const b = brandDeps();
    const res = await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: async () => PAGE,
      makeLlm: startLlm,
      brand: b.deps,
    });
    expect(res.status).toBe("ok");
    const row = user.tables.brand_profiles![0]!;
    expect(row).toMatchObject({ version: 1, source: "llm", cost_usd: 0.001, workspace_id: "ws-1" });
    expect(b.deps.readSite).toHaveBeenCalledWith("exemple-coloriage.fr", PAGE, "fr"); // accueil non relu
    expect(user.tables.events!.map((e) => e.type)).toContain("brand_profile.created");
  });

  it("un échec du profil ne bloque pas l'onboarding", async () => {
    const { user } = setup();
    const res = await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: async () => PAGE,
      makeLlm: startLlm,
      brand: {
        readSite: async () => {
          throw new Error("réseau");
        },
        makeLlm: () => null,
      },
    });
    expect(res.status).toBe("ok");
    expect(user.tables.brand_profiles ?? []).toHaveLength(0);
  });

  it("établit le profil d'un site déjà cadré qui n'en a pas, sans le redéduire ni le doubler", async () => {
    const { user } = setup({ sites: [SITE] });
    const b = brandDeps();
    const makeLlm = vi.fn();
    const deps = { readHomepage: vi.fn(), makeLlm, brand: b.deps };
    await startFromUrl(user.client, "exemple-coloriage.fr", deps);
    expect(user.tables.brand_profiles).toHaveLength(1);
    expect(makeLlm).not.toHaveBeenCalled();
    await startFromUrl(user.client, "exemple-coloriage.fr", deps);
    expect(user.tables.brand_profiles).toHaveLength(1); // jamais de second appel LLM
    // Deux appels courts : le profil, puis les types d'éditeurs à chercher (chantier H).
    expect(b.generate).toHaveBeenCalledTimes(2);
  });

  it("l'aperçu porte le profil, null s'il n'existe pas", async () => {
    const { user } = setup({ sites: [SITE] });
    expect((await getLaunchPreview(user.client, "site-1"))!.brand).toBeNull();
    const b = brandDeps();
    await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: vi.fn(),
      makeLlm: vi.fn(),
      brand: b.deps,
    });
    const p = (await getLaunchPreview(user.client, "site-1"))!;
    expect(p.brand?.profile.personas.map((x) => x.label)).toContain("Enseignants");
  });

  const base = {
    theme: "coloriages",
    query1: SITE.priority_queries[0]!,
    query2: SITE.priority_queries[1]!,
    query3: SITE.priority_queries[2]!,
  };
  const withProfile = (fields: Record<string, string>) =>
    Object.fromEntries(Object.entries(fields).map(([k, v]) => [`profile_${k}`, v]));

  it("une correction crée la version 2 « utilisateur » ; sans changement, aucune version", async () => {
    const { user, getService } = setup({ sites: [SITE] });
    await startFromUrl(user.client, "exemple-coloriage.fr", {
      readHomepage: vi.fn(),
      makeLlm: vi.fn(),
      brand: brandDeps().deps,
    });
    const preview = (await getLaunchPreview(user.client, "site-1"))!;
    const fields = profileToFields(preview.brand!.profile);
    const ev = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({}));
    // Identique : pas de nouvelle version.
    await launchJourney(
      user.client,
      "site-1",
      form({ ...base, ...withProfile(fields), acceptedUsd: String(preview.totalUsd) }),
      getService,
      ev,
    );
    expect(user.tables.brand_profiles).toHaveLength(1);
    // Corrigé : une version de plus, l'ancienne reste.
    const res = await saveCorrections(
      user.client,
      "site-1",
      form({
        ...base,
        ...withProfile({
          ...fields,
          personas: `${fields.personas}\nAssociations | scoutisme, catéchèse | Activités pour les groupes d'enfants`,
        }),
      }),
    );
    expect(res.status).toBe("ok");
    expect(user.tables.brand_profiles).toHaveLength(2);
    expect(user.tables.brand_profiles![1]).toMatchObject({ version: 2, source: "utilisateur" });
    expect(user.tables.brand_profiles![0]).toMatchObject({ version: 1, source: "llm" });
    expect(user.tables.events!.map((e) => e.type)).toContain("brand_profile.edited");
  });

  it("un profil saisi invalide bloque le lancement avant tout audit", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    const preview = (await getLaunchPreview(user.client, "site-1"))!;
    const sendEvent = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({}));
    const res = await launchJourney(
      user.client,
      "site-1",
      form({
        ...base,
        ...withProfile({
          activity: "Un site",
          offer: "Des choses",
          audience: "Parents",
          personas: "Un seul",
        }),
        acceptedUsd: String(preview.totalUsd),
      }),
      getService,
      sendEvent,
    );
    expect(res.status).toBe("error");
    expect(service.tables.audits ?? []).toHaveLength(0);
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("sans profil établi, un formulaire profil vide n'empêche rien et ne crée rien", async () => {
    const { user, getService } = setup({ sites: [SITE] });
    const preview = (await getLaunchPreview(user.client, "site-1"))!;
    const res = await launchJourney(
      user.client,
      "site-1",
      form({
        ...base,
        ...withProfile(profileToFields(null)),
        acceptedUsd: String(preview.totalUsd),
      }),
      getService,
      async () => ({}),
    );
    expect(res.status).toBe("ok");
    expect(user.tables.brand_profiles ?? []).toHaveLength(0);
  });
});

describe("univers de requêtes au lancement (MT.2b)", () => {
  const PERSONAS = [
    { label: "Enseignants", sites: "blogs de classe", reason: "Activités à imprimer." },
    { label: "Médiathèques", sites: "pages ressources", reason: "Activités gratuites." },
  ];
  const profileRow = {
    site_id: "site-1",
    version: 1,
    source: "llm",
    pages_read: [],
    cost_usd: 0,
    created_at: "2026-11-15T00:00:00Z",
    profile: {
      activity: "Site de coloriages à imprimer.",
      offer: "Des coloriages gratuits en PDF.",
      language: "fr",
      audience: ["Parents"],
      linkable_resources: [],
      name_variants: ["Exemple Coloriage"],
      tone: "chaleureux",
      personas: PERSONAS,
    },
  };
  const llmOut = {
    personas: PERSONAS.map((p) => ({
      label: p.label,
      queries: [
        { q: `blog ${p.label.toLowerCase()} coloriages`, tactic: "inconnus", rating: 4 },
        { q: `ressources ${p.label.toLowerCase()} enfants`, tactic: "ressources", rating: 3 },
      ],
    })),
  };
  const queryDeps = (
    service: ReturnType<typeof fakeSupabase>,
    generate = vi.fn(async (o: { schema: { parse: (x: unknown) => unknown } }) => ({
      data: o.schema.parse(llmOut),
      costUsd: 0.0004,
    })),
  ) => ({
    generate,
    deps: {
      makeLlm: () => ({ generate }) as unknown as LlmClient,
      getServiceClient: () => service.client,
    },
  });
  const accepted = async (user: ReturnType<typeof setup>["user"]) => ({
    ...Object.fromEntries([
      ["theme", "coloriages"],
      ["query1", SITE.priority_queries[0]!],
      ["query2", SITE.priority_queries[1]!],
      ["query3", SITE.priority_queries[2]!],
    ]),
    acceptedUsd: String((await getLaunchPreview(user.client, "site-1"))!.totalUsd),
  });

  it("l'aperçu annonce le nombre maximal de recherches d'éditeurs et leur coût (0 USD)", async () => {
    const { user } = setup({ sites: [SITE] });
    const p = (await getLaunchPreview(user.client, "site-1"))!;
    expect(p.queryPhase.maxQueries).toBeGreaterThan(5);
    expect(p.queryPhase.totalUsd).toBeGreaterThan(0);
    expect(p.queryPhase.totalUsd).toBeLessThanOrEqual(
      p.queryPhase.budgetUsd + p.queryPhase.perQueryUsd,
    );
    // Annonce seulement : n'entre pas dans le total facturé du parcours.
    expect(p.totalUsd).toBe(p.chain.totalUsd);
  });

  it("enregistre l'univers au lancement, avec deux appels LLM courts, sans toucher au total", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    user.tables.brand_profiles = [profileRow];
    user.tables.query_universes = [];
    user.tables.query_recipes = [];
    const q = queryDeps(service);
    service.tables.query_recipes = [];
    const res = await launchJourney(
      user.client,
      "site-1",
      form(await accepted(user)),
      getService,
      async () => ({}),
      q.deps,
    );
    expect(res.status).toBe("ok");
    // Deux appels courts : les types d'éditeurs (profil sans étiquettes), puis les recettes.
    expect(q.generate).toHaveBeenCalledTimes(2);
    expect(user.tables.query_universes).toHaveLength(1);
    expect(user.tables.query_universes![0]).toMatchObject({
      site_id: "site-1",
      brand_profile_version: 1,
    });
    expect(user.tables.events!.map((e) => e.type)).toContain("query_universe.created");
  });

  it("une panne de l'univers ne bloque jamais le lancement", async () => {
    const { user, service, getService } = setup({ sites: [SITE] });
    user.tables.brand_profiles = [profileRow];
    const boom = vi.fn(async () => {
      throw new Error("panne");
    });
    const q = queryDeps(service, boom as never);
    service.tables.query_recipes = [];
    user.tables.query_universes = [];
    const res = await launchJourney(
      user.client,
      "site-1",
      form(await accepted(user)),
      getService,
      async () => ({}),
      q.deps,
    );
    expect(res.status).toBe("ok");
    expect(service.tables.audits![0]).toMatchObject({ status: "confirme" });
  });

  it("sans profil de marque, aucun univers n'est inventé ; sans dépendances, rien ne change", async () => {
    const a = setup({ sites: [SITE] });
    a.user.tables.query_universes = [];
    const qa = queryDeps(a.service);
    await launchJourney(
      a.user.client,
      "site-1",
      form(await accepted(a.user)),
      a.getService,
      async () => ({}),
      qa.deps,
    );
    expect(qa.generate).not.toHaveBeenCalled();
    expect(a.user.tables.query_universes).toHaveLength(0);
    const b = setup({ sites: [SITE] });
    const res = await launchJourney(
      b.user.client,
      "site-1",
      form(await accepted(b.user)),
      b.getService,
      async () => ({}),
    );
    expect(res.status).toBe("ok");
  });
});

describe("chantier B : marché et objectif dès l'étape 1, une campagne par pays", () => {
  const home = { ...PAGE, lang: "fr" };
  const deps = (llmLang: "fr" | "en" = "fr") => {
    const { llm } = llmReturning({
      theme: "coloriages",
      language: llmLang,
      queries: ["coloriage licorne"],
    });
    return {
      readHomepage: vi.fn(async () => home),
      makeLlm: () => llm,
    };
  };

  it("lit pays, langue et objectif du formulaire ; une valeur inconnue retombe sur le défaut", () => {
    const fd = new FormData();
    fd.set("country", "BE");
    fd.set("language", "en");
    fd.set("goal", "mots_cles");
    expect(readMarket(fd)).toEqual({ country: "BE", language: "en", goal: "mots_cles" });
    const bad = new FormData();
    bad.set("country", "ZZ");
    bad.set("language", "de");
    bad.set("goal", "x");
    expect(readMarket(bad)).toEqual({ country: "FR", language: "auto", goal: "autorite_generale" });
  });

  it("langue « détectée » : la langue du pays visé est préférée (France : français)", async () => {
    const { user } = setup();
    const d = deps();
    await startFromUrl(
      user.client,
      "exemple-coloriage.fr",
      d,
      { country: "FR", language: "auto", goal: "autorite_generale" },
      { profile: false },
    );
    expect(d.readHomepage).toHaveBeenCalledWith("exemple-coloriage.fr", "fr");
    const us = deps();
    await startFromUrl(
      user.client,
      "exemple-coloriage.fr",
      us,
      { country: "US", language: "auto", goal: "autorite_generale" },
      { profile: false },
    );
    expect(us.readHomepage).toHaveBeenCalledWith("exemple-coloriage.fr", "en");
  });

  it("crée la campagne avec le pays, la langue et l'objectif choisis, sans profil en phase 1", async () => {
    const { user } = setup();
    const d = deps();
    const res = await startFromUrl(
      user.client,
      "exemple-coloriage.fr",
      d,
      { country: "BE", language: "en", goal: "mots_cles" },
      { profile: false },
    );
    expect(res).toMatchObject({ status: "ok", needsProfile: true, language: "en" });
    expect(d.readHomepage).toHaveBeenCalledWith("exemple-coloriage.fr", "en");
    expect(user.tables.sites![0]).toMatchObject({
      country: "BE",
      language: "en",
      goal: "mots_cles",
    });
  });

  it("un même domaine dans un autre pays est une AUTRE campagne ; le même pays retrouve la première", async () => {
    const { user } = setup();
    const start = (country: "FR" | "BE") =>
      startFromUrl(
        user.client,
        "exemple-coloriage.fr",
        deps(),
        {
          country,
          language: "auto",
          goal: "autorite_generale",
        },
        { profile: false },
      );
    const fr = await start("FR");
    const be = await start("BE");
    const frAgain = await start("FR");
    expect(user.tables.sites).toHaveLength(2);
    expect(be.siteId).not.toBe(fr.siteId);
    expect(frAgain.siteId).toBe(fr.siteId);
    expect(user.tables.sites!.map((s) => s.country).sort()).toEqual(["BE", "FR"]);
  });
});

describe("chantier C : ajout manuel d'une page, vérifiée en HTTP 200", () => {
  const SITE2 = { ...SITE, id: "site-1" };
  const send = async (add: string, status: number | null) => {
    const { user } = setup({ sites: [SITE2] });
    const spy = vi.spyOn(urlChecker, "status").mockResolvedValue(status);
    try {
      const f = new FormData();
      f.set("theme", "coloriages");
      f.set("profile_res_add", add);
      f.append("profile_res_all", `https://${SITE2.domain}/ | Accueil`);
      f.append("profile_res_on", `https://${SITE2.domain}/`);
      f.set("profile_activity", "Un site de coloriages.");
      f.set("profile_offer", "Des coloriages gratuits.");
      f.set("profile_audience", "Parents");
      f.set(
        "profile_personas",
        "Écoles | écoles primaires | elles utilisent des coloriages\nParents | blogs de parents | ils cherchent des activités",
      );
      const res = await saveCorrections(user.client, "site-1", f);
      return { res, checked: spy.mock.calls.map((c) => c[0]) };
    } finally {
      spy.mockRestore();
    }
  };

  it("une adresse du site qui répond 200 est acceptée", async () => {
    const { res, checked } = await send(`${SITE2.domain}/ma-page`, 200);
    expect(res).toMatchObject({ status: "ok" });
    expect(checked).toEqual([`https://${SITE2.domain}/ma-page`]);
  });

  it("une adresse qui répond 404, injoignable ou d'un autre site est refusée", async () => {
    expect((await send(`${SITE2.domain}/absente`, 404)).res.status).toBe("error");
    expect((await send(`${SITE2.domain}/x`, null)).res.status).toBe("error");
    const other = await send("https://autre-site.fr/page", 200);
    expect(other.res.status).toBe("error");
    expect(other.checked).toEqual([]);
  });
});
