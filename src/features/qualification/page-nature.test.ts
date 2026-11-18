import { describe, expect, it } from "vitest";
import { pageNatureOf } from "./page-nature";
import { runFreeStages, stageOneReason } from "./free";
import type { QualCandidate, QualContext } from "./types";

describe("nature d'une page reconnue par son adresse (MC.1 / MC.6a)", () => {
  it("pages d'accueil : racine, index, langue seule", () => {
    for (const u of [
      "https://exemple.fr",
      "https://exemple.fr/",
      "https://www.exemple.fr/index.html",
      "https://exemple.fr/fr/",
      "https://exemple.fr/fr-fr",
      "https://exemple.fr/accueil",
      "https://exemple.fr/?utm_source=x",
    ]) {
      expect(pageNatureOf(u), u).toBe("page_accueil");
    }
  });

  it("une adresse à paramètre de contenu n'est pas une accueil", () => {
    expect(pageNatureOf("https://exemple.fr/?p=123")).toBeNull();
    expect(pageNatureOf("https://exemple.fr/?page_id=4")).toBeNull();
  });

  it("pages paginées d'annuaire écartées (MC.6c), mais jamais un article ni la page 1", () => {
    for (const u of [
      "https://annuaire.fr/categorie/achat-en-ligne/page-33",
      "https://annuaire.fr/liste/page/2",
      "https://annuaire.fr/sites/p7",
      "https://annuaire.fr/sites/page-7.html",
      "https://annuaire.fr/sites?page=3",
      "https://annuaire.fr/blog?paged=2",
    ]) {
      expect(pageNatureOf(u), u).toBe("page_paginee");
    }
    for (const u of [
      "https://exemple.fr/blog/page-1",
      "https://exemple.fr/blog?page=1",
      "https://exemple.fr/?p=123",
      "https://exemple.fr/blog/guide-page-2-du-livre",
      "https://exemple.fr/page-de-garde-coloriage",
    ]) {
      expect(pageNatureOf(u), u).toBeNull();
    }
  });

  it("pages légales reconnues par la forme du segment, en français et en anglais", () => {
    for (const u of [
      "https://exemple.fr/mentions-legales",
      "https://exemple.fr/mentions-legales/",
      "https://exemple.fr/Mentions_Légales.html",
      "https://exemple.fr/cgu",
      "https://exemple.fr/cgv",
      "https://exemple.fr/conditions-generales-de-vente",
      "https://exemple.fr/politique-de-confidentialite",
      "https://exemple.fr/notre-politique-de-confidentialite",
      "https://exemple.fr/legal/privacy",
      "https://exemple.fr/en/privacy-policy",
      "https://exemple.fr/politique-de-cookies",
      "https://exemple.fr/terms-of-service",
    ]) {
      expect(pageNatureOf(u), u).toBe("page_legale");
    }
  });

  it("GÉNÉRALITÉ : un mot du thème n'est pas une page légale (site sur le RGPD, la vie privée, les cookies)", () => {
    for (const u of [
      "https://blog.fr/rgpd-ce-qui-change-pour-les-associations",
      "https://blog.fr/donnees-personnelles",
      "https://blog.fr/protection-des-donnees-personnelles-au-college",
      "https://blog.fr/guide/supprimer-son-compte-linkedin",
      "https://blog.fr/cookies-et-navigation-privee-que-faire",
      "https://blog.fr/legal-tech-lessentiel-sur-les-startups",
    ]) {
      expect(pageNatureOf(u), u).toBeNull();
    }
  });

  it("fichiers et flux", () => {
    for (const u of [
      "https://exemple.fr/doc/guide.pdf",
      "https://exemple.fr/feed",
      "https://exemple.fr/blog/rss.xml",
      "https://exemple.fr/images/logo.PNG",
      "https://exemple.fr/sitemap.xml",
    ]) {
      expect(pageNatureOf(u), u).toBe("fichier");
    }
  });

  it("une page de contenu, une adresse illisible ou absente ne sont jamais écartées ici", () => {
    expect(pageNatureOf("https://ecole-dupont.fr/liens-utiles/coloriages")).toBeNull();
    expect(pageNatureOf("https://exemple.fr/2024/05/mon-article")).toBeNull();
    expect(pageNatureOf("pas une adresse")).toBeNull();
    expect(pageNatureOf(null)).toBeNull();
    expect(pageNatureOf("ftp://exemple.fr/")).toBeNull();
  });
});

const ctx: QualContext = {
  ownDomain: "mon-site.fr",
  competitorDomains: [],
  suppressedDomains: [],
  contactedElsewhere: [],
  language: "fr",
} as unknown as QualContext;

const cand = (
  url: string | null,
  source: QualCandidate["sources"][number]["source"] = "serp",
): QualCandidate => ({
  domain: "petit-blog.fr",
  url,
  title: null,
  tactics: ["ressources"],
  sources: [{ source, query: null, persona: null, rank: null, pageType: null }],
  competitorsCount: 0,
  domainRank: null,
  spamScore: null,
  pageType: null,
  signalCount: 1,
});

describe("étage 1 : nature de la page avant lecture", () => {
  it("écarte accueil, page légale et fichier avec un motif lisible", () => {
    expect(stageOneReason(cand("https://petit-blog.fr/"), ctx)?.reason).toBe("page_accueil");
    expect(stageOneReason(cand("https://petit-blog.fr/mentions-legales"), ctx)?.reason).toBe(
      "page_legale",
    );
    expect(stageOneReason(cand("https://petit-blog.fr/a.pdf"), ctx)?.reason).toBe("fichier");
    expect(stageOneReason(cand("https://petit-blog.fr/mes-liens"), ctx)).toBeNull();
    expect(stageOneReason(cand(null), ctx)).toBeNull();
  });

  it("exception : une accueil reste candidate pour une mention sans lien ou un lien mort annoncé", () => {
    expect(stageOneReason(cand("https://petit-blog.fr/", "mention"), ctx)).toBeNull();
    expect(stageOneReason(cand("https://petit-blog.fr/", "lien_mort"), ctx)).toBeNull();
    // mais jamais pour une page légale
    expect(stageOneReason(cand("https://petit-blog.fr/cgu", "lien_mort"), ctx)?.reason).toBe(
      "page_legale",
    );
  });

  it("une page qui cite une ressource passe avant les autres dans l'ordre de lecture", () => {
    const out = runFreeStages(
      [
        { ...cand("https://a.fr/x"), domain: "a.fr" },
        { ...cand("https://b.fr/y", "citation"), domain: "b.fr" },
      ],
      ctx,
    );
    expect(out[0]!.candidate.domain).toBe("b.fr");
  });
});
