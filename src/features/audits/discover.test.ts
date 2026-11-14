import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SerpResult } from "@/lib/dataforseo";
import {
  aggregateCompetitors,
  rankWeight,
  selectCompetitors,
  serpEntries,
  resolveRedirect,
  type QueryEntries,
} from "./discover";
import { estimateDiscovery } from "./estimate";
import {
  DEFAULT_EXCLUDED_DOMAINS,
  hostOf,
  isExcludedDomain,
  isOwnDomain,
} from "./excluded-domains";
import { AUDIT_STATUSES, AUDIT_TRANSITIONS, canTransition, PLAN_LIMITS } from "./plans";

const fixture = JSON.parse(
  readFileSync(
    path.join(__dirname, "../../lib/dataforseo/fixtures/serp-organic-live.json"),
    "utf8",
  ),
) as { tasks: { result: SerpResult[] }[] };

function entries(domains: string[]): QueryEntries["entries"] {
  return domains.map((d, i) => ({ rank: i + 1, domain: d, url: `https://${d}/`, title: null }));
}

describe("domaines exclus", () => {
  it("exclut les plateformes génériques et leurs sous-domaines", () => {
    for (const d of [
      "fr.wikipedia.org",
      "www.youtube.com",
      "amazon.fr",
      "smile.amazon.co.uk",
      "pinterest.fr",
      "fr.pinterest.com",
      "monsite.blogspot.com",
      "google.com",
    ]) {
      expect(isExcludedDomain(d), d).toBe(true);
    }
  });
  it("garde les vrais concurrents, même au nom proche", () => {
    for (const d of ["hugolescargot.com", "notamazon.fr", "monwikipedia.org.fr", "youtube-dl.fr"]) {
      expect(isExcludedDomain(d), d).toBe(false);
    }
  });
  it("la liste est configurable", () => {
    expect(isExcludedDomain("rival.fr", ["rival.fr"])).toBe(true);
    expect(isExcludedDomain("rival.fr", [], [])).toBe(false);
    expect(DEFAULT_EXCLUDED_DOMAINS.length).toBeGreaterThan(20);
  });
  it("reconnaît le domaine du site et ses sous-domaines", () => {
    expect(isOwnDomain("www.mega-coloring.com", "mega-coloring.com")).toBe(true);
    expect(isOwnDomain("blog.mega-coloring.com", "https://mega-coloring.com/")).toBe(true);
    expect(isOwnDomain("autre-mega-coloring.com", "mega-coloring.com")).toBe(false);
    expect(hostOf("https://WWW.Exemple.fr:8080/x?y")).toBe("exemple.fr");
  });
});

describe("serpEntries", () => {
  it("garde seulement les résultats organiques de la fixture (pas les PAA)", () => {
    const result = fixture.tasks[0]!.result[0]!;
    const out = serpEntries(result);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((e) => e.domain && !e.domain.startsWith("www."))).toBe(true);
    expect(out[0]).toMatchObject({ rank: 1, domain: "hugolescargot.com" });
  });
  it("ignore les rangs hors top 30, les doublons de rang et les lignes sans URL", () => {
    const result = {
      keyword: "k",
      items: [
        { type: "organic", rank_group: 1, domain: "a.fr", url: "https://a.fr/" },
        { type: "featured_snippet", rank_group: 1, domain: "b.fr", url: "https://b.fr/" },
        { type: "organic", rank_group: 31, domain: "c.fr", url: "https://c.fr/" },
        { type: "organic", rank_group: 2, domain: "d.fr" },
        { type: "video", rank_group: 3, domain: "e.fr", url: "https://e.fr/" },
      ],
    } as SerpResult;
    expect(serpEntries(result).map((e) => e.domain)).toEqual(["a.fr"]);
    expect(serpEntries(null)).toEqual([]);
  });
});

describe("aggregateCompetitors", () => {
  const perQuery: QueryEntries[] = [
    {
      query: "q1",
      entries: entries([
        "wikipedia.org",
        "rival.fr",
        "moi.fr",
        "autre.com",
        "youtube.com",
        "petit.fr",
      ]),
    },
    { query: "q2", entries: entries(["rival.fr", "autre.com", "blog.moi.fr", "amazon.fr"]) },
    { query: "q3", entries: entries(["solo.fr", "rival.fr"]) },
  ];
  const out = aggregateCompetitors(perQuery, { ownDomain: "moi.fr" });

  it("exclut le site, ses sous-domaines et les plateformes", () => {
    const domains = out.map((c) => c.domain);
    expect(domains).not.toContain("moi.fr");
    expect(domains).not.toContain("blog.moi.fr");
    expect(domains).not.toContain("wikipedia.org");
    expect(domains).not.toContain("youtube.com");
    expect(domains).not.toContain("amazon.fr");
  });
  it("trie par couverture de requêtes puis score, de façon déterministe", () => {
    expect(out.map((c) => c.domain)).toEqual(["rival.fr", "autre.com", "solo.fr", "petit.fr"]);
    expect(out[0]).toMatchObject({ queriesCount: 3, appearances: 3, bestRank: 1 });
    expect(out[1]).toMatchObject({ queriesCount: 2, bestRank: 2 });
  });
  it("calcule position moyenne et score", () => {
    const rival = out[0]!;
    expect(rival.avgRank).toBeCloseTo((2 + 1 + 2) / 3, 2);
    expect(rival.score).toBeCloseTo(rankWeight(2) + rankWeight(1) + rankWeight(2), 3);
    expect(rival.sampleUrl).toBe("https://rival.fr/");
  });
  it("compte une requête une seule fois même si le domaine y a plusieurs pages", () => {
    const dup = aggregateCompetitors(
      [
        {
          query: "q",
          entries: [
            { rank: 1, domain: "x.fr", url: "https://x.fr/a", title: null },
            { rank: 5, domain: "x.fr", url: "https://x.fr/b", title: null },
          ],
        },
      ],
      { ownDomain: "moi.fr" },
    );
    expect(dup[0]).toMatchObject({ queriesCount: 1, appearances: 2, bestRank: 1 });
    expect(dup[0]!.sampleUrl).toBe("https://x.fr/a");
  });
});

describe("selectCompetitors", () => {
  const many = aggregateCompetitors(
    [
      { query: "q1", entries: entries(Array.from({ length: 30 }, (_, i) => `site${i}.fr`)) },
      { query: "q2", entries: entries(Array.from({ length: 12 }, (_, i) => `site${i}.fr`)) },
    ],
    { ownDomain: "moi.fr" },
  );
  it("gratuit : 3 concurrents", () => {
    expect(selectCompetitors(many, PLAN_LIMITS.gratuit)).toHaveLength(3);
  });
  it("payant : au plus 20, les multi-requêtes d'abord", () => {
    const sel = selectCompetitors(many, PLAN_LIMITS.payant);
    expect(sel).toHaveLength(12);
    expect(sel.every((c) => c.queriesCount === 2)).toBe(true);
  });
  it("payant : complète jusqu'à 10 avec les meilleurs restants", () => {
    const few = aggregateCompetitors(
      [
        { query: "q1", entries: entries(Array.from({ length: 30 }, (_, i) => `s${i}.fr`)) },
        { query: "q2", entries: entries(["s0.fr", "s1.fr"]) },
      ],
      { ownDomain: "moi.fr" },
    );
    const sel = selectCompetitors(few, PLAN_LIMITS.payant);
    expect(sel).toHaveLength(10);
    expect(sel.slice(0, 2).map((c) => c.domain)).toEqual(["s0.fr", "s1.fr"]);
  });
  it("moins de candidats que le minimum : tous", () => {
    expect(selectCompetitors(many.slice(0, 2), PLAN_LIMITS.payant)).toHaveLength(2);
  });
});

describe("estimation et plans", () => {
  it("estime une SERP top 30 par requête (0,006 USD)", () => {
    const e = estimateDiscovery(["a", "b", "c"], PLAN_LIMITS.gratuit);
    expect(e.calls).toBe(3);
    expect(e.perQuery.every((q) => q.usd === 0.006)).toBe(true);
    expect(e.totalUsd).toBeCloseTo(0.018, 6);
    expect(e.totalUsd).toBeLessThan(PLAN_LIMITS.gratuit.costCapUsd);
  });
  it("le cycle de statuts est linéaire", () => {
    expect(canTransition("en_attente", "estime")).toBe(true);
    expect(canTransition("estime", "confirme")).toBe(true);
    expect(canTransition("confirme", "en_cours")).toBe(true);
    expect(canTransition("en_cours", "termine")).toBe(true);
    expect(canTransition("estime", "en_cours")).toBe(false);
    expect(canTransition("en_attente", "confirme")).toBe(false);
    expect(canTransition("termine", "en_cours")).toBe(false);
    expect(Object.keys(AUDIT_TRANSITIONS)).toEqual([...AUDIT_STATUSES]);
  });
});

describe("resolveRedirect (liens de redirection Google constatés en production)", () => {
  it("garde les résultats normaux", () => {
    expect(resolveRedirect({ url: "https://www.a.fr/page", domain: "www.a.fr" })).toEqual({
      domain: "a.fr",
      url: "https://www.a.fr/page",
    });
  });
  it("reconstruit le site depuis le breadcrumb", () => {
    expect(
      resolveRedirect({
        url: "https://google.com/goto?url=CAES&gsessionid=x",
        domain: "google.com",
        breadcrumb: "https://www.coloriage-en-ligne.net › 207-coloriages-licor...",
      }),
    ).toEqual({ domain: "coloriage-en-ligne.net", url: "https://www.coloriage-en-ligne.net" });
  });
  it("écarte une redirection sans breadcrumb exploitable", () => {
    expect(
      resolveRedirect({ url: "https://google.com/goto?url=x", domain: "google.com" }),
    ).toBeNull();
  });
});
