import { describe, expect, it } from "vitest";
import { fr } from "../../../messages/fr";
import type { FaqItem } from "./faq";
import { HOME_SECTIONS } from "./sections";
import { PROOF_SITES, PROOFS_ARE_ILLUSTRATIVE, proofSummary } from "./proofs";
import { homeNavLinks } from "./site-header";

function texts(value: unknown, skip = new Set<string>()): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => texts(v, skip));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => (skip.has(k) ? [] : texts(v, skip)));
  return [];
}

describe("home FR", () => {
  it("chaque lien de l'en-tête pointe vers une section existante", () => {
    const ids = new Set<string>(Object.values(HOME_SECTIONS));
    for (const l of homeNavLinks()) expect(ids.has(l.href.slice(1))).toBe(true);
  });

  it("aucune promesse de garantie, aucun chiffre de preuve ni prix dans les textes", () => {
    const all = texts(fr.home, new Set(["mockup"])).join("\n");
    expect(all).not.toMatch(/garanti/i);
    expect(all).not.toMatch(/\d\s*(%|€|\$|\s?euros)/);
    expect(all).not.toMatch(/\b(x|×)\s?\d/i);
  });

  it("vouvoiement : pas de « tu / ton / ta » dans les textes", () => {
    const all = texts(fr.home).join("\n");
    expect(all).not.toMatch(/(?<![\p{L}])(tu|ton|ta|tes|toi)(?![\p{L}])/iu);
  });

  it("les sections de MH.3 existent et l'en-tête mène à Tarifs et à la FAQ", () => {
    const hrefs = homeNavLinks().map((l) => l.href);
    expect(hrefs).toContain(`#${HOME_SECTIONS.pricing}`);
    expect(hrefs).toContain(`#${HOME_SECTIONS.faq}`);
    expect(fr.home.faq.items.length).toBeGreaterThanOrEqual(9);
  });

  it("le comparatif est descriptif : aucune marque, aucune note, aucun prix", () => {
    const all = texts(fr.home.compare).join("\n");
    expect(all).not.toMatch(/outlink|backlinkbot|mentionagent|linkee|heylinks|getfluence/i);
    expect(all).not.toMatch(/[✓✗★]|\d\s*\/\s*\d/);
  });

  it("la FAQ ne promet aucun nombre de liens et reste honnête sur le payant et l'IA", () => {
    const faq = texts(fr.home.faq.items).join("\n");
    expect(faq).toMatch(/aucun nombre de liens/i);
    expect(faq).toMatch(/décliner/i);
    expect(faq).toMatch(/honnête/i);
  });

  it("les pages légales sont liées au pied de page et marquées provisoires", () => {
    const slugs = [fr.legalPages.notice, fr.legalPages.privacy, fr.legalPages.terms].map(
      (d) => `/${d.slug}`,
    );
    expect(fr.home.footer.legalLinks.map((l) => l.href)).toEqual(slugs);
    expect(fr.legalPages.provisional).toMatch(/provisoire/i);
  });

  it("l'honnêteté est dite : aucun lien acheté", () => {
    expect(texts(fr.home.whatItIs).join(" ")).toMatch(/ne faisons pas/i);
  });

  it("preuves : les quatre sites du fondateur, chiffres d'illustration signalés, synthèse calculée", () => {
    expect(PROOF_SITES.map((x) => x.domain).sort()).toEqual([
      "mega-coloring.com",
      "oma-and-me.com",
      "remove-me.io",
      "squadraplanning.com",
    ]);
    // Tant que ce sont des chiffres inventés, le bandeau d'avertissement doit exister.
    expect(PROOFS_ARE_ILLUSTRATIVE).toBe(true);
    expect(fr.home.proofs.illustrative).toMatch(/illustration/i);
    for (const s of PROOF_SITES) {
      expect(s.series[0]).toBe(s.authority.from);
      expect(s.series.at(-1)).toBe(s.authority.to);
      // Aucune vraie source de liens inventée : les domaines cités sont des exemples.
      for (const l of s.linkedFrom) expect(l.domain.startsWith("exemple-")).toBe(true);
    }
    const sum = proofSummary();
    expect(sum.links).toBe(
      PROOF_SITES.reduce((n, s) => n + s.metrics.find((m) => m.label === "links")!.to, 0),
    );
    expect(sum.trafficRatio).toBeGreaterThan(1);
  });

  it("tous les boutons « essai gratuit » mènent à l'inscription, « Fonctionnement » à « Comment ça marche »", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const dir = new URL(".", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
    for (const f of files) {
      const src = readFileSync(new URL(f, dir), "utf8");
      // L'audit gratuit n'est plus sur la home : aucune ancre #audit ne doit rester.
      expect(src, f).not.toMatch(/#audit/);
    }
    expect(fr.home.hero.cta).toEqual({ primary: "Essai gratuit", secondary: "Fonctionnement" });
    expect(fr.home.nav.cta).toBe("Essai gratuit");
    const hero = readFileSync(new URL("hero.tsx", dir), "utf8");
    expect(hero).toContain('href="/inscription"');
    expect(hero).toContain("HOME_SECTIONS.howItWorks");
  });

  it("la section « Le problème » n'existe plus : Tactiques la remplace, juste après « C'est quoi »", async () => {
    const { readFileSync } = await import("node:fs");
    expect(Object.keys(HOME_SECTIONS)).not.toContain("problem");
    expect(Object.keys(fr.home)).not.toContain("problem");
    const page = readFileSync(new URL("../../app/page.tsx", import.meta.url), "utf8");
    expect(page).not.toMatch(/Problem/);
    expect(page.indexOf("<WhatItIs />")).toBeLessThan(page.indexOf("<Tactics />"));
    expect(page.indexOf("<Tactics />")).toBeLessThan(page.indexOf("<Proofs />"));
  });

  it("home allégée : ni « Dans le détail » ni « Fonctions », l'en-tête mène aux tactiques et au parcours", () => {
    expect(Object.keys(HOME_SECTIONS)).not.toContain("quality");
    expect(Object.keys(HOME_SECTIONS)).not.toContain("features");
    expect(Object.keys(fr.home)).not.toContain("quality");
    expect(Object.keys(fr.home)).not.toContain("features");
    expect(homeNavLinks().map((l) => l.href)).toEqual([
      `#${HOME_SECTIONS.tactics}`,
      `#${HOME_SECTIONS.howItWorks}`,
      `#${HOME_SECTIONS.pricing}`,
      `#${HOME_SECTIONS.faq}`,
    ]);
  });

  it("comment ça marche : six étapes, un écran par étape, la part de l'utilisateur est dite", () => {
    const how = fr.home.how;
    expect(how.steps).toHaveLength(6);
    expect(how.mockup.bars).toHaveLength(how.steps.length);
    expect(how.steps.filter((s) => s.role === "you")).toHaveLength(3);
    // Les écrans sont des exemples : aucun vrai domaine.
    const domains = texts(how.mockup)
      .join(" ")
      .match(/[a-z0-9-]+\.(fr|com|net|org|io)\b/g);
    expect(domains).toBeNull();
  });

  it("vocabulaire du produit actuel : ni « lot », ni « inbox », ni « audit », et l'envoi suit le vrai moteur", () => {
    const all = texts(fr.home).join("\n");
    // L'espace client dit « À valider », « Conversations » et « analyse » : la home aussi.
    expect(all).not.toMatch(/(?<![\p{L}])(lots?|inbox|audits?)(?![\p{L}])/iu);
    // Le plafond horaire n'est pas le rythme réel (cinq par jour la première semaine) : il n'est plus annoncé.
    expect(all).not.toMatch(/(dix|10) (emails|envois) (par|\/) ?heure/i);
    // Chaque exemple de demande donne l'adresse de la page contactée et celle de la page proposée.
    for (const it of fr.home.tactics.items) {
      expect(it.example.body.match(/[a-z-]+\.example/g)?.length).toBe(2);
    }
  });

  it("FAQ : qui envoie, comment relier sa boîte, quelles messageries, d'après la liste des guides", () => {
    const items: readonly FaqItem[] = fr.home.faq.items;
    const find = (re: RegExp) => items.find((i) => re.test(i.q));
    expect(find(/qui envoie/i)?.a).toMatch(/votre propre adresse/);
    const how = find(/relier ma boîte/i);
    expect(how?.a).toMatch(/mot de passe d'application/);
    expect(how?.link?.href).toBe("/aide/boite-envoi");
    const compat = find(/messageries sont compatibles/i);
    const [yes, no] = compat!.a.split("Pas encore compatibles");
    expect(no).toBeDefined();
    // Nom court d'un fournisseur : « Yahoo Mail » se dit « Yahoo », « Bouygues Telecom » « Bouygues ».
    const short = (name: string) => name.replace(/ (Mail|Telecom)$/, "");
    // Une messagerie dite compatible l'est dans les guides, et inversement : à mettre à jour ensemble.
    for (const p of fr.mailboxGuides.providers) {
      if (p.slug === "autre") continue;
      expect(p.compatible ? yes : no, p.name).toContain(short(p.name));
      if (!p.compatible) expect(yes, p.name).not.toContain(short(p.name));
    }
  });

  it("offre d'entrée : 7 jours d'essai, plus aucune référence à un audit gratuit sur la home", () => {
    const all = texts(fr.home).join("\n");
    expect(all).not.toMatch(/audit (gratuit|réduit)/i);
    expect(fr.home.hero.pill).toMatch(/7 jours d'essai/);
    expect(fr.home.pricing.free.title).toMatch(/7 jours d'essai/);
    expect(Object.keys(fr.home.faq)).not.toContain("intro");
  });

  it("cible : sites, blogs, SaaS et e-commerces", () => {
    for (const text of [fr.home.hero.audience, fr.home.whatItIs.intro]) {
      expect(text).toMatch(/sites, blogs, SaaS et e-commerces/);
    }
  });

  it("tarifs : trois offres payantes, un bandeau gratuit, aucune preuve sociale inventée", () => {
    const p = fr.home.pricing;
    expect(Object.keys(p.plans)).toEqual(["starter", "pro", "business"]);
    expect(p.free.cta).toBe("Essai gratuit");
    // Les trois tactiques sont dans toutes les offres : la grille n'en parle pas. Prix affichés TTC.
    expect(texts(p).join(" ")).not.toMatch(/tactique/i);
    expect(p.perMonth).toMatch(/TTC/);
    // Aucun client pour l'instant : pas de « le plus choisi ».
    expect(texts(p).join(" ")).not.toMatch(/plus choisi|populaire/i);
  });

  it("tactiques : trois tactiques détaillées (étapes, cibles, exemple), boutons conformes, aucune promesse", () => {
    const tac = fr.home.tactics;
    expect(tac.items).toHaveLength(3);
    for (const it of tac.items) {
      expect(it.steps.length).toBeGreaterThanOrEqual(3);
      // L'exemple de demande suit les règles des vrais messages : court, adresse d'exemple, pas d'IA.
      expect(it.example.body.length).toBeLessThan(320);
      expect(it.example.body).not.toMatch(/\bIA\b|intelligence artificielle/i);
    }
    expect([tac.primary, tac.secondary]).toEqual(["Essai gratuit", "Fonctionnement"]);
    expect(texts(tac).join(" ")).not.toMatch(/garanti|digest/i);
  });
});
