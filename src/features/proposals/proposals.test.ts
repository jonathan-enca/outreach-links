import { describe, expect, it } from "vitest";
import type { BrandProfile } from "@/features/brand/schema";
import type { PageRead } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import { proposeVerifiedSites } from "./service";
import { PROPOSAL_LIMITS, type ProposedSite } from "./schema";
import { checkProposal, gapLabel, hostnameOf, verifyProposals } from "./verify";

const LONG = "Une page de ressources utiles pour les enseignants. ".repeat(20);

function page(url: string, over: Partial<PageRead> = {}): PageRead {
  return {
    url,
    status: 200,
    blockedByRobots: false,
    unreachable: false,
    title: "Ressources",
    description: "",
    headings: [],
    text: LONG + "Voir aussi Calendrier Scolaire Gratuit pour planifier l'année.",
    lang: "fr",
    links: [],
    outbound: [],
    mailtos: [],
    hasContactForm: false,
    viaFallback: false,
    ...over,
  };
}

/** Lecteur simulé : une table d'adresses connues, le reste renvoie 404. */
function reader(known: Record<string, Partial<PageRead>>) {
  return async (url: string): Promise<PageRead> => {
    const hit = known[url];
    if (!hit) return page(url, { status: 404, text: "", unreachable: false });
    return page(url, hit);
  };
}

const site = (over: Partial<ProposedSite> = {}): ProposedSite => ({
  domaine: "ecole-exemple.fr",
  page: "https://ecole-exemple.fr/ressources",
  ressource: "Calendrier Scolaire Gratuit",
  raison: "Liste de ressources pour enseignants.",
  ...over,
});

const profile = {
  activity: "Calendrier scolaire gratuit à imprimer",
  offer: "Calendriers des vacances par académie",
  audience: ["enseignants", "parents"],
  personas: [],
  resources: [],
} as unknown as BrandProfile;

describe("checkProposal", () => {
  it("garde une page en 200 qui cite la ressource annoncée", async () => {
    const res = await checkProposal(
      site(),
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": {} }),
    );
    expect(res.ok).toBe(true);
  });

  it("écarte une adresse qui répond 404 (inventée)", async () => {
    const res = await checkProposal(site(), "mon-site.fr", reader({}));
    expect(res).toEqual({ ok: false, motif: "statut_http" });
  });

  it("écarte une page qui ne cite pas la ressource annoncée", async () => {
    const res = await checkProposal(
      site({ ressource: "Agenda Lunaire" }),
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": {} }),
    );
    expect(res).toEqual({ ok: false, motif: "ressource_absente" });
  });

  it("compare sans accents ni casse", async () => {
    const res = await checkProposal(
      site({ ressource: "CALENDRIER scolaire  gratuit" }),
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": {} }),
    );
    expect(res.ok).toBe(true);
  });

  it("écarte une page trop courte pour être du contenu réel", async () => {
    const res = await checkProposal(
      site(),
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": { text: "Calendrier Scolaire Gratuit" } }),
    );
    expect(res).toEqual({ ok: false, motif: "page_vide" });
  });

  it("écarte une page hors du domaine proposé", async () => {
    const res = await checkProposal(
      site({ page: "https://autre-site.fr/ressources" }),
      "mon-site.fr",
      reader({ "https://autre-site.fr/ressources": {} }),
    );
    expect(res).toEqual({ ok: false, motif: "hors_domaine" });
  });

  it("écarte le site lui-même", async () => {
    const res = await checkProposal(
      site({ domaine: "mon-site.fr", page: "https://www.mon-site.fr/blog" }),
      "mon-site.fr",
      reader({ "https://www.mon-site.fr/blog": {} }),
    );
    expect(res).toEqual({ ok: false, motif: "site_propre" });
  });

  it("écarte une adresse qui n'en est pas une", async () => {
    const res = await checkProposal(
      site({ page: "ecole-exemple ressources" }),
      "mon-site.fr",
      reader({}),
    );
    expect(res).toEqual({ ok: false, motif: "adresse_invalide" });
  });

  it("écarte une page injoignable ou interdite par robots.txt", async () => {
    const down = await checkProposal(
      site(),
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": { status: 0, unreachable: true } }),
    );
    const robots = await checkProposal(
      site(),
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": { blockedByRobots: true, status: 0 } }),
    );
    expect(down).toEqual({ ok: false, motif: "injoignable" });
    expect(robots).toEqual({ ok: false, motif: "robots" });
  });
});

describe("verifyProposals", () => {
  it("sépare les sites gardés et écartés, avec le taux d'écart", async () => {
    const known = {
      "https://ecole-exemple.fr/ressources": {},
      "https://blog-test.fr/liste": {},
    };
    const sites = [
      site(),
      site({ domaine: "blog-test.fr", page: "https://blog-test.fr/liste" }),
      site({ domaine: "fantome.fr", page: "https://fantome.fr/inexistante" }),
      site({ domaine: "ecole-exemple.fr", page: "https://ecole-exemple.fr/ressources" }),
    ];
    const check = await verifyProposals(sites, "mon-site.fr", reader(known), [
      "calendrier scolaire",
    ]);
    expect(check.proposed).toBe(4);
    expect(check.kept.map((k) => k.domaine).sort()).toEqual(["blog-test.fr", "ecole-exemple.fr"]);
    expect(check.rejected.map((r) => r.motif).sort()).toEqual(["doublon", "statut_http"]);
    expect(check.gapRate).toBeCloseTo(2 / 4);
    expect(check.themes).toEqual(["calendrier scolaire"]);
  });

  it("ne garde jamais une adresse dont la vérification a échoué", async () => {
    const check = await verifyProposals([site()], "mon-site.fr", reader({}));
    expect(check.kept).toEqual([]);
    expect(check.gapRate).toBe(1);
  });

  it("taux d'écart nul sans proposition", async () => {
    const check = await verifyProposals([], "mon-site.fr", reader({}));
    expect(check.gapRate).toBeNull();
    expect(gapLabel(check)).toBe("Aucune proposition de Claude.");
  });

  it("affiche le taux d'écart dans le rapport", async () => {
    const check = await verifyProposals(
      [site(), site({ page: "https://ecole-exemple.fr/absente" })],
      "mon-site.fr",
      reader({ "https://ecole-exemple.fr/ressources": {} }),
    );
    expect(gapLabel(check)).toBe("1 sur 2 propositions écartées (50 %).");
  });
});

describe("proposeVerifiedSites", () => {
  const fakeLlm = (data: unknown, costUsd = 0.04) =>
    ({ generate: async () => ({ data, costUsd }) }) as unknown as LlmClient;

  it("sans client LLM, ne fait aucun appel et ne propose rien", async () => {
    const res = await proposeVerifiedSites({
      domain: "mon-site.fr",
      language: "fr",
      profile,
      llm: null,
      read: reader({}),
      workspaceId: null,
    });
    expect(res).toBeNull();
  });

  it("une sortie du modèle non conforme ne produit aucun site", async () => {
    const llm = fakeLlm({ themes: "pas une liste", sites: 42 });
    const res = await proposeVerifiedSites({
      domain: "mon-site.fr",
      language: "fr",
      profile,
      llm,
      read: reader({}),
      workspaceId: null,
    });
    expect(res).toBeNull();
  });

  it("vérifie chaque proposition et renvoie le coût de l'appel", async () => {
    const llm = fakeLlm(
      {
        themes: ["calendrier scolaire"],
        sites: [site(), site({ domaine: "fantome.fr", page: "https://fantome.fr/x" })],
      },
      0.04,
    );
    const res = await proposeVerifiedSites({
      domain: "mon-site.fr",
      language: "fr",
      profile,
      searchConsoleQueries: ["calendrier scolaire 2027"],
      llm,
      read: reader({ "https://ecole-exemple.fr/ressources": {} }),
      workspaceId: null,
    });
    expect(res?.costUsd).toBe(0.04);
    expect(res?.check.kept).toHaveLength(1);
    expect(res?.check.gapRate).toBeCloseTo(0.5);
  });

  it("un échec du LLM ne lève pas et ne propose rien", async () => {
    const llm = {
      generate: async () => {
        throw new Error("panne");
      },
    } as unknown as LlmClient;
    const res = await proposeVerifiedSites({
      domain: "mon-site.fr",
      language: "fr",
      profile,
      llm,
      read: reader({}),
      workspaceId: null,
    });
    expect(res).toBeNull();
  });
});

describe("hostnameOf", () => {
  it("ignore le www et refuse les adresses non web", () => {
    expect(hostnameOf("https://www.Exemple.fr/a")).toBe("exemple.fr");
    expect(hostnameOf("mailto:a@b.fr")).toBeNull();
    expect(PROPOSAL_LIMITS.maxSites).toBe(15);
  });
});
