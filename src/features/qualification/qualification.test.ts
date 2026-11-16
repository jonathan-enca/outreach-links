import { describe, expect, it } from "vitest";
import {
  dedupKey,
  isAcademySubsite,
  isPlatformRoot,
  isPlatformUserSite,
  registrableDomain,
} from "@/features/collection/hosts";
import { acceptDomain, fromContent } from "@/features/collection/normalize";
import type { ContactResult } from "@/features/contacts/types";
import { BudgetExceededError } from "@/lib/dataforseo";
import type { LlmClient } from "@/lib/llm/client";
import { evaluateRules } from "./eval";
import { EVAL_CONTEXT, QUAL_EVAL_CASES, evalCandidate, evalPage } from "./eval-set";
import { authorityImpact, provisionalScore, runFreeStages, stageOneReason } from "./free";
import { executeQualification, type QualDeps } from "./funnel";
import {
  batchExpectedUsd,
  batchWorstUsd,
  estimateQualification,
  qualificationBudgetUsd,
  QUALIFY_LIMITS,
  SYSTEM_CHARS,
  TARGET_CHARS,
} from "./limits";
import { buildBatchPrompt, checkHook, SYSTEM_PROMPT, toJudgement } from "./llm";
import { hasContributorProgram, pageVerdict, publisherSignals, snapshotOf } from "./page";
import { cappedAuthority, finalScore, judgementExclusion, requestAndWhy } from "./score";
import type { LlmJudgement, QualCandidate } from "./types";

const ctx = EVAL_CONTEXT;
const cand = (domain: string, extra: Partial<QualCandidate> = {}): QualCandidate =>
  evalCandidate({
    id: "t",
    candidate: { domain, ...extra },
    page: null,
    byRules: false,
    keep: true,
  });

describe("hébergeurs multi-sites (blogs hébergés, écoles)", () => {
  it("garde le blog d'un utilisateur, jamais la racine de la plateforme", () => {
    expect(isPlatformUserSite("maitresse-julie.eklablog.com")).toBe(true);
    expect(isPlatformUserSite("monblog.blogspot.fr")).toBe(true);
    expect(isPlatformUserSite("monblog.blogspot.co.uk")).toBe(true);
    expect(isPlatformUserSite("eklablog.com")).toBe(false);
    expect(isPlatformRoot("eklablog.com")).toBe(true);
    expect(isPlatformRoot("www.blogspot.com")).toBe(true);
    expect(isPlatformUserSite("notblogspot.com")).toBe(false);
    expect(isPlatformUserSite("exemple.fr")).toBe(false);
  });

  it("déduplique par éditeur : sous-domaine d'un site = même éditeur, blog hébergé ou école = éditeur distinct", () => {
    expect(registrableDomain("blog.exemple.co.uk")).toBe("exemple.co.uk");
    expect(dedupKey("fr.parents-malins.fr")).toBe("parents-malins.fr");
    expect(dedupKey("a.over-blog.com")).not.toBe(dedupKey("b.over-blog.com"));
    expect(isAcademySubsite("ecole-x.ac-lyon.fr")).toBe(true);
    expect(isAcademySubsite("ac-lyon.fr")).toBe(false);
    expect(dedupKey("ecole-x.ac-lyon.fr")).toBe("ecole-x.ac-lyon.fr");
  });

  it("la collecte (MT.3) garde désormais les blogs hébergés et lit l'hôte réel dans Content Analysis", () => {
    const cctx = {
      ownDomain: "mega-coloring.com",
      competitorDomains: [],
      language: "fr",
      theme: "x",
      nameVariants: [],
      targetKeywords: [],
    };
    expect(acceptDomain("https://monblog.blogspot.com/2024/x.html", cctx)).toBe(
      "monblog.blogspot.com",
    );
    expect(acceptDomain("blogspot.com", cctx)).toBeNull();
    expect(acceptDomain("user.wordpress.com", cctx)).toBe("user.wordpress.com");
    expect(acceptDomain("pinterest.fr", cctx)).toBeNull();
    const out = fromContent(
      {
        total_count: 1,
        items_count: 1,
        items: [
          {
            url: "https://maitresse.eklablog.com/p",
            domain: "maitresse.eklablog.com",
            main_domain: "eklablog.com",
            language: "fr",
          },
        ],
      } as never,
      cctx,
      { keyword: "coloriage", pageType: "blogs", mention: false },
    );
    expect(out.map((r) => r.domain)).toEqual(["maitresse.eklablog.com"]);
  });
});

describe("étages gratuits 1 et 2", () => {
  it("rend un motif lisible pour chaque exclusion", () => {
    expect(stageOneReason(cand("blog.momes.net"), ctx)?.reason).toBe("concurrent");
    expect(stageOneReason(cand("canalblog.com"), ctx)?.reason).toBe("plateforme");
    expect(stageOneReason(cand("shutterstock.com"), ctx)?.reason).toBe("geant");
    expect(stageOneReason(cand("x.tumblr.com"), ctx)).toBeNull();
    expect(stageOneReason(cand("www.ne-pas-ecrire.fr"), ctx)?.reason).toBe("ne_pas_contacter");
  });

  it("une autorité nulle n'exclut pas (petit site neuf), elle baisse seulement la priorité", () => {
    const [zero, strong] = runFreeStages(
      [cand("petit-neuf.fr", { domainRank: 0 }), cand("etabli.fr", { domainRank: 200 })],
      ctx,
    );
    expect(zero!.reason ?? strong!.reason).toBeNull();
    expect(provisionalScore(cand("a.fr", { domainRank: 0 }))).toBeLessThan(
      provisionalScore(cand("a.fr", { domainRank: 200 })),
    );
    expect(provisionalScore(cand("a.fr", { competitorsCount: 3 }))).toBeGreaterThan(
      provisionalScore(cand("a.fr")),
    );
  });

  it("une page qui cite une page disparue d'un concurrent est lue d'abord (la preuve y est)", () => {
    const dead = cand("asso.fr", {
      sources: [
        {
          source: "lien_mort",
          query: "https://rival.fr/x",
          persona: "rival.fr",
          rank: null,
          pageType: null,
        },
      ],
    });
    expect(provisionalScore(dead)).toBeGreaterThan(provisionalScore(cand("asso.fr")));
  });

  it("mesure l'effet d'un filtre « autorité > 0 » par source", () => {
    const m = authorityImpact([
      cand("a.fr", { domainRank: 0 }),
      cand("b.fr", { domainRank: 12 }),
      cand("c.fr", {
        domainRank: null,
        sources: [{ source: "serp", query: "q", persona: null, rank: 1, pageType: null }],
      }),
    ]);
    expect(m).toMatchObject({ total: 3, zero: 1, positive: 1, unknown: 1, wouldDrop: 1 });
    expect(m.bySource.serp).toEqual({ total: 1, zero: 0, unknown: 1 });
  });
});

describe("étage 3 : lecture de la page", () => {
  it("repère un éditeur identifiable et un programme de contribution", () => {
    expect(
      publisherSignals({
        links: [{ href: "https://x.fr/mentions-legales", text: "" }],
        mailtos: [],
        hasContactForm: false,
        text: "",
      }),
    ).toContain("mentions légales");
    expect(
      publisherSignals({
        links: [],
        mailtos: [],
        hasContactForm: false,
        text: "Directeur de la publication : Jean Martin",
      }),
    ).toContain("éditeur déclaré");
    expect(
      publisherSignals({ links: [], mailtos: [], hasContactForm: false, text: "rien" }),
    ).toEqual([]);
    expect(hasContributorProgram("Vous voulez devenir contributeur ? Écrivez-nous")).toBe(true);
  });

  it("une page ambiguë n'est jamais exclue par les règles", () => {
    const page = evalPage("https://x.fr/", {
      title: "Collaborations",
      text: "Nous aimons les belles marques. Contact.",
      links: [{ href: "https://x.fr/contact", text: "Contact" }],
    });
    expect(pageVerdict(page, cand("x.fr"), ctx).reason).toBeNull();
  });
});

describe("jeu d'évaluation annoté (50 cas, français)", () => {
  it("contient 50 cas cohérents", () => {
    expect(QUAL_EVAL_CASES).toHaveLength(50);
    expect(new Set(QUAL_EVAL_CASES.map((c) => c.id)).size).toBe(50);
    for (const c of QUAL_EVAL_CASES) {
      if (c.byRules) expect(c.reason, c.id).toBeDefined();
      if (!c.byRules) expect(c.siteType, c.id).toBeDefined();
      if (c.keep) expect(c.byRules, c.id).toBe(false);
    }
    expect(QUAL_EVAL_CASES.filter((c) => c.keep).length).toBeGreaterThanOrEqual(15);
  });

  it("règles gratuites : précision 1 (aucune bonne cible exclue à tort) et rappel 1, motif exact", async () => {
    const r = await evaluateRules(QUAL_EVAL_CASES, ctx);
    const wrong = r.outcomes.filter(
      (o) => (o.got === null) !== (o.expected === null) || (o.expected && o.got !== o.expected),
    );
    expect(wrong).toEqual([]);
    expect(r.exclusion.precision).toBe(1);
    expect(r.exclusion.recall).toBe(1);
    expect(r.reasonAccuracy).toBe(1);
  });
});

const J = (over: Partial<LlmJudgement> = {}): LlmJudgement => ({
  siteType: "association",
  fit: 0.8,
  fitReason: "Même public de familles.",
  sellsLinks: false,
  sameOffer: false,
  unrealistic: false,
  hook: null,
  resource: 0,
  ...over,
});

describe("étage 4 : LLM (contenu non fiable, citation réelle)", () => {
  const page = snapshotOf(
    evalPage("https://asso.fr/", {
      title: "Liens utiles",
      text: "La ludothèque recommande ces sites pour les familles.",
    }),
  );

  it("jette une citation inventée, garde une vraie", () => {
    expect(checkHook("La ludothèque recommande ces sites", page)).toBe(
      "La ludothèque recommande ces sites",
    );
    expect(checkHook("Nous adorons Mega Coloring depuis toujours", page)).toBeNull();
  });

  it("encadre les extraits comme non fiables et reste dans la taille de prompt budgétée", () => {
    const items = Array.from({ length: QUALIFY_LIMITS.batchSize }, (_, i) => ({
      id: `c${i + 1}`,
      candidate: cand(`site${i}.fr`),
      page: {
        ...page,
        excerpt: "x".repeat(QUALIFY_LIMITS.excerptChars),
        title: "t".repeat(200),
        description: "d".repeat(300),
        headings: Array(8).fill("h".repeat(120)),
      },
    }));
    const prompt = buildBatchPrompt(items, ctx);
    expect(prompt).toContain("<donnees_non_fiables>");
    expect(SYSTEM_PROMPT).toMatch(/NON FIABLE/);
    expect(SYSTEM_PROMPT.length + prompt.length).toBeLessThanOrEqual(
      SYSTEM_CHARS + QUALIFY_LIMITS.batchSize * TARGET_CHARS,
    );
  });

  it("borne l'index de ressource et ordonne les exclusions", () => {
    const j = toJudgement(
      {
        id: "c1",
        site_type: "blog",
        fit: 0.9,
        fit_reason: "ok",
        sells_links: false,
        same_offer: false,
        unrealistic: false,
        hook: null,
        resource: 7,
      },
      page,
      3,
    );
    expect(j.resource).toBe(0);
    expect(judgementExclusion(J({ sellsLinks: true, fit: 0.2 }))?.reason).toBe("vend_des_liens");
    expect(judgementExclusion(J({ sameOffer: true }))?.reason).toBe("concurrent");
    expect(judgementExclusion(J({ fit: 0.3 }))?.reason).toBe("hors_sujet");
    expect(judgementExclusion(J())).toBeNull();
  });
});

describe("étage 6 : score et demande en trois lignes", () => {
  const page = snapshotOf(
    evalPage("https://asso.fr/liens", { title: "Liens utiles", text: "Sites pour les familles." }),
  );
  it("score = pertinence × personne ne la sollicite × facilité de contact × autorité plafonnée", () => {
    expect(cappedAuthority(10_000)).toBe(cappedAuthority(QUALIFY_LIMITS.authorityCap));
    expect(cappedAuthority(0)).toBeCloseTo(0.6);
    const email = finalScore(cand("asso.fr"), J(), page, {
      status: "email_verifie",
      email: "a@asso.fr",
      contactUrl: null,
      formUrl: null,
      sendable: true,
      reason: "",
    })!;
    const form = finalScore(cand("asso.fr"), J(), page, {
      status: "formulaire",
      email: null,
      contactUrl: null,
      formUrl: "x",
      sendable: false,
      reason: "",
    })!;
    expect(email.score).toBeGreaterThan(form.score);
    expect(email.score).toBeCloseTo(100 * 0.8 * 1 * 1 * 0.75, 1);
    const media = finalScore(cand("asso.fr"), J({ siteType: "media" }), page, {
      status: "email_verifie",
      email: "a@asso.fr",
      contactUrl: null,
      formUrl: null,
      sendable: true,
      reason: "",
    })!;
    expect(media.score).toBeLessThan(email.score);
    expect(
      finalScore(cand("asso.fr"), J(), page, {
        status: "introuvable",
        email: null,
        contactUrl: null,
        formUrl: null,
        sendable: false,
        reason: "",
      }),
    ).toBeNull();
  });

  it("rédige la demande en trois lignes avec la ressource choisie et le pourquoi", () => {
    const r = requestAndWhy(
      cand("asso.fr", { competitorsCount: 3 }),
      J({ resource: 1, hook: "Sites pour les familles" }),
      page,
      ctx,
    );
    expect(r.lines).toHaveLength(3);
    expect(r.lines[0]).toContain("https://www.mega-coloring.com/fr/enseignants/");
    expect(r.lines[1]).toContain("« Sites pour les familles »");
    expect(r.why).toContain("3 de vos concurrents");
    expect(r.lines.join(" ")).not.toMatch(/\bIA\b|intelligence artificielle/i);
  });
});

describe("coût annoncé et budget (0,10 USD)", () => {
  it("budget = 10 % du budget cible ; attendu <= pire cas <= budget", () => {
    expect(qualificationBudgetUsd()).toBeCloseTo(0.1);
    for (const n of [0, 3, 40, 200, 1000]) {
      const e = estimateQualification(n);
      expect(e.expectedUsd).toBeLessThanOrEqual(e.worstUsd + 1e-9);
      expect(e.worstUsd).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(e.llmTargetsMax).toBeLessThanOrEqual(QUALIFY_LIMITS.maxLlmTargets);
    }
    expect(estimateQualification(0).worstUsd).toBe(0);
    expect(batchExpectedUsd(5)).toBeLessThan(batchWorstUsd(5));
  });
});

// ---------- Entonnoir complet avec dépendances simulées ----------

interface FakeOpts {
  judge?: (domain: string) => Partial<LlmJudgement> | null;
  contact?: (domain: string) => ContactResult["status"];
  guardThrowsAfter?: number;
  noLlm?: boolean;
  costPerCall?: number;
}

function fakeDeps(o: FakeOpts = {}) {
  const calls = { llm: 0, guard: 0, read: 0, contact: 0 };
  const deps = (): QualDeps => ({
    sleep: async () => {},
    readPage: async (c) => {
      calls.read++;
      const e = QUAL_EVAL_CASES.find((x) => x.candidate.domain === c.domain);
      return evalPage(
        `https://${c.domain}/`,
        e
          ? (e.home ?? e.page)
          : {
              title: `Page ${c.domain}`,
              text: "Activités pour les familles.",
              links: [{ href: `https://${c.domain}/contact`, text: "Contact" }],
            },
      );
    },
    guard: async () => {
      calls.guard++;
      if (o.guardThrowsAfter !== undefined && calls.guard > o.guardThrowsAfter)
        throw new BudgetExceededError("plafond", 0.01, 0);
    },
    llm: () =>
      o.noLlm
        ? null
        : ({
            spentUsd: 0,
            generate: async ({ prompt }: { prompt: string }) => {
              calls.llm++;
              const data = JSON.parse(
                prompt.split("<donnees_non_fiables>\n")[1]!.split("\n</donnees_non_fiables>")[0]!,
              ) as {
                cibles: { id: string; domaine: string; titre: string }[];
              };
              const results = data.cibles.flatMap((c) => {
                const j = o.judge ? o.judge(c.domaine) : {};
                if (j === null) return [];
                const jj = J(j);
                return [
                  {
                    id: c.id,
                    site_type: jj.siteType,
                    fit: jj.fit,
                    fit_reason: jj.fitReason,
                    sells_links: jj.sellsLinks,
                    same_offer: jj.sameOffer,
                    unrealistic: jj.unrealistic,
                    hook: c.titre || null,
                    resource: 0,
                  },
                ];
              });
              return {
                data: { results },
                costUsd: o.costPerCall ?? 0.002,
                provider: "openai",
                model: "gpt-4o-mini",
                inputTokens: 1,
                outputTokens: 1,
              };
            },
          } as unknown as LlmClient),
    investigate: async (item) => {
      calls.contact++;
      const status = o.contact ? o.contact(item.domain) : "email_verifie";
      return {
        itemId: item.id,
        status,
        email: status.startsWith("email") ? `contact@${item.domain}` : null,
        emailSource: "page",
        verification: "valide",
        verifier: "mx",
        contactUrl: null,
        formUrl: status === "formulaire" ? `https://${item.domain}/contact` : null,
        reason: "",
        sendable: status === "email_verifie",
        paidCalls: 0,
      };
    },
  });
  return { deps, calls };
}

const step = async <T>(_id: string, fn: () => Promise<T>) => fn();
const input = (candidates: QualCandidate[], budgetUsd = 0.1) => ({
  workspaceId: null,
  auditId: null,
  ctx,
  candidates,
  budgetUsd,
  model: "gpt-4o-mini",
});

describe("entonnoir complet", () => {
  it("du moins cher au plus cher : le LLM ne voit que les survivants, liste courte classée avec la demande", async () => {
    const { deps, calls } = fakeDeps({
      judge: (d) =>
        d === "garage-dupont-auto.fr" ? { fit: 0.1, fitReason: "Hors sujet." } : { fit: 0.85 },
    });
    const cands = QUAL_EVAL_CASES.map(evalCandidate);
    const { results, stats } = await executeQualification(deps, input(cands), step);
    const llmSeen = QUAL_EVAL_CASES.filter((c) => !c.byRules).length;
    expect(stats.judged).toBe(llmSeen);
    expect(calls.llm).toBe(Math.ceil(llmSeen / QUALIFY_LIMITS.batchSize));
    expect(calls.read).toBeLessThan(cands.length);
    const short = results.filter((r) => r.status === "liste_courte");
    expect(short.length).toBe(stats.shortlist);
    expect(short.map((r) => r.rank)).toEqual(short.map((_, i) => i + 1));
    for (const r of short) {
      expect(r.requestLines).toHaveLength(3);
      expect(r.why).toBeTruthy();
      expect(r.contact?.status).toBe("email_verifie");
    }
    expect(results.find((r) => r.domain === "garage-dupont-auto.fr")).toMatchObject({
      status: "exclu",
      exclusionReason: "hors_sujet",
      stageReached: 4,
    });
    expect(results.find((r) => r.domain === "eklablog.com")).toMatchObject({
      status: "exclu",
      exclusionReason: "plateforme",
      stageReached: 1,
    });
    expect(results.find((r) => r.domain === "maitresse-julie.eklablog.com")?.status).toBe(
      "liste_courte",
    );
    expect(stats.costUsd).toBeCloseTo(0.002 * calls.llm);
    expect(stats.stop).toBe("termine");
    expect(stats.byReason.concurrent).toBe(2);
  });

  it("sans contact, la cible quitte la liste courte (formulaire accepté)", async () => {
    const { deps } = fakeDeps({
      contact: (d) =>
        d === "parents-malins.fr"
          ? "introuvable"
          : d === "mairie-saint-andre.fr"
            ? "formulaire"
            : "email_verifie",
    });
    const { results } = await executeQualification(
      deps,
      input(QUAL_EVAL_CASES.map(evalCandidate)),
      step,
    );
    expect(results.find((r) => r.domain === "parents-malins.fr")).toMatchObject({
      status: "exclu",
      exclusionReason: "sans_contact",
      stageReached: 5,
    });
    expect(results.find((r) => r.domain === "mairie-saint-andre.fr")?.status).toBe("liste_courte");
  });

  it("budget de qualification : s'arrête AVANT l'appel qui le dépasserait, le reste est en réserve", async () => {
    const worst = batchWorstUsd(5, "gpt-4o-mini");
    const { deps, calls } = fakeDeps({ costPerCall: worst * 0.9 });
    const many = Array.from({ length: 60 }, (_, i) => cand(`site-${i}.fr`));
    const budget = worst * 2.5;
    const { results, stats } = await executeQualification(deps, input(many, budget), step);
    expect(calls.llm).toBeGreaterThan(0);
    expect(stats.costUsd).toBeLessThanOrEqual(budget + 1e-9);
    expect(stats.stop).toBe("budget");
    const reserve = results.filter((r) => r.exclusionReason === "hors_budget_llm");
    expect(reserve.length).toBeGreaterThan(0);
    expect(reserve.every((r) => r.status === "reserve")).toBe(true);
  });

  it("plafond dur (audit, sécurité, jour) contrôlé avant chaque appel : rien n'est appelé au-delà", async () => {
    const { deps, calls } = fakeDeps({ guardThrowsAfter: 1 });
    const many = Array.from({ length: 20 }, (_, i) => cand(`site-${i}.fr`));
    const { stats } = await executeQualification(deps, input(many), step);
    expect(calls.llm).toBe(1);
    expect(stats.stop).toBe("plafond");
  });

  it("sans LLM ou sans réponse pour une cible : jamais deviné, « non qualifié » en réserve", async () => {
    const none = await executeQualification(
      fakeDeps({ noLlm: true }).deps,
      input([cand("a-site.fr")]),
      step,
    );
    expect(none.results[0]).toMatchObject({ status: "reserve", exclusionReason: "non_qualifie" });
    const missing = await executeQualification(
      fakeDeps({ judge: () => null }).deps,
      input([cand("b-site.fr")]),
      step,
    );
    expect(missing.results[0]).toMatchObject({
      status: "reserve",
      exclusionReason: "non_qualifie",
    });
  });
});
