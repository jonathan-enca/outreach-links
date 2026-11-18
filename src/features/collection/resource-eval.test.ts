import { describe, expect, it } from "vitest";
import type { LlmClient } from "@/lib/llm/client";
import { COLLECTION_LIMITS } from "./limits";
import { RESOURCE_EVAL_SITES } from "./resource-eval-set";
import {
  buildResourcesPrompt,
  describeCandidates,
  pickResources,
  presentationOf,
  RESOURCES_SYSTEM,
} from "./resource-judge";
import { planResources } from "./resources";

/** Cohérence du jeu annoté du choix des ressources comparables (MC.6b) : sans réseau ni modèle. */
describe("jeu d'évaluation du choix des ressources", () => {
  it("deux thèmes, des ressources comparables et les faux amis constatés le 18/11", () => {
    expect(RESOURCE_EVAL_SITES.map((s) => s.id)).toEqual(["coloriages", "donnees"]);
    for (const s of RESOURCE_EVAL_SITES) {
      const domains = s.cases.map((x) => x.candidate.domain);
      expect(new Set(domains).size, s.id).toBe(domains.length);
      expect(s.cases.filter((x) => x.comparable).length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.cases.filter((x) => !x.comparable).length, s.id).toBeGreaterThanOrEqual(6);
      // Les deux origines proposées au modèle sont représentées.
      expect(new Set(s.cases.map((x) => x.candidate.origin)).size, s.id).toBe(2);
      expect(s.cases.every((x) => x.note.length > 3 && x.candidate.title)).toBe(true);
    }
  });

  it("aucun mot propre à un thème dans la consigne ; les candidats arrivent comme des données", () => {
    expect(RESOURCES_SYSTEM).not.toMatch(/coloriage|rgpd|données personnelles|antivirus/i);
    const s = RESOURCE_EVAL_SITES[0]!;
    const prompt = buildResourcesPrompt(
      s.site,
      s.cases.map((x) => x.candidate),
      6,
      s.language,
    );
    expect(prompt).toContain("<donnees_non_fiables>");
    for (const x of s.cases) expect(prompt).toContain(x.candidate.domain);
  });

  it("un choix parfait a une précision et un rappel de 1 ; un domaine inventé est ignoré", async () => {
    for (const s of RESOURCE_EVAL_SITES) {
      const good = s.cases.filter((x) => x.comparable).map((x) => x.candidate.domain);
      const llm = {
        generate: async () => ({
          data: {
            choix: [
              ...good.map((domaine) => ({ domaine, raison: "même offre" })),
              { domaine: "site-invente.fr", raison: "n'existe pas dans la liste" },
            ],
          },
          costUsd: 0.0005,
        }),
      } as unknown as LlmClient;
      const picked = await pickResources({
        llm,
        site: s.site,
        candidates: s.cases.map((x) => x.candidate),
        max: 6,
        language: s.language,
        workspaceId: null,
        auditId: null,
      });
      expect(picked?.resources, s.id).toEqual(good);
    }
  });

  it("la présentation d'un candidat vient de sa page d'accueil (titre et description), jamais inventée", async () => {
    expect(
      presentationOf(
        '<html><head><title> Étiquettes  personnalisées </title><meta name="description" content="Pour les vêtements et les fournitures."></head></html>',
      ),
    ).toBe("Étiquettes personnalisées — Pour les vêtements et les fournitures.");
    expect(presentationOf("<html><body>rien</body></html>")).toBeNull();
    const seen: string[] = [];
    const described = await describeCandidates(
      [
        {
          domain: "a.fr",
          title: null,
          url: null,
          queries: 0,
          origin: "audit",
          referringDomains: 1,
        },
        {
          domain: "muet.fr",
          title: null,
          url: null,
          queries: 0,
          origin: "audit",
          referringDomains: 1,
        },
        {
          domain: "deja.fr",
          title: null,
          url: null,
          queries: 2,
          origin: "recherche",
          referringDomains: null,
          presentation: "Déjà connue",
        },
      ],
      async (url) => {
        seen.push(url);
        return url.includes("muet") ? null : { status: 200, text: "<title>Site A</title>" };
      },
    );
    expect(described.map((c) => c.presentation)).toEqual(["Site A", null, "Déjà connue"]);
    expect(seen.sort()).toEqual(["https://a.fr/", "https://muet.fr/"]);
    // La présentation part dans le prompt, dans la zone des données non fiables.
    const prompt = buildResourcesPrompt(RESOURCE_EVAL_SITES[0]!.site, described, 6, "fr");
    expect(prompt).toContain('"presentation":"Site A"');
    expect(RESOURCES_SYSTEM).toContain("jamais sur sa place dans la liste");
  });

  it("les concurrents non retenus par l'audit sont proposés au choix, jamais pris sans jugement", () => {
    const retained = ["vendeur-etiquettes.fr", "editeur-livres.fr"];
    const others = Array.from({ length: 50 }, (_, i) => ({
      domain: `site-comparable-${i}.fr`,
      referringDomains: 100,
      sampleUrl: null,
    }));
    const plan = planResources({
      competitorDomains: retained,
      competitors: retained.map((domain) => ({ domain, referringDomains: 500, sampleUrl: null })),
      otherCompetitors: [
        ...others,
        // Déjà retenu : jamais deux fois. Très gros site : écarté d'avance, avec son motif.
        { domain: "editeur-livres.fr", referringDomains: 500, sampleUrl: null },
        { domain: "tres-gros-site.com", referringDomains: 900_000, sampleUrl: null },
      ],
      language: "fr",
    });
    const pool = plan.pool.map((p) => p.domain);
    expect(pool.slice(0, 2)).toEqual(retained);
    expect(pool).toContain("site-comparable-0.fr");
    expect(pool).toHaveLength(COLLECTION_LIMITS.citations.poolSize);
    expect(new Set(pool).size).toBe(pool.length);
    expect(pool).not.toContain("tres-gros-site.com");
    // Sans le jugement du modèle, on retombe sur les seuls concurrents retenus (comportement inchangé).
    expect(plan.resources).toEqual(retained);
  });
});
