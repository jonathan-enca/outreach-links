import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { fr } from "../../../messages/fr";
import { formatParisDate, parseParisDate } from "./dates";
import { buildContentJsonLd } from "./json-ld";
import { blogNavLink, buildLlmsTxt, contentNavLinks, contentSitemapEntries } from "./listing";
import {
  allContent,
  ContentError,
  findPublished,
  isPublished,
  parseContent,
  publishedIn,
  readContentDir,
  relatedTo,
  sectionsWithContent,
} from "./loader";
import { CTA_MARKER, readingMinutes, renderBody, renderInline, slugify, splitAtCta } from "./markdown";
import { sectionStaticParams } from "./pages";

const head = (extra = "", slug = "mon-article") => `---
title: "Un titre"
description: "Une description."
slug: ${slug}
keyword: "mot-clé"
theme: methode
publishedAt: 2026-11-25
${extra}
---
`;
const BODY = "## Première partie\n\nDu texte.\n";
const doc = (extra = "", slug = "mon-article", body = BODY) => head(extra, slug) + body;

describe("dates à l'heure de Paris", () => {
  it("une date sans heure vaut minuit à Paris, été comme hiver", () => {
    expect(parseParisDate("2026-11-25")?.toISOString()).toBe("2026-11-24T23:00:00.000Z");
    expect(parseParisDate("2026-07-01")?.toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(parseParisDate("2026-11-25T08:30")?.toISOString()).toBe("2026-11-25T07:30:00.000Z");
  });

  it("refuse un fuseau explicite, une date impossible ou un texte libre", () => {
    expect(parseParisDate("2026-11-25T08:00:00Z")).toBeNull();
    expect(parseParisDate("2026-02-31")).toBeNull();
    expect(parseParisDate("demain")).toBeNull();
  });

  it("affiche le jour de Paris, pas le jour UTC", () => {
    expect(formatParisDate(parseParisDate("2026-11-22")!)).toBe("22 novembre 2026");
  });
});

describe("en-tête", () => {
  it("lit un en-tête minimal et applique les valeurs par défaut", () => {
    const e = parseContent("blog", "mon-article", doc());
    expect(e.href).toBe("/blog/mon-article");
    expect(e.meta.draft).toBe(false);
    expect(e.meta.author).toBe("jonathan");
    expect(e.meta.updatedAt).toEqual(e.meta.publishedAt);
    expect(e.meta.publishedAt.toISOString()).toBe("2026-11-24T23:00:00.000Z");
    expect(e.meta.summary).toEqual([]);
  });

  it("refuse, en nommant le fichier et le champ : clé inconnue, thème inconnu, date illisible, champ manquant", () => {
    const fails = (raw: string, pattern: RegExp) => {
      expect(() => parseContent("blog", "mon-article", raw)).toThrow(ContentError);
      expect(() => parseContent("blog", "mon-article", raw)).toThrow(pattern);
    };
    fails(doc("titre: oups"), /content\/blog\/mon-article\.md/);
    fails(doc().replace("theme: methode", "theme: cuisine"), /theme/);
    fails(doc().replace("2026-11-25", "25/11/2026"), /publishedAt/);
    fails(doc().replace('description: "Une description."\n', ""), /description/);
    fails(doc("updatedAt: 2026-11-01"), /updatedAt/);
    fails(doc("related:\n  - mon-autre-article"), /related/);
  });

  it("refuse un slug différent du nom du fichier, un titre # dans le corps et un corps vide", () => {
    expect(() => parseContent("blog", "autre-nom", doc())).toThrow(/slug/);
    expect(() => parseContent("blog", "mon-article", doc("", "mon-article", "# Titre\n"))).toThrow(
      /titre/,
    );
    expect(() => parseContent("blog", "mon-article", head())).toThrow(/vide/);
  });
});

describe("brouillon et date de publication", () => {
  const before = new Date("2026-11-24T22:59:00Z");
  const after = new Date("2026-11-24T23:00:00Z");
  const scheduled = parseContent("blog", "mon-article", doc());
  const draft = parseContent("guides", "brouillon", doc("draft: true", "brouillon"));
  const entries = [scheduled, draft];

  it("un contenu programmé n'est en ligne qu'à partir de sa date, heure de Paris", () => {
    expect(isPublished(scheduled, before)).toBe(false);
    expect(isPublished(scheduled, after)).toBe(true);
    expect(findPublished("blog", "mon-article", before, entries)).toBeUndefined();
    expect(findPublished("blog", "mon-article", after, entries)?.slug).toBe("mon-article");
  });

  it("un brouillon n'est jamais en ligne, même une fois sa date passée", () => {
    expect(isPublished(draft, new Date("2030-01-01T00:00:00Z"))).toBe(false);
    expect(publishedIn("guides", after, entries)).toEqual([]);
    expect(sectionsWithContent(after, entries)).toEqual(["blog"]);
  });

  it("sitemap, liens et llms.txt ne montrent que ce qui est en ligne, et jamais une rubrique vide", () => {
    expect(contentSitemapEntries(before, entries)).toEqual([]);
    expect(contentSitemapEntries(after, entries).map((e) => e.path)).toEqual([
      "/blog",
      "/blog/mon-article",
    ]);
    expect(contentNavLinks(before, entries)).toEqual([]);
    expect(contentNavLinks(after, entries)).toEqual([{ href: "/blog", label: "Blog" }]);
    expect(blogNavLink(before, entries)).toBeNull();
    expect(blogNavLink(after, entries)?.href).toBe("/blog");
    expect(buildLlmsTxt(before, entries)).not.toContain("/blog/mon-article");
    const txt = buildLlmsTxt(after, entries);
    expect(txt).toContain("- [Un titre](http://localhost:3000/blog/mon-article): Une description.");
    expect(txt).not.toContain("brouillon");
    expect(txt.startsWith(`# ${fr.app.name}\n\n> `)).toBe(true);
  });

  it("le lien « Blog » de l'en-tête attend un article de blog, pas seulement un guide", () => {
    const guide = parseContent("guides", "mon-article", doc());
    expect(blogNavLink(after, [guide])).toBeNull();
    expect(contentNavLinks(after, [guide])).toEqual([{ href: "/guides", label: "Guides" }]);
  });
});

describe("lecture d'un dossier", () => {
  it("lit les quatre rubriques, ignore le reste, trie du plus récent au plus ancien", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "contenus-"));
    for (const s of ["blog", "glossaire", "brouillons"]) mkdirSync(path.join(dir, s));
    writeFileSync(path.join(dir, "README.md"), "# Guide");
    writeFileSync(path.join(dir, "brouillons", "x.md"), "pas un contenu");
    writeFileSync(path.join(dir, "blog", "notes.txt"), "pas un contenu");
    writeFileSync(path.join(dir, "blog", "ancien.md"), doc("", "ancien"));
    writeFileSync(
      path.join(dir, "glossaire", "recent.md"),
      doc("", "recent").replace("2026-11-25", "2026-12-01"),
    );
    expect(readContentDir(dir).map((e) => e.href)).toEqual(["/glossaire/recent", "/blog/ancien"]);
  });

  it("un fichier invalide fait échouer tout le chargement", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "contenus-"));
    mkdirSync(path.join(dir, "blog"));
    writeFileSync(path.join(dir, "blog", "casse.md"), "---\ntitle: seul\n---\nTexte\n");
    expect(() => readContentDir(dir)).toThrow(/content\/blog\/casse\.md/);
  });
});

describe("rendu Markdown", () => {
  it("sommaire tiré des titres ##, avec libellé court entre accolades et ancres uniques", () => {
    const { toc, before } = renderBody(
      "## Un titre long et précis {Titre court}\n\nTexte\n\n### Sous-titre\n\n## Été à l'école\n\n## Été à l'école\n",
    );
    expect(toc).toEqual([
      { id: "un-titre-long-et-precis", label: "Titre court" },
      { id: "ete-a-l-ecole", label: "Été à l'école" },
      { id: "ete-a-l-ecole-2", label: "Été à l'école" },
    ]);
    expect(before).toContain('<h2 id="un-titre-long-et-precis">Un titre long et précis</h2>');
    expect(before).toContain("<h3>Sous-titre</h3>");
    expect(before).not.toContain("{");
    expect(slugify("« Backlinks » : 1 000 € ?")).toBe("backlinks-1-000");
  });

  it("listes, tableau enveloppé pour défiler sur mobile, liens, gras, code en ligne", () => {
    const { before } = renderBody(
      "- **Un** point\n\n| A | B |\n| --- | --- |\n| 1 | `nofollow` |\n\n[interne](/guides/x) et [externe](https://exemple.fr)\n",
    );
    expect(before).toContain("<li><strong>Un</strong> point</li>");
    expect(before).toMatch(/<div class="art-table"><table>[\s\S]*<\/table>\s*<\/div>/);
    expect(before).toContain("<code>nofollow</code>");
    expect(before).toContain('<a href="/guides/x">interne</a>');
    expect(before).toContain('<a href="https://exemple.fr" rel="noopener">externe</a>');
  });

  it("ne rend ni le HTML ni les commentaires, et neutralise un lien dangereux", () => {
    const { before, words } = renderBody(
      "Avant <!-- À FOURNIR : des chiffres -->\n\n<script>alert(1)</script>\n\n<!-- À FOURNIR : bloc -->\n\n[clic](javascript:alert(1)) <b>gras</b>\n",
    );
    expect(before).not.toMatch(/FOURNIR|<script|javascript:|<b>/);
    expect(before).toContain("clic");
    // Les commentaires ne comptent pas dans le temps de lecture.
    expect(words).toBe(4);
    expect(renderInline("<img src=x onerror=alert(1)> **ok**")).toBe(" <strong>ok</strong>");
  });

  it("exemple de message : objet, étiquette par défaut, paragraphes, passage surligné", () => {
    const { before } = renderBody(
      "```message\nObjet : un lien mort\n\nBonjour <Claire>,\n\nDans votre article, ==le lien est mort==.\n\nBonne journée,\nJulien\n```\n",
    );
    expect(before).toContain("<span>Objet : un lien mort</span>");
    expect(before).toContain(`<span class="art-pill">${fr.content.article.mailDemoLabel}</span>`);
    expect(before).toContain("<p>Bonjour &lt;Claire&gt;,</p>");
    expect(before).toContain('<mark class="mark-hook">le lien est mort</mark>');
    expect(before).toContain("<p>Bonne journée,<br />Julien</p>");
    const labelled = renderBody("```message\nObjet : x\nÉtiquette : Message réel\n\nCorps\n```\n");
    expect(labelled.before).toContain('<span class="art-pill">Message réel</span>');
    expect(() => renderBody("```message\nBonjour\n```\n")).toThrow(/Objet/);
  });

  it("un bloc de code ordinaire reste du code, et == surligne aussi dans le texte", () => {
    const { before } = renderBody("```html\n<a href=\"x\">==lien==</a>\n```\n\nUn ==passage== cité.\n");
    expect(before).toContain("&lt;a href=");
    expect(before).toContain('Un <mark class="mark-hook">passage</mark> cité.');
  });

  it("appel à l'action : au marqueur s'il existe", () => {
    const [a, b] = splitAtCta(`## Un\n\nTexte\n\n${CTA_MARKER}\n\n## Deux\n`);
    expect(a.trim()).toBe("## Un\n\nTexte");
    expect(b.trim()).toBe("## Deux");
    const r = renderBody(`## Un\n\n${CTA_MARKER}\n\n## Deux\n\n${CTA_MARKER}\n`);
    expect(r.before).toContain("Un");
    expect(r.after).toContain("Deux");
    expect(r.before + r.after).not.toContain("audit-gratuit");
    expect(r.toc.map((x) => x.id)).toEqual(["un", "deux"]);
  });

  it("appel à l'action : sans marqueur, après la troisième section ; en fin de texte s'il y en a moins de quatre", () => {
    const four = "## A\n\na\n\n## B\n\nb\n\n## C\n\nc\n\n## D\n\nd\n";
    const [a, b] = splitAtCta(four);
    expect(a.trim().endsWith("c")).toBe(true);
    expect(b.startsWith("## D")).toBe(true);
    expect(splitAtCta("## A\n\n## B\n\n## C\n")).toEqual(["## A\n\n## B\n\n## C\n", ""]);
    // Un titre ou un marqueur dans un bloc de code ne compte pas.
    const fenced = "## A\n\n```md\n## Faux\n[[audit-gratuit]]\n```\n\n## B\n\n## C\n";
    expect(splitAtCta(fenced)).toEqual([fenced, ""]);
  });

  it("temps de lecture : 200 mots par minute, une minute au moins", () => {
    expect(readingMinutes(40)).toBe(1);
    expect(readingMinutes(1400)).toBe(7);
  });
});

describe("à lire ensuite", () => {
  const make = (section: "blog" | "guides", slug: string, extra = "", date = "2026-11-25") =>
    parseContent(section, slug, doc(extra, slug).replace("2026-11-25", date));
  it("d'abord les contenus cités dans l'en-tête, puis le même thème, puis les autres ; trois au plus, jamais soi-même", () => {
    const a = make("blog", "a", "related:\n  - guides/cite\n  - blog/absent");
    const cite = make("guides", "cite");
    const other = parseContent(
      "blog",
      "autre-theme",
      doc("", "autre-theme").replace("theme: methode", "theme: etude"),
    );
    const same = make("blog", "meme-theme");
    const extra = make("blog", "en-trop");
    expect(relatedTo(a, [other, a, same, cite, extra]).map((e) => e.slug)).toEqual([
      "cite",
      "meme-theme",
      "en-trop",
    ]);
    expect(relatedTo(a, [a])).toEqual([]);
  });
});

describe("données structurées", () => {
  it("Article, fil d'Ariane et FAQ ; DefinedTerm au glossaire", () => {
    const article = parseContent(
      "blog",
      "mon-article",
      doc('faq:\n  - question: "Pourquoi ?"\n    answer: "Parce que **oui**."'),
    );
    const graph = buildContentJsonLd(article)["@graph"] as Record<string, unknown>[];
    expect(graph.map((g) => g["@type"])).toEqual(["Article", "BreadcrumbList", "FAQPage"]);
    expect(graph[0]).toMatchObject({
      headline: "Un titre",
      url: "http://localhost:3000/blog/mon-article",
      datePublished: "2026-11-24T23:00:00.000Z",
    });
    expect(JSON.stringify(graph[2])).toContain("Parce que oui.");
    const term = buildContentJsonLd(parseContent("glossaire", "mon-article", doc()));
    expect((term["@graph"] as Record<string, unknown>[]).map((g) => g["@type"])).toEqual([
      "DefinedTerm",
      "BreadcrumbList",
    ]);
  });
});

describe("contenus du dépôt", () => {
  it("tous les fichiers de content/ sont valides", () => {
    const entries = allContent();
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) expect(e.meta.title.length).toBeGreaterThan(0);
  });

  it("le premier guide suit la maquette : brouillon, sept entrées de sommaire, appel placé par le marqueur, aucun chiffre inventé", () => {
    const guide = allContent().find((e) => e.href === "/guides/backlinks-gratuits");
    expect(guide?.meta.draft).toBe(true);
    expect(guide?.body.toc.map((x) => x.label)).toEqual([
      "Ce qu'on vous propose",
      "Pourquoi ça ne fait rien bouger",
      "Ce qui reste utile",
      "Les liens qu'on demande",
      "Une bonne demande",
      "Ce que ça coûte",
    ]);
    expect(guide?.body.before).toContain("Vos profils de marque");
    expect(guide?.body.after.trimStart().startsWith("<h2")).toBe(true);
    expect(guide?.body.after).not.toContain("FOURNIR");
    expect(sectionStaticParams("guides")).not.toContainEqual({ slug: "backlinks-gratuits" });
  });

  it("sitemap : les pages fixes, et aucun brouillon ni index vide", () => {
    const urls = sitemap().map((u) => u.url);
    expect(urls).toContain("http://localhost:3000");
    expect(urls).toContain("http://localhost:3000/mentions-legales");
    const now = new Date();
    const live = allContent().filter((e) => isPublished(e, now));
    for (const e of allContent()) {
      expect(urls.includes(`http://localhost:3000${e.href}`)).toBe(live.includes(e));
    }
    for (const s of ["guides", "blog", "glossaire", "comparatifs"]) {
      expect(urls.includes(`http://localhost:3000/${s}`)).toBe(live.some((e) => e.section === s));
    }
  });

  it("textes des appels à l'action : ceux de la maquette, sans promesse de résultat", () => {
    const c = fr.content.cta;
    expect(c.inline.button).toBe("Voir qui pourrait me citer");
    expect(c.side.button).toBe("Trouver mes liens manquants");
    expect(c.final.button).toBe("Trouver mes premières cibles");
    expect(JSON.stringify(fr.content)).not.toMatch(/garanti|!/);
  });
});
