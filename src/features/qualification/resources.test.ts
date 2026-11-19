import { describe, expect, it } from "vitest";
import type { ContactResult } from "@/features/contacts/types";
import type { PageOutbound } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import { EVAL_CONTEXT, evalCandidate, evalPage } from "./eval-set";
import {
  allocateLot,
  executeQualification,
  laneOf,
  RESOURCE_LANE,
  resourceLegalByUrl,
  resourcesOf,
  resourceVerdict,
  type QualDeps,
  type ResourceYield,
} from "./funnel";
import { QUALIFY_LIMITS, SYSTEM_CHARS, TARGET_CHARS } from "./limits";
import { buildBatchPrompt, checkSituation, SYSTEM_PROMPT } from "./llm";
import { FIVE_REFUSALS } from "./refusals";
import { mergeStats } from "./more";
import { pageCites, snapshotOf } from "./page";
import { finalScore, judgementExclusion, requestAndWhy } from "./score";
import type { LlmJudgement, QualCandidate, Situation } from "./types";

const ctx = EVAL_CONTEXT;
const cites = (resource: string) => [
  { source: "citation" as const, query: null, persona: resource, rank: null, pageType: null },
];
const cand = (domain: string, extra: Partial<QualCandidate> = {}): QualCandidate =>
  evalCandidate({
    id: "t",
    candidate: { domain, ...extra },
    page: null,
    byRules: false,
    keep: true,
  });
const J = (over: Partial<LlmJudgement> = {}): LlmJudgement => ({
  siteType: "blog",
  situation: "cite_des_comparables",
  fit: 0.8,
  fitReason: "La page liste des sites comparables.",
  sellsLinks: false,
  sameOffer: false,
  unrealistic: false,
  hook: null,
  resource: 0,
  ...over,
});
const out = (url: string, anchor: string, over: Partial<PageOutbound> = {}): PageOutbound => ({
  url,
  anchor,
  context: `Nous aimons bien ${anchor} pour la classe.`,
  zone: "body",
  rel: [],
  imageOnly: false,
  ...over,
});

describe("ce que la page cite déjà (relevé gratuit à la lecture)", () => {
  const read = evalPage("https://blog-de-classe.fr/liens", {
    title: "Mes liens",
    text: "Des sites pour la classe.",
    links: [{ href: "https://blog-de-classe.fr/contact", text: "Contact" }],
    outbound: [
      out("https://www.ressource-a.fr/dessins", "Ressource A"),
      out("https://ressource-b.com/", "Ressource B"),
      out("https://ressource-b.com/autre", "encore B"),
      out("https://www.facebook.com/sharer?u=x", "Partager"),
      out("https://www.youtube.com/watch?v=1", "Vidéo"),
      out("https://partenaire-du-pied-de-page.fr/", "Partenaire", { zone: "chrome" }),
    ],
  });

  it("compte les sites extérieurs du contenu, sans les réseaux sociaux ni le menu", () => {
    const c = pageCites(read, cand("blog-de-classe.fr", { sources: cites("ressource-a.fr") }));
    expect(c.sites).toBe(2);
    expect(c.links.map((l) => l.domain)).toEqual(["ressource-a.fr", "ressource-b.com"]);
    expect(c.resource).toMatchObject({ domain: "ressource-a.fr", found: true });
    expect(c.resource!.context).toContain("Ressource A");
  });

  it("dit quand la ressource n'est plus citée sur la page", () => {
    const c = pageCites(read, cand("blog-de-classe.fr", { sources: cites("disparue.fr") }));
    expect(c.resource).toEqual({ domain: "disparue.fr", found: false, context: "" });
  });

  it("une page trouvée autrement n'a pas de ressource, mais ses liens sont relevés", () => {
    const c = pageCites(read, cand("blog-de-classe.fr"));
    expect(c.resource).toBeUndefined();
    expect(c.sites).toBe(2);
    expect(snapshotOf(read, cand("blog-de-classe.fr")).cites?.sites).toBe(2);
    // Sans candidat (ancien appel) : pas de relevé, rien d'inventé.
    expect(snapshotOf(read).cites).toBeUndefined();
  });

  it("au plus 14 liens montrés au modèle, le compte reste entier", () => {
    const many = evalPage("https://annuaire.fr/liste", {
      outbound: Array.from({ length: 30 }, (_, i) => out(`https://site-${i}.fr/`, `Site ${i}`)),
    });
    const c = pageCites(many, cand("annuaire.fr"));
    expect(c.sites).toBe(30);
    expect(c.links).toHaveLength(QUALIFY_LIMITS.citedLinks);
  });
});

describe("jugement des trois cas (MC.6b)", () => {
  it("MC.6f : seuls les cinq refus excluent ; les trois cas, « autre » et les signaux sont gardés", () => {
    for (const s of [
      "lien_mort",
      "petit_editeur_ressources",
      "cite_des_comparables",
      "autre",
      // Ces situations ne sont plus des refus : rubrique, page commerciale... deviennent une note.
      "commercial",
      "pas_une_page_de_contenu",
    ] as Situation[]) {
      expect(judgementExclusion(J({ situation: s })), s).toBeNull();
    }
    expect(judgementExclusion(J({ situation: "juridique" }))?.reason).toBe("page_legale");
    expect(judgementExclusion(J({ situation: "ferme_a_liens" }))?.reason).toBe("ferme_a_liens");
    expect(judgementExclusion(J({ sameOffer: true }))?.reason).toBe("concurrent");
    expect(judgementExclusion(J({ unrealistic: true }))?.reason).toBe("irrealiste");
    // Aucun rapport avec le sujet : sous le seuil de proximité.
    expect(judgementExclusion(J({ situation: "aucune", fit: 0.1 }))?.reason).toBe("hors_sujet");
  });

  it("MC.6f : une page proche (thème ou public voisin) est gardée même sans rien citer, et classée après les trois cas", () => {
    expect(judgementExclusion(J({ situation: "autre", fit: 0.35 }))).toBeNull();
    // « aucune » = aucun rapport avec le sujet : refus, même avec une note de proximité haute.
    expect(judgementExclusion(J({ situation: "aucune", fit: 0.95 }))?.reason).toBe("hors_sujet");
    expect(judgementExclusion(J({ fit: 0.2 }))?.reason).toBe("hors_sujet");
    const c = cand("asso.fr");
    const contact = {
      status: "email_verifie" as const,
      email: "a@asso.fr",
      contactUrl: null,
      formUrl: null,
      sendable: true,
      reason: "",
    };
    const score = (s: Situation) =>
      finalScore(c, J({ situation: s, fit: 0.7 }), null, contact)!.score;
    expect(score("cite_des_comparables")).toBeGreaterThan(score("autre"));
    expect(score("autre")).toBeGreaterThan(score("pas_une_page_de_contenu"));
  });

  it("les motifs les plus graves passent d'abord", () => {
    expect(judgementExclusion(J({ situation: "ferme_a_liens", sellsLinks: true }))?.reason).toBe(
      "vend_des_liens",
    );
    expect(judgementExclusion(J({ sameOffer: true }))?.reason).toBe("concurrent");
    expect(judgementExclusion(J({ unrealistic: true }))?.reason).toBe("irrealiste");
  });

  it("la page qui cite déjà le site sans lien reste gardée ; un document juridique reste refusé", () => {
    const mention = cand("asso.fr", {
      sources: [{ source: "mention", query: null, persona: null, rank: null, pageType: null }],
    });
    expect(
      judgementExclusion(J({ situation: "autre" }), QUALIFY_LIMITS.minFit, mention),
    ).toBeNull();
    expect(
      judgementExclusion(J({ situation: "juridique" }), QUALIFY_LIMITS.minFit, mention)?.reason,
    ).toBe("page_legale");
  });

  it("la situation du modèle est recoupée avec ce que la page cite vraiment", () => {
    const pageWith = (n: number, resourceFound = false) =>
      snapshotOf(
        evalPage("https://blog.fr/billet", {
          outbound: Array.from({ length: n }, (_, i) => out(`https://site-${i}.fr/`, `Site ${i}`)),
        }),
        cand("blog.fr", resourceFound ? { sources: cites("site-0.fr") } : {}),
      );
    // « Plusieurs ressources comparables » exige au moins deux sites cités dans le contenu.
    expect(checkSituation("cite_des_comparables", pageWith(1))).toBe("autre");
    expect(checkSituation("cite_des_comparables", pageWith(2))).toBe("cite_des_comparables");
    // Un petit éditeur qui ne renvoie vers aucun site ne recommande rien.
    expect(checkSituation("petit_editeur_ressources", pageWith(0))).toBe("autre");
    expect(checkSituation("petit_editeur_ressources", pageWith(1, true))).toBe(
      "petit_editeur_ressources",
    );
    // Un lien mort annoncé et les refus ne dépendent pas de ce compte.
    expect(checkSituation("lien_mort", pageWith(0))).toBe("lien_mort");
    expect(checkSituation("juridique", pageWith(0))).toBe("juridique");
    // Page lue avant MC.6b (pas de relevé) : rien n'est corrigé.
    expect(checkSituation("cite_des_comparables", snapshotOf(evalPage("https://b.fr/", {})))).toBe(
      "cite_des_comparables",
    );
  });

  it("un jugement rendu avant MC.6b (sans situation) garde l'ancien critère", () => {
    const old = J();
    delete old.situation;
    expect(judgementExclusion(old)).toBeNull();
    expect(judgementExclusion({ ...old, fit: 0.2 })?.reason).toBe("hors_sujet");
  });

  it("classement : lien mort, puis petit éditeur, puis page qui cite des comparables", () => {
    const c = cand("asso.fr");
    const contact = {
      status: "email_verifie" as const,
      email: "a@asso.fr",
      contactUrl: null,
      formUrl: null,
      sendable: true,
      reason: "",
    };
    const score = (s: Situation) => finalScore(c, J({ situation: s, fit: 0.7 }), null, contact)!;
    expect(score("lien_mort").score).toBeGreaterThan(score("petit_editeur_ressources").score);
    expect(score("petit_editeur_ressources").score).toBeGreaterThan(
      score("cite_des_comparables").score,
    );
  });

  it("le pourquoi dit ce que la page cite déjà", () => {
    const c = cand("blog-de-classe.fr", { sources: cites("ressource-a.fr") });
    const page = snapshotOf(
      evalPage("https://blog-de-classe.fr/liens", {
        title: "Mes liens",
        outbound: [
          out("https://ressource-a.fr/", "Ressource A"),
          out("https://ressource-b.com/", "Ressource B"),
          out("https://ressource-c.org/", "Ressource C"),
        ],
      }),
      c,
    );
    const rw = requestAndWhy(c, J({ situation: "petit_editeur_ressources" }), page, ctx);
    expect(rw.why).toContain("sa page cite déjà ressource-a.fr et 2 autres sites");
  });

  it("la consigne porte les trois cas, sans mot propre à un thème, et tient dans la borne de coût", () => {
    for (const s of ["lien_mort", "petit_editeur_ressources", "cite_des_comparables"]) {
      expect(SYSTEM_PROMPT).toContain(`- ${s} :`);
    }
    expect(SYSTEM_PROMPT).toContain("Un billet ancien n'est jamais une raison de refuser");
    // MC.6f : les cinq refus du rédacteur, définis une seule fois.
    expect(SYSTEM_PROMPT).toContain(FIVE_REFUSALS);
    expect(SYSTEM_PROMPT).toContain("TOUJOURS gardée");
    expect(SYSTEM_PROMPT).toContain("ferme_a_liens");
    expect(SYSTEM_PROMPT).toContain("NON FIABLE");
    expect(SYSTEM_PROMPT).not.toMatch(/coloriage|rgpd|données personnelles|bloctel/i);
    expect(SYSTEM_PROMPT.length).toBeLessThanOrEqual(SYSTEM_CHARS);
  });

  it("le prompt montre au modèle ce que la page cite, la ressource et le lien mort annoncé", () => {
    const c = cand("blog-de-classe.fr", {
      sources: [
        ...cites("ressource-a.fr"),
        {
          source: "lien_mort",
          query: "https://vieux-site.fr/page-disparue",
          persona: "vieux-site.fr",
          rank: null,
          pageType: null,
        },
      ],
    });
    const read = evalPage("https://blog-de-classe.fr/liens", {
      title: "Mes liens",
      text: "x".repeat(5000),
      headings: Array.from({ length: 8 }, () => "h".repeat(120)),
      description: "d".repeat(300),
      outbound: Array.from({ length: 40 }, (_, i) =>
        out(i === 0 ? "https://ressource-a.fr/" : `https://site-${i}.fr/`, "a".repeat(120), {
          context: "c".repeat(500),
        }),
      ),
    });
    const prompt = buildBatchPrompt([{ id: "c1", candidate: c, page: snapshotOf(read, c) }], ctx);
    expect(prompt).toContain('"sites_exterieurs_cites":40');
    expect(prompt).toContain('"liens_du_contenu"');
    expect(prompt).toContain('"site_cite":{"site":"ressource-a.fr"');
    expect(prompt).toContain('"encore_citee_sur_la_page":true');
    expect(prompt).toContain('"adresse_disparue":"https://vieux-site.fr/page-disparue"');
    // Borne de coût : une cible au maximum de tous ses champs tient dans TARGET_CHARS.
    const empty = buildBatchPrompt([], ctx).length;
    expect(prompt.length - empty).toBeLessThanOrEqual(TARGET_CHARS);
  });
});

describe("pilotage par ressource : la règle (pure)", () => {
  const y = (verdicts: number, relevant: number, bad = 0) => ({ verdicts, relevant, bad });

  it("rien n'est décidé avant la fin du sondage", () => {
    expect(resourceVerdict(y(5, 0, 5))).toBeNull();
    expect(resourceVerdict(y(7, 0, 1))).toBeNull();
  });

  it("abandon dès 6 pages quand la ressource est citée surtout par des pages légales ou des fermes à liens", () => {
    expect(resourceVerdict(y(6, 0, 3))).toContain("pages légales ou des fermes à liens");
    expect(resourceVerdict(y(6, 0, 2))).toBeNull();
    // Une cible trouvée : on continue, même au milieu de mauvaises pages.
    expect(resourceVerdict(y(6, 1, 4))).toBeNull();
  });

  it("abandon après 8 pages sans aucune cible ; une ressource qui rend continue", () => {
    expect(resourceVerdict(y(8, 0))).toContain("aucune cible sur 8 pages");
    expect(resourceVerdict(y(8, 1))).toBeNull();
    expect(resourceVerdict(y(40, 6))).toBeNull();
  });

  it("abandon d'une ressource qui rend moins de 5 % après 24 pages", () => {
    expect(resourceVerdict(y(24, 1))).toContain("1 cible seulement sur 24");
    expect(resourceVerdict(y(24, 2))).toBeNull();
  });

  it("le tableau de l'essai MC.0b : les ressources qui ont rendu sont poursuivies", () => {
    // Cibles / pages lues relevées à la main le 18/11/2026 (docs/mc0b-essai.md).
    const kept: [number, number][] = [
      [8, 3],
      [4, 2],
      [4, 2],
      [8, 1],
      [7, 3],
      [5, 1],
      [5, 1],
    ];
    for (const [read, targets] of kept) expect(resourceVerdict(y(read, targets))).toBeNull();
    // Citée par des fermes à liens (0 sur 7) ou dans des CGU (0 sur 6) : abandonnée dès 6 pages.
    expect(resourceVerdict(y(7, 0, 7))).not.toBeNull();
    expect(resourceVerdict(y(6, 0, 5))).not.toBeNull();
    // Liens cassés annoncés vers un gros site officiel, 0 sur 8 : abandonnée.
    expect(resourceVerdict(y(8, 0, 3))).not.toBeNull();
  });

  it("avant toute lecture : une ressource citée en majorité par des adresses de pages légales", () => {
    expect(resourceLegalByUrl({ candidates: 20, legalByUrl: 10 })).toContain("pages légales");
    expect(resourceLegalByUrl({ candidates: 20, legalByUrl: 9 })).toBeNull();
    // Trop peu de pages pour conclure.
    expect(resourceLegalByUrl({ candidates: 4, legalByUrl: 4 })).toBeNull();
  });

  it("une file par ressource ; « plusieurs » quand une autre source a aussi trouvé la page", () => {
    expect(laneOf({ sources: cites("ressource-a.fr") })).toBe(`${RESOURCE_LANE}ressource-a.fr`);
    expect(
      laneOf({
        sources: [
          ...cites("ressource-a.fr"),
          { source: "serp", query: null, persona: "parents", rank: 3, pageType: null },
        ],
      }),
    ).toBe("plusieurs");
    expect(
      resourcesOf({ sources: [...cites("a.fr"), ...cites("b.fr"), ...cites("a.fr")] }),
    ).toEqual(["a.fr", "b.fr"]);
  });

  it("une ressource en cours de sondage reçoit sa part avant les autres files", () => {
    const remaining = new Map([
      ["content", 300],
      [`${RESOURCE_LANE}a.fr`, 100],
      [`${RESOURCE_LANE}b.fr`, 100],
    ]);
    const floor = (lane: string) => (lane.startsWith(RESOURCE_LANE) ? 4 : 2);
    const plan = allocateLot(9, remaining, new Map(), floor);
    expect(plan.get(`${RESOURCE_LANE}a.fr`)).toBe(4);
    expect(plan.get(`${RESOURCE_LANE}b.fr`)).toBe(4);
    expect(plan.get("content")).toBe(1);
  });
});

/** Faux entonnoir : le verdict du modèle dépend du domaine de la page (préfixe). */
function fakeDeps() {
  const calls = { read: [] as string[] };
  const situationOf = (domain: string): Situation =>
    domain.startsWith("cgu-")
      ? "juridique"
      : domain.startsWith("ferme-")
        ? "ferme_a_liens"
        : domain.startsWith("vide-")
          ? "aucune"
          : "petit_editeur_ressources";
  let clock = 0;
  const deps = (): QualDeps => ({
    sleep: async () => {},
    now: () => (clock += 1000),
    checkRobots: async () => "ok",
    readPage: async (c) => {
      calls.read.push(c.domain);
      return evalPage(`https://${c.domain}/page`, {
        title: `Page ${c.domain}`,
        text: "Des ressources pour les familles.",
        links: [{ href: `https://${c.domain}/contact`, text: "Contact" }],
        // La page cite deux sites : le recoupement avec le relevé gratuit ne change pas le verdict.
        outbound: [
          out("https://site-un.fr/", "Site un"),
          out("https://site-deux.fr/", "Site deux"),
        ],
      });
    },
    guard: async () => {},
    llm: () =>
      ({
        spentUsd: 0,
        generate: async ({ prompt }: { prompt: string }) => {
          const data = JSON.parse(
            prompt.split("<donnees_non_fiables>\n")[1]!.split("\n</donnees_non_fiables>")[0]!,
          ) as { cibles: { id: string; domaine: string }[] };
          return {
            data: {
              results: data.cibles.map((c) => ({
                id: c.id,
                site_type: "blog",
                situation: situationOf(c.domaine),
                // MC.6f : « aucune » = aucun rapport avec le sujet (fit sous le seuil) ; le reste est gardé.
                fit: situationOf(c.domaine) === "aucune" ? 0.1 : 0.8,
                fit_reason: "Jugement d'essai.",
                sells_links: false,
                same_offer: false,
                unrealistic: false,
                hook: null,
                resource: 0,
              })),
            },
            costUsd: 0.0005,
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
  budgetUsd: 5,
  model: "gpt-4o-mini",
  ...extra,
  // MQ.3 coupée : ces tests fixent le nombre de pages lues par le tri d'origine.
  tuning: {
    prereadEnabled: false,
    targetJudged: 1000,
    maxLlmTargets: 1000,
    maxPagesRead: 2000,
    ...(extra as { tuning?: object }).tuning,
  },
});
const citing = (n: number, prefix: string, resource: string, path = "/blog/article") =>
  Array.from({ length: n }, (_, i) =>
    cand(`${prefix}-${resource.split(".")[0]}-${i}.fr`, {
      url: `https://${prefix}-${resource.split(".")[0]}-${i}.fr${path}`,
      sources: cites(resource),
    }),
  );

describe("pilotage par ressource : dans la lecture", () => {
  it("la ressource qui donne des cibles est lue jusqu'au bout, les autres sont abandonnées après le sondage", async () => {
    const { deps, calls } = fakeDeps();
    const cands = [
      ...citing(60, "bon", "bonne.fr"),
      ...citing(60, "cgu", "juridique.fr"),
      ...citing(60, "ferme", "fermes.fr"),
      ...citing(60, "vide", "muette.fr"),
    ];
    const { results, stats } = await executeQualification(deps, input(cands), step);
    const by = stats.byResource!;
    expect(by["bonne.fr"]).toMatchObject({ status: "poursuivie", read: 60, relevant: 60 });
    // Pages légales et fermes à liens : abandon dès le premier point de contrôle (8 pages lues au plus).
    for (const r of ["juridique.fr", "fermes.fr"]) {
      expect(by[r]!.status, r).toBe("abandonnee");
      expect(by[r]!.reason, r).toContain("pages légales ou des fermes à liens");
      expect(by[r]!.read, r).toBeLessThanOrEqual(QUALIFY_LIMITS.resource.probePages);
      expect(by[r]!.read, r).toBeGreaterThanOrEqual(QUALIFY_LIMITS.resource.earlyPages);
      expect(by[r]!.skipped, r).toBe(60 - by[r]!.read);
    }
    // Aucune cible sur les 8 pages du sondage : abandonnée aussi, avec son propre motif.
    expect(by["muette.fr"]).toMatchObject({ status: "abandonnee", read: 8, relevant: 0 });
    expect(by["muette.fr"]!.reason).toContain("aucune cible sur 8 pages");
    // Les pages non lues portent un motif lisible, et ne sont pas gardées en réserve.
    const dropped = results.filter((r) => r.exclusionReason === "ressource_abandonnee");
    expect(dropped).toHaveLength(by["juridique.fr"]!.skipped + by["fermes.fr"]!.skipped + 52);
    expect(dropped.every((r) => r.status === "exclu" && r.exclusionDetail)).toBe(true);
    expect(dropped.some((r) => r.exclusionDetail!.includes("muette.fr"))).toBe(true);
    expect(stats.stock).toBe(0);
    // La lecture économisée : 240 candidats, 60 + trois sondages lus.
    expect(calls.read.length).toBe(stats.pagesRead);
    expect(stats.pagesRead).toBeLessThanOrEqual(60 + 3 * QUALIFY_LIMITS.resource.probePages);
    expect(stats.shortlist).toBe(60);
    expect(by["bonne.fr"]!.shortlist).toBe(60);
  });

  it("le sondage se fait dès les deux premiers lots, pour toutes les ressources", async () => {
    const { deps } = fakeDeps();
    const names = ["a.fr", "b.fr", "c.fr", "d.fr", "e.fr", "f.fr"];
    const cands = names.flatMap((r) => citing(50, "bon", r));
    const { stats } = await executeQualification(
      deps,
      input(cands, {
        tuning: { targetJudged: 48, maxLlmTargets: 1000, maxPagesRead: 2000 },
      }),
      step,
    );
    // 6 ressources x 8 pages = 48 pages : un lot de 40, puis le reste. Jamais plus que le sondage.
    expect(stats.lots).toBe(2);
    expect(stats.pagesRead).toBe(48);
    for (const r of names) {
      expect(stats.byResource![r]!.read, r).toBe(QUALIFY_LIMITS.resource.probePages);
    }
  });

  it("une ressource citée surtout par des adresses de pages légales n'est jamais lue", async () => {
    const { deps, calls } = fakeDeps();
    const cands = [
      ...citing(12, "bon", "mixte.fr", "/mentions-legales"),
      ...citing(8, "bon", "mixte.fr"),
      ...citing(10, "bon", "saine.fr"),
    ];
    // Les domaines des deux premiers groupes se recouvrent : on les rend distincts.
    cands.slice(0, 12).forEach((c, i) => {
      c.domain = `legal-${i}.fr`;
      c.url = `https://legal-${i}.fr/mentions-legales`;
    });
    const { stats, results } = await executeQualification(deps, input(cands), step);
    expect(stats.byResource!["mixte.fr"]).toMatchObject({
      status: "abandonnee",
      candidates: 20,
      legalByUrl: 12,
      read: 0,
      skipped: 8,
    });
    expect(stats.byResource!["saine.fr"]).toMatchObject({ status: "poursuivie", read: 10 });
    expect(calls.read).toHaveLength(10);
    expect(results.filter((r) => r.exclusionReason === "page_legale")).toHaveLength(12);
  });

  it("sans pilotage (mesure de contrôle), tout est lu", async () => {
    const { deps } = fakeDeps();
    const cands = [...citing(30, "bon", "bonne.fr"), ...citing(30, "vide", "muette.fr")];
    const { stats } = await executeQualification(
      deps,
      input(cands, { pilotResources: false }),
      step,
    );
    expect(stats.pagesRead).toBe(60);
    expect(stats.byResource!["muette.fr"]).toMatchObject({ status: "poursuivie", read: 30 });
  });

  it("une décision prise reste prise au lot suivant ; les compteurs se cumulent", async () => {
    const { deps, calls } = fakeDeps();
    const prior: Record<string, ResourceYield> = {
      "muette.fr": {
        candidates: 60,
        legalByUrl: 0,
        read: 8,
        verdicts: 8,
        relevant: 0,
        bad: 0,
        shortlist: 0,
        status: "abandonnee",
        reason: "aucune cible sur 8 pages lues",
        skipped: 52,
      },
      "bonne.fr": {
        candidates: 60,
        legalByUrl: 0,
        read: 20,
        verdicts: 20,
        relevant: 9,
        bad: 0,
        shortlist: 9,
        status: "poursuivie",
        skipped: 0,
      },
    };
    const stock = [...citing(10, "bon", "bonne.fr"), ...citing(5, "vide", "muette.fr")];
    const { stats, results } = await executeQualification(
      deps,
      input(stock, { priorResources: prior }),
      step,
    );
    expect(calls.read).toHaveLength(10);
    expect(calls.read.every((d) => d.startsWith("bon-"))).toBe(true);
    expect(results.filter((r) => r.exclusionReason === "ressource_abandonnee")).toHaveLength(5);
    // Compteurs cumulés (20 + 10 pages lues), nombre de candidats de la collecte inchangé.
    expect(stats.byResource!["bonne.fr"]).toMatchObject({
      candidates: 60,
      read: 30,
      relevant: 19,
      shortlist: 10,
    });
    const merged = mergeStats({ byResource: prior, bySource: {} }, stats, 19);
    expect(merged.byResource!["bonne.fr"]).toMatchObject({ read: 30, relevant: 19, shortlist: 19 });
    expect(merged.byResource!["muette.fr"]!.status).toBe("abandonnee");
  });

  it("une page sans aucun rapport avec le sujet sort de la liste avec son motif", async () => {
    const { deps } = fakeDeps();
    const { results } = await executeQualification(
      deps,
      input([...citing(3, "bon", "bonne.fr"), ...citing(2, "vide", "bonne.fr")]),
      step,
    );
    expect(results.filter((r) => r.status === "liste_courte")).toHaveLength(3);
    expect(results.filter((r) => r.exclusionReason === "hors_sujet")).toHaveLength(2);
  });
});
