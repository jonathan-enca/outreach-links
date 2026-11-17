import { describe, expect, it } from "vitest";
import type { ContactResult } from "@/features/contacts/types";
import type { LlmClient } from "@/lib/llm/client";
import { checkRobotsFor } from "./deps";
import { EVAL_CONTEXT, evalCandidate, evalPage } from "./eval-set";
import { runFreeStages } from "./free";
import {
  allocateLot,
  executeQualification,
  laneOf,
  type QualDeps,
  type RobotsCheck,
} from "./funnel";
import { batchWorstUsd, QUALIFY_LIMITS } from "./limits";
import { preReadLanguage, tldLanguages, urlLanguage } from "./prefilter";
import type { QualCandidate } from "./types";

const ctx = EVAL_CONTEXT;
const cand = (domain: string, extra: Partial<QualCandidate> = {}): QualCandidate =>
  evalCandidate({
    id: "t",
    candidate: { domain, ...extra },
    page: null,
    byRules: false,
    keep: true,
  });
const from = (
  source: "serp" | "content" | "intersection" | "lien_mort",
  persona: string | null = null,
) => [{ source, query: null, persona, rank: null, pageType: null }];

describe("filtre avant lecture : la langue visible sans télécharger la page", () => {
  it("langue du fournisseur, segment de l'adresse, extension d'un pays d'une autre langue", () => {
    expect(preReadLanguage({ domain: "a.com", url: null, language: "en" }, ctx)).toContain("en");
    expect(preReadLanguage({ domain: "a.com", url: null, language: "fr" }, ctx)).toBeNull();
    expect(preReadLanguage({ domain: "a.com", url: "https://a.com/en/page" }, ctx)).toBe(
      "adresse en « en »",
    );
    expect(preReadLanguage({ domain: "a.com", url: "https://a.com/en-us/page" }, ctx)).toBe(
      "adresse en « en »",
    );
    expect(preReadLanguage({ domain: "tutos.de", url: "https://tutos.de/bilder" }, ctx)).toBe(
      "extension de domaine « .de »",
    );
    expect(preReadLanguage({ domain: "addaction.org.uk", url: null }, ctx)).not.toBeNull();
    expect(preReadLanguage({ domain: "bart.gov", url: null }, ctx)).not.toBeNull();
  });

  it("jamais d'écart sans signal ; l'adresse dans la langue de la campagne l'emporte", () => {
    expect(preReadLanguage({ domain: "blog.com", url: "https://blog.com/idees" }, ctx)).toBeNull();
    expect(preReadLanguage({ domain: "site.de", url: "https://site.de/fr/idees" }, ctx)).toBeNull();
    // Pays francophones et extensions utilisées comme génériques : jamais écartés sur l'extension.
    for (const d of [
      "ecole.be",
      "club.ch",
      "asso.ca",
      "ville.lu",
      "outil.io",
      "blog.co",
      "moi.me",
    ]) {
      expect(preReadLanguage({ domain: d, url: null }, ctx)).toBeNull();
    }
    expect(tldLanguages("exemple.fr")).toEqual(["fr"]);
    expect(urlLanguage("https://fr.exemple.com/")).toBe("fr");
    expect(urlLanguage("https://exemple.com/enfants/")).toBeNull();
  });

  it("le motif est rangé à l'étage 2, marqué « avant lecture », et le candidat n'est pas supprimé", () => {
    const out = runFreeStages(
      [cand("tutos.de"), cand("blog-famille.fr"), cand("news.com", { language: "en" })],
      ctx,
    );
    const de = out.find((v) => v.candidate.domain === "tutos.de")!;
    expect(de).toMatchObject({ stage: 2, reason: "langue", preRead: true });
    expect(out.find((v) => v.candidate.domain === "news.com")!.reason).toBe("langue");
    expect(out.find((v) => v.candidate.domain === "blog-famille.fr")!.reason).toBeNull();
    expect(out).toHaveLength(3);
  });
});

describe("robots.txt vérifié avant lecture", () => {
  const c = cand("ecole.fr", { url: "https://www.ecole.fr/classe/page" });
  it("interdit, sans réponse, ouvert", async () => {
    const disallow = async () => ({ status: 200, text: "User-agent: *\nDisallow: /" });
    expect(await checkRobotsFor(disallow, c)).toBe("interdit");
    // Pas de réponse dans le délai court : rien n'est conclu, la lecture tranchera.
    expect(await checkRobotsFor(async () => null, c)).toBe("muet");
    expect(await checkRobotsFor(async () => ({ status: 503, text: "" }), c)).toBe("muet");
    expect(await checkRobotsFor(async () => ({ status: 404, text: "" }), c)).toBe("ok");
    const partial = async () => ({ status: 200, text: "User-agent: *\nDisallow: /prive/" });
    expect(await checkRobotsFor(partial, c)).toBe("ok");
  });
  it("la requête part vers l'hôte de la page à lire", async () => {
    const seen: string[] = [];
    await checkRobotsFor(async (u) => {
      seen.push(u);
      return { status: 404, text: "" };
    }, c);
    expect(seen).toEqual(["https://www.ecole.fr/robots.txt"]);
  });
});

describe("répartition d'un lot entre les sources", () => {
  it("premier lot : parts égales ; ensuite la lecture va vers ce qui rapporte", () => {
    const remaining = new Map([
      ["content", 300],
      ["intersection", 150],
      ["serp", 100],
    ]);
    const first = allocateLot(40, remaining, new Map());
    expect([...first.values()].reduce((a, b) => a + b, 0)).toBe(40);
    expect(Math.max(...first.values()) - Math.min(...first.values())).toBeLessThanOrEqual(2);
    const yields = new Map([
      ["content", { read: 40, relevant: 12 }],
      ["intersection", { read: 40, relevant: 1 }],
      ["serp", { read: 40, relevant: 5 }],
    ]);
    const next = allocateLot(40, remaining, yields);
    expect([...next.values()].reduce((a, b) => a + b, 0)).toBe(40);
    expect(next.get("content")!).toBeGreaterThan(next.get("serp")!);
    expect(next.get("serp")!).toBeGreaterThan(next.get("intersection")!);
    // Une source au rendement faible garde un minimum (exploration), jamais zéro.
    expect(next.get("intersection")!).toBeGreaterThanOrEqual(QUALIFY_LIMITS.sourceFloor);
  });
  it("jamais plus que ce qui reste dans une file ; une file vide ne reçoit rien", () => {
    const out = allocateLot(
      40,
      new Map([
        ["content", 3],
        ["serp", 0],
        ["mention", 100],
      ]),
      new Map(),
    );
    expect(out.get("content")).toBe(3);
    expect(out.has("serp")).toBe(false);
    expect(out.get("mention")).toBe(37);
    expect(allocateLot(40, new Map([["a", 5]]), new Map()).get("a")).toBe(5);
  });
  it("file d'un candidat : sa source, « plusieurs » s'il est trouvé par deux sources", () => {
    expect(laneOf({ sources: from("content") })).toBe("content");
    expect(laneOf({ sources: [...from("content"), ...from("serp")] })).toBe("plusieurs");
    expect(laneOf({ sources: [] })).toBe("inconnue");
  });
});

interface Fake {
  fit?: (domain: string) => number;
  robots?: (domain: string) => RobotsCheck;
  msPerStep?: number;
  costPerCall?: number;
}

function fakeDeps(o: Fake = {}) {
  const calls = { llm: 0, read: 0, robots: 0, robotsOk: 0 };
  let clock = 0;
  const deps = (): QualDeps => ({
    sleep: async () => {},
    now: () => (clock += o.msPerStep ?? 1000),
    checkRobots: async (c) => {
      calls.robots++;
      return o.robots ? o.robots(c.domain) : "ok";
    },
    readPage: async (c, opts) => {
      calls.read++;
      if (opts?.robotsOk) calls.robotsOk++;
      return evalPage(`https://${c.domain}/`, {
        title: `Page ${c.domain}`,
        text: "Activités pour les familles.",
        links: [{ href: `https://${c.domain}/contact`, text: "Contact" }],
      });
    },
    guard: async () => {},
    llm: () =>
      ({
        spentUsd: 0,
        generate: async ({ prompt }: { prompt: string }) => {
          calls.llm++;
          const data = JSON.parse(
            prompt.split("<donnees_non_fiables>\n")[1]!.split("\n</donnees_non_fiables>")[0]!,
          ) as { cibles: { id: string; domaine: string; titre: string }[] };
          return {
            data: {
              results: data.cibles.map((c) => ({
                id: c.id,
                site_type: "blog",
                fit: o.fit ? o.fit(c.domaine) : 0.8,
                fit_reason: "Même public.",
                sells_links: false,
                same_offer: false,
                unrealistic: false,
                hook: c.titre,
                resource: 0,
              })),
            },
            costUsd: o.costPerCall ?? 0.002,
            provider: "openai",
            model: "gpt-4o-mini",
            inputTokens: 1,
            outputTokens: 1,
          };
        },
      }) as unknown as LlmClient,
    investigate: async (item) =>
      ({
        itemId: item.id,
        status: "email_verifie",
        email: `contact@${item.domain}`,
        emailSource: "page",
        verification: "valide",
        verifier: "mx",
        contactUrl: null,
        formUrl: null,
        reason: "",
        sendable: true,
        paidCalls: 0,
      }) as ContactResult,
  });
  return { deps, calls };
}

const step = async <T>(_id: string, fn: () => Promise<T>) => fn();
const input = (candidates: QualCandidate[], extra: object = {}) => ({
  workspaceId: null,
  auditId: null,
  ctx,
  candidates,
  budgetUsd: 0.4,
  model: "gpt-4o-mini",
  ...extra,
});
const many = (n: number, source: Parameters<typeof from>[0], prefix: string) =>
  Array.from({ length: n }, (_, i) => cand(`${prefix}-${i}.fr`, { sources: from(source) }));

describe("lecture adaptative par lots", () => {
  it("s'arrête à l'objectif de pages jugées ; le reste est gardé en stock, jamais supprimé", async () => {
    const { deps, calls } = fakeDeps();
    const cands = many(400, "content", "blog");
    const { results, stats } = await executeQualification(deps, input(cands), step);
    expect(stats.readStop).toBe("objectif");
    // L'objectif est contrôlé entre deux lots : le lot en cours est toujours fini.
    const lots = Math.ceil(QUALIFY_LIMITS.targetJudged / QUALIFY_LIMITS.pagesPerStep);
    expect(stats.judged).toBe(lots * QUALIFY_LIMITS.pagesPerStep);
    expect(stats.pagesRead).toBe(stats.judged);
    expect(calls.read).toBe(stats.pagesRead);
    expect(stats.stock).toBe(400 - stats.pagesRead);
    const stock = results.filter((r) => r.exclusionReason === "hors_budget_lecture");
    expect(stock).toHaveLength(stats.stock!);
    expect(stock.every((r) => r.status === "reserve" && r.provisionalScore > 0)).toBe(true);
    expect(results).toHaveLength(400);
    // Aucun plafond arbitraire sur la liste : tout ce qui passe le seuil avec un contact est livré.
    expect(stats.shortlist).toBe(Math.min(stats.judged, QUALIFY_LIMITS.shortlistSize));
  });

  it("candidats épuisés : tout est lu", async () => {
    const { deps } = fakeDeps();
    const { stats } = await executeQualification(deps, input(many(30, "serp", "club")), step);
    expect(stats).toMatchObject({ readStop: "epuise", pagesRead: 30, stock: 0, lots: 1 });
  });

  it("durée maximale : la lecture s'arrête, le stock reste", async () => {
    const { deps } = fakeDeps({ msPerStep: 200_000 });
    const { stats } = await executeQualification(deps, input(many(400, "content", "blog")), step);
    expect(stats.readStop).toBe("duree");
    expect(stats.readMs!).toBeGreaterThanOrEqual(QUALIFY_LIMITS.maxReadMs);
    expect(stats.pagesRead).toBeLessThan(400);
    expect(stats.stock).toBeGreaterThan(0);
  });

  it("budget de jugement : rien n'est jugé au-delà, les pages lues restent en réserve", async () => {
    const worst = batchWorstUsd(QUALIFY_LIMITS.batchSize, "gpt-4o-mini");
    const { deps, calls } = fakeDeps({ costPerCall: worst });
    const { results, stats } = await executeQualification(
      deps,
      input(many(200, "content", "blog"), { budgetUsd: worst * 3.5 }),
      step,
    );
    expect(stats.stop).toBe("budget");
    expect(stats.readStop).toBe("budget");
    expect(stats.costUsd).toBeLessThanOrEqual(worst * 3.5 + 1e-9);
    expect(calls.llm).toBe(3);
    expect(results.some((r) => r.exclusionReason === "hors_budget_llm")).toBe(true);
  });

  it("rendement décroissant : 3 lots de suite presque sans page pertinente arrêtent la lecture", async () => {
    const { deps } = fakeDeps({ fit: (d) => (d.startsWith("bon-") ? 0.9 : 0.1) });
    const cands = [...many(20, "content", "bon"), ...many(500, "content", "vide")];
    const { stats } = await executeQualification(
      deps,
      input(cands, { tuning: { targetJudged: 1000, maxLlmTargets: 1000 } }),
      step,
    );
    expect(stats.readStop).toBe("rendement");
    expect(stats.lots).toBeGreaterThanOrEqual(QUALIFY_LIMITS.minLots);
    expect(stats.pagesRead).toBeLessThan(520);
    expect(stats.relevant).toBe(20);
  });

  it("la lecture se déplace vers la source qui rapporte ; le rendement par source est mesuré", async () => {
    const { deps } = fakeDeps({ fit: (d) => (d.startsWith("blog-") ? 0.9 : 0.1) });
    const cands = [...many(300, "content", "blog"), ...many(300, "intersection", "lien")];
    const { stats } = await executeQualification(deps, input(cands), step);
    const s = stats.bySource!;
    expect(s.content!.read).toBeGreaterThan(s.intersection!.read * 2);
    expect(s.content!.relevant).toBeGreaterThan(0);
    expect(s.intersection!.relevant).toBe(0);
    expect(s.content!.candidates).toBe(300);
    expect(s.content!.shortlist).toBe(s.content!.relevant);
  });

  it("robots.txt avant lecture : les sites fermés ne prennent aucune place de lecture, et sont comptés", async () => {
    const { deps, calls } = fakeDeps({
      robots: (d) =>
        d.startsWith("ferme-") ? "interdit" : d.startsWith("lent-") ? "inconnu" : "ok",
    });
    const cands = [
      ...many(10, "content", "ferme"),
      ...many(5, "content", "lent"),
      ...many(20, "content", "ok"),
    ];
    const { results, stats } = await executeQualification(deps, input(cands), step);
    expect(calls.robots).toBe(35);
    // Un site qui n'a pas répondu à temps n'est PAS écarté : il est lu, avec son robots.txt relu.
    expect(calls.read).toBe(25);
    expect(calls.robotsOk).toBe(20);
    expect(stats.preRead).toMatchObject({ robots: 10 });
    expect(stats.preRead!.injoignable).toBeUndefined();
    expect(stats.afterPreRead).toBe(25);
    const closed = results.find((r) => r.domain === "ferme-0.fr")!;
    expect(closed).toMatchObject({ status: "exclu", exclusionReason: "robots", stageReached: 2 });
  });

  it("recherche Google : un type d'éditeur après l'autre, chacun mesuré", async () => {
    const { deps } = fakeDeps();
    const cands = [
      ...Array.from({ length: 30 }, (_, i) =>
        cand(`type-a-${i}.fr`, { sources: from("serp", "Type A") }),
      ),
      ...Array.from({ length: 30 }, (_, i) =>
        cand(`type-b-${i}.fr`, { sources: from("serp", "Type B") }),
      ),
    ];
    const { stats } = await executeQualification(
      deps,
      input(cands, { tuning: { targetJudged: 20, pagesPerStep: 20 } }),
      step,
    );
    expect(stats.byPersona!["Type A"]!.read).toBe(10);
    expect(stats.byPersona!["Type B"]!.read).toBe(10);
    expect(stats.byPersona!["Type A"]!.candidates).toBe(30);
  });

  it("rejeu déterministe : les mêmes steps mémorisés donnent le même résultat", async () => {
    const memo = new Map<string, unknown>();
    const memoStep = async <T>(id: string, fn: () => Promise<T>) => {
      if (memo.has(id)) return memo.get(id) as T;
      const out = await fn();
      memo.set(id, JSON.parse(JSON.stringify(out)));
      return out;
    };
    const cands = [...many(90, "content", "blog"), ...many(60, "serp", "club")];
    const first = await executeQualification(fakeDeps().deps, input(cands), memoStep);
    const replay = fakeDeps();
    const second = await executeQualification(replay.deps, input(cands), memoStep);
    expect(replay.calls).toMatchObject({ read: 0, llm: 0, robots: 0 });
    expect(second.stats).toEqual(first.stats);
    expect(second.results.map((r) => r.domain)).toEqual(first.results.map((r) => r.domain));
  });
});

describe("pertes gratuites (chantier D)", () => {
  it("robots.txt muet et nom de domaine du thème : lus en dernier, jamais écartés", async () => {
    const { deps } = fakeDeps({ robots: (d) => (d.startsWith("muet") ? "muet" : "ok") });
    const order: string[] = [];
    const wrapped = () => {
      const d = deps();
      const read = d.readPage;
      return {
        ...d,
        readPage: async (c: QualCandidate, o?: { robotsOk?: boolean }) => {
          order.push(c.domain);
          return read(c, o);
        },
      };
    };
    const cands = [
      ...many(3, "content", "muet"),
      ...many(3, "content", "coloriages-fan"),
      ...many(3, "content", "ecole"),
    ];
    const { results, stats } = await executeQualification(
      wrapped,
      input(cands, { tuning: { pagesPerStep: 3 } }),
      step,
    );
    const rank = (re: RegExp) => order.map((d, i) => (re.test(d) ? i : -1)).filter((i) => i >= 0);
    expect(Math.max(...rank(/^ecole/))).toBeLessThan(Math.min(...rank(/^muet/)));
    expect(Math.max(...rank(/^ecole/))).toBeLessThan(Math.min(...rank(/^coloriages-fan/)));
    // Aucun n'est écarté pour cela : tous sont lus, jugés et livrés.
    expect(order).toHaveLength(9);
    expect(results.filter((r) => r.exclusionReason === "robots")).toHaveLength(0);
    expect(stats.lostFree).toMatchObject({ robotsSilent: 3, nameTail: 3 });
  });

  it("« éditeur introuvable » sur une page intérieure : l'accueil est lu avant d'écarter", async () => {
    const { deps } = fakeDeps();
    const reads: string[] = [];
    const wrapped = () => ({
      ...deps(),
      readPage: async (c: QualCandidate) => {
        reads.push(c.url ?? "(accueil)");
        // Page d'article sans contact ni auteur ; l'accueil porte « Contact » dans son menu.
        const home = c.url === null;
        return evalPage(c.url ?? `https://${c.domain}/`, {
          title: `Page ${c.domain}`,
          text: "Activités pour les familles.",
          links: home ? [{ href: `https://${c.domain}/contact`, text: "Contact" }] : [],
        });
      },
    });
    const cands = [
      cand("avec-accueil.fr", {
        url: "https://avec-accueil.fr/un-article",
        sources: from("content"),
      }),
    ];
    const { results, stats } = await executeQualification(wrapped, input(cands), step);
    expect(reads).toEqual(["https://avec-accueil.fr/un-article", "(accueil)"]);
    expect(stats.lostFree).toMatchObject({ homeTried: 1, homeRescued: 1 });
    expect(results[0]!.exclusionReason).toBeNull();
    // La page jugée reste l'article, pas l'accueil.
    expect(results[0]!.page?.url).toBe("https://avec-accueil.fr/un-article");
  });

  it("accueil sans éditeur non plus : toujours « éditeur introuvable » ; accueil vendeur de liens : ce vrai motif", async () => {
    const { deps } = fakeDeps();
    const wrapped = () => ({
      ...deps(),
      readPage: async (c: QualCandidate) =>
        evalPage(c.url ?? `https://${c.domain}/`, {
          title: `Page ${c.domain}`,
          text:
            c.url === null && c.domain.startsWith("vend")
              ? "Articles sponsorisés : publiez votre article invité sur notre blog."
              : "Activités pour les familles.",
          links: [],
        }),
    });
    const cands = [
      cand("rien.fr", { url: "https://rien.fr/article", sources: from("content") }),
      cand("vend.fr", { url: "https://vend.fr/article", sources: from("content") }),
    ];
    const { results, stats } = await executeQualification(wrapped, input(cands), step);
    const by = (d: string) => results.find((r) => r.domain === d)!;
    expect(by("rien.fr").exclusionReason).toBe("editeur_introuvable");
    expect(by("vend.fr").exclusionReason).toBe("vend_des_liens");
    expect(stats.lostFree).toMatchObject({ homeTried: 2, homeRescued: 0 });
  });
});
