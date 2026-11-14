import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { StoredBacklink } from "@/features/backlinks/normalize";
import { BudgetExceededError } from "@/lib/dataforseo";
import { estimatePublicAudit, FREE_LIMITS, periodKey, startOfUtcDay } from "./config";
import { checkCircuitBreaker, hashKey, rateLimit, requesterIp } from "./guard";
import { projectReport } from "./report";
import { ReportView } from "./report-view";
import {
  beginPublicAudit,
  buildResult,
  collectOwnKeywords,
  deriveQueries,
  finalizePublicAudit,
  type OwnKeywordsOut,
  type PublicRun,
} from "./run";
import { computeScore } from "./score";
import { nicheQueries, parseNiche } from "./niche";
import { captureEmail, loadPublicAudit, parseQueries, startPublicAudit } from "./service";

const ID = "11111111-1111-4111-8111-111111111111";

// ----- Score ------------------------------------------------------------------

describe("score", () => {
  it("combine liens (60 %) et visibilité (40 %)", () => {
    const s = computeScore({
      ownReferringDomains: 50,
      benchmarkMedian: 100,
      pagesRanked: 10,
      pagesTop10: 5,
    });
    expect(s?.score).toBe(50); // 0,6 x 0,5 + 0,4 x 0,5
    expect(s?.band).toBe("correct");
  });
  it("plafonne le ratio de liens à 1 et gère une mesure manquante", () => {
    expect(
      computeScore({
        ownReferringDomains: 900,
        benchmarkMedian: 100,
        pagesRanked: 0,
        pagesTop10: 0,
      })?.score,
    ).toBe(100);
    expect(
      computeScore({ ownReferringDomains: 0, benchmarkMedian: null, pagesRanked: 4, pagesTop10: 1 })
        ?.score,
    ).toBe(25);
  });
  it("n'invente pas de score sans mesure", () => {
    expect(
      computeScore({
        ownReferringDomains: null,
        benchmarkMedian: null,
        pagesRanked: 0,
        pagesTop10: 0,
      }),
    ).toBeNull();
  });
});

// ----- Configuration ----------------------------------------------------------

describe("configuration", () => {
  it("le coût estimé d'un audit gratuit reste sous le plafond d'audit", () => {
    const e = estimatePublicAudit();
    expect(e.totalUsd).toBeGreaterThan(0);
    expect(e.totalUsd).toBeLessThanOrEqual(FREE_LIMITS.costCapUsd);
  });
  it("période = mois civil UTC ; jour UTC", () => {
    expect(periodKey(new Date("2026-11-30T23:59:59Z"))).toBe("2026-11");
    expect(periodKey(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
    expect(startOfUtcDay(new Date("2026-11-14T17:20:00Z")).toISOString()).toBe(
      "2026-11-14T00:00:00.000Z",
    );
  });
});

// ----- Anti-abus : hachage, limitation de débit, coupe-circuit -----------------

function rpcClient(handlers: Record<string, (args: Record<string, unknown>) => unknown>) {
  const db = fakeSupabase();
  const client = {
    ...db.client,
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      const h = handlers[name];
      return h ? { data: h(args), error: null } : { data: null, error: { message: "inconnu" } };
    }),
  };
  return { client: client as never, db, rpc: client.rpc };
}

describe("guard", () => {
  it("hache sans révéler la valeur et de façon stable", () => {
    const a = hashKey("1.2.3.4", "sel-de-test-0123456789");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(hashKey(" 1.2.3.4 ", "sel-de-test-0123456789"));
    expect(a).not.toContain("1.2.3.4");
    expect(a).not.toBe(hashKey("1.2.3.4", "autre-sel-0123456789"));
  });
  it("lit l'IP dans x-forwarded-for puis x-real-ip", () => {
    const h = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null });
    expect(requesterIp(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(requesterIp(h({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(requesterIp(h({}))).toBe("inconnu");
  });
  it("limitation de débit : refuse quand la fonction refuse, et par prudence si elle échoue", async () => {
    const ok = rpcClient({
      rate_limit_hit: () => [{ allowed: false, hits: 3, retry_after_seconds: 42 }],
    });
    expect(await rateLimit(ok.client, "b", "k", { limit: 3, windowSeconds: 60 })).toEqual({
      allowed: false,
      retryAfterSeconds: 42,
    });
    const broken = rpcClient({});
    expect(
      (await rateLimit(broken.client, "b", "k", { limit: 3, windowSeconds: 60 })).allowed,
    ).toBe(false);
  });
  it("coupe-circuit : ouvert au-delà du plafond journalier, fermé sinon", async () => {
    const opts = { enabled: true, dailyCapUsd: 1, estimateUsd: 0.2 };
    const low = rpcClient({ public_audit_spend_since: () => 0.5 });
    expect(await checkCircuitBreaker(low.client, opts)).toEqual({ open: false, spentUsd: 0.5 });
    const high = rpcClient({ public_audit_spend_since: () => 0.85 });
    expect(await checkCircuitBreaker(high.client, opts)).toMatchObject({
      open: true,
      reason: "plafond_jour",
    });
  });
  it("coupe-circuit : interrupteur coupé ou dépense illisible = fermé au public", async () => {
    const c = rpcClient({ public_audit_spend_since: () => 0 });
    expect(
      await checkCircuitBreaker(c.client, { enabled: false, dailyCapUsd: 9, estimateUsd: 0.1 }),
    ).toMatchObject({ open: true, reason: "desactive" });
    const broken = rpcClient({});
    expect(
      await checkCircuitBreaker(broken.client, { enabled: true, dailyCapUsd: 9, estimateUsd: 0.1 }),
    ).toMatchObject({ open: true, reason: "indisponible" });
  });
});

// ----- Service : démarrage, cache, abus ---------------------------------------

function startSetup(
  opts: { spent?: number; allowed?: boolean; tables?: Record<string, never[]> } = {},
) {
  const sent: { id?: string; name: string }[] = [];
  const rl = rpcClient({
    rate_limit_hit: () => [{ allowed: opts.allowed ?? true, hits: 1, retry_after_seconds: 30 }],
    public_audit_spend_since: () => opts.spent ?? 0,
  });
  const deps = {
    service: rl.client,
    db: rl.db,
    rpc: rl.rpc,
    sent,
    base: {
      service: rl.client,
      salt: "sel-de-test-0123456789",
      ip: "1.2.3.4",
      now: new Date("2026-11-14T10:00:00Z"),
      sendEvent: async (e: { id?: string; name: string }) => void sent.push(e),
      enabled: true,
      dailyCapUsd: 3,
    },
  };
  return deps;
}

describe("startPublicAudit", () => {
  it("crée l'audit, envoie UN événement, et l'IP n'est jamais stockée en clair", async () => {
    const s = startSetup();
    const r = await startPublicAudit(s.base, { domain: "https://www.MonSite.fr/page" });
    expect(r).toMatchObject({ status: "ok", cached: false });
    expect(s.sent).toHaveLength(1);
    const row = s.db.tables.public_audits![0]!;
    expect(row.domain).toBe("monsite.fr");
    expect(row.period_key).toBe("2026-11");
    expect(row.queries_source).toBe("auto");
    expect(JSON.stringify(row)).not.toContain("1.2.3.4");
  });

  it("TEST D'ABUS : le même domaine répété ne crée rien et ne coûte rien", async () => {
    const s = startSetup();
    const first = await startPublicAudit(s.base, { domain: "monsite.fr" });
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(
        await startPublicAudit(s.base, { domain: i % 2 ? "www.monsite.fr" : "MONSITE.fr" }),
      );
    }
    expect(first.status === "ok" && results.every((r) => r.status === "ok" && r.cached)).toBe(true);
    expect(results.every((r) => r.status === "ok" && r.id === (first as { id: string }).id)).toBe(
      true,
    );
    expect(s.sent).toHaveLength(1);
    expect(s.db.tables.public_audits).toHaveLength(1);
    // Le coupe-circuit n'est même pas interrogé pour un résultat en cache (une seule fois, à la création).
    const spendCalls = s.rpc.mock.calls.filter((c) => c[0] === "public_audit_spend_since");
    expect(spendCalls).toHaveLength(1);
  });

  it("un autre mois = nouvelle exécution autorisée", async () => {
    const s = startSetup();
    await startPublicAudit(s.base, { domain: "monsite.fr" });
    await startPublicAudit(
      { ...s.base, now: new Date("2026-12-02T10:00:00Z") },
      { domain: "monsite.fr" },
    );
    expect(s.sent).toHaveLength(2);
  });

  it("COUPE-CIRCUIT : au-delà du plafond journalier, l'audit gratuit est refusé et rien ne part", async () => {
    const s = startSetup({ spent: 2.95 });
    const r = await startPublicAudit(s.base, { domain: "neuf.fr" });
    expect(r).toMatchObject({ status: "error", code: "capacite_atteinte" });
    expect(s.sent).toHaveLength(0);
    expect(s.db.tables.public_audits ?? []).toHaveLength(0);
  });

  it("COUPE-CIRCUIT : un résultat déjà en cache reste servi quand le plafond est atteint", async () => {
    const s = startSetup();
    const first = await startPublicAudit(s.base, { domain: "monsite.fr" });
    const capped = startSetup({ spent: 99 });
    capped.db.tables.public_audits = s.db.tables.public_audits!;
    const again = await startPublicAudit(capped.base, { domain: "monsite.fr" });
    expect(again).toMatchObject({ status: "ok", cached: true });
    expect(first.status).toBe("ok");
  });

  it("interrupteur coupé : refus", async () => {
    const s = startSetup();
    const r = await startPublicAudit({ ...s.base, enabled: false }, { domain: "neuf.fr" });
    expect(r).toMatchObject({ status: "error", code: "ferme" });
  });

  it("limitation de débit : refus avec délai", async () => {
    const s = startSetup({ allowed: false });
    const r = await startPublicAudit(s.base, { domain: "neuf.fr" });
    expect(r).toMatchObject({ status: "error", code: "trop_de_demandes", retryAfterSeconds: 30 });
    expect(s.sent).toHaveLength(0);
  });

  it("refuse piège rempli, domaine invalide, plateforme et requête trop courte", async () => {
    const s = startSetup();
    expect(await startPublicAudit(s.base, { domain: "a.fr", honeypot: "x" })).toMatchObject({
      code: "invalide",
    });
    expect(await startPublicAudit(s.base, { domain: "localhost" })).toMatchObject({
      code: "domaine_invalide",
    });
    expect(await startPublicAudit(s.base, { domain: "https://fr.wikipedia.org" })).toMatchObject({
      code: "domaine_non_eligible",
    });
    expect(await startPublicAudit(s.base, { domain: "a.fr", queries: ["x"] })).toMatchObject({
      code: "requete_invalide",
    });
    expect(s.sent).toHaveLength(0);
  });

  it("événement non envoyé : l'audit passe en échec sans consommer d'exécution", async () => {
    const s = startSetup();
    const r = await startPublicAudit(
      {
        ...s.base,
        sendEvent: async () => {
          throw new Error("clés Inngest absentes");
        },
      },
      { domain: "monsite.fr" },
    );
    expect(r).toMatchObject({ status: "error", code: "file_indisponible" });
    expect(s.db.tables.public_audits![0]).toMatchObject({
      status: "echoue",
      error_code: "file_indisponible",
    });
    // Réessai possible (aucune exécution consommée) : l'audit repart en file.
    const retry = await startPublicAudit(s.base, { domain: "monsite.fr" });
    expect(retry).toMatchObject({ status: "ok", cached: false });
    expect(s.sent).toHaveLength(1);
  });

  it("relance après échec avec requêtes saisies : source « visiteur » (pas de déduction auto)", async () => {
    const s = startSetup();
    await startPublicAudit(s.base, { domain: "monsite.fr" });
    Object.assign(s.db.tables.public_audits![0]!, {
      status: "echoue",
      error_code: "aucun_mot_cle",
      attempts: 1,
    });
    const retry = await startPublicAudit(s.base, {
      domain: "monsite.fr",
      queries: ["coloriage licorne"],
    });
    expect(retry).toMatchObject({ status: "ok", cached: false });
    expect(s.db.tables.public_audits![0]).toMatchObject({
      queries: ["coloriage licorne"],
      queries_source: "visiteur",
    });
  });

  it("après deux exécutions échouées, le domaine est épuisé pour le mois", async () => {
    const s = startSetup();
    await startPublicAudit(s.base, { domain: "monsite.fr" });
    Object.assign(s.db.tables.public_audits![0]!, { status: "echoue", attempts: 2 });
    expect(await startPublicAudit(s.base, { domain: "monsite.fr" })).toMatchObject({
      code: "domaine_epuise",
    });
  });

  it("normalise les requêtes (doublons, casse, 3 au plus)", () => {
    expect(parseQueries([" Coloriage  Chat ", "coloriage chat", "", "a b", "c d", "e f"])).toEqual([
      "coloriage chat",
      "a b",
      "c d",
    ]);
    expect(parseQueries(["x"])).toBeNull();
  });
});

// ----- Email et lecture du rapport --------------------------------------------

describe("email et rapport", () => {
  const deps = () => {
    const s = startSetup();
    s.db.tables.public_audits = [
      { id: ID, domain: "monsite.fr", status: "termine", result: {} },
    ] as never;
    return { s, g: { service: s.service, salt: "sel-de-test-0123456789", ip: "1.2.3.4" } };
  };

  it("refuse un email invalide ou sans consentement", async () => {
    const { g } = deps();
    expect(
      await captureEmail(g, { auditId: ID, email: "pas-un-email", consent: true }),
    ).toMatchObject({
      code: "email_invalide",
    });
    expect(await captureEmail(g, { auditId: ID, email: "a@b.fr", consent: false })).toMatchObject({
      code: "consentement",
    });
  });

  it("enregistre le lead (email en minuscules, jeton aléatoire) et ouvre le rapport avec ce jeton seulement", async () => {
    const { s, g } = deps();
    const r = await captureEmail(g, { auditId: ID, email: " Marie@Exemple.FR ", consent: true });
    expect(r.status).toBe("ok");
    const token = (r as { token: string }).token;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(s.db.tables.public_audit_leads![0]).toMatchObject({ email: "marie@exemple.fr" });
    const result = { version: 1, site: { domain: "monsite.fr" } };
    s.db.tables.public_audits![0]!.result = result;
    expect((await loadPublicAudit(s.service, ID, token))?.unlocked).toBe(true);
    expect((await loadPublicAudit(s.service, ID, "x".repeat(64)))?.unlocked).toBe(false);
    expect((await loadPublicAudit(s.service, ID, undefined))?.unlocked).toBe(false);
  });

  it("refuse l'email tant que l'audit n'est pas terminé", async () => {
    const { s, g } = deps();
    s.db.tables.public_audits![0]!.status = "en_cours";
    expect(await captureEmail(g, { auditId: ID, email: "a@b.fr", consent: true })).toMatchObject({
      code: "rapport_indisponible",
    });
  });
});

// ----- Pipeline ---------------------------------------------------------------

const link = (competitor: string, source: string, rank = 40): StoredBacklink => ({
  competitorDomain: competitor,
  sourceDomain: source,
  sourceUrl: `https://${source}/ressources`,
  targetUrl: `https://${competitor}/`,
  anchor: competitor,
  itemType: "anchor",
  dofollow: true,
  isBroken: false,
  spamScore: 5,
  sourceRank: rank,
  firstSeen: null,
  lastSeen: null,
});

const OWN: OwnKeywordsOut = {
  ok: true,
  queries: ["coloriage licorne"],
  newSite: false,
  keywordsTotal: 120,
  pagesRanked: 4,
  pagesTop10: 1,
  priorityPages: [
    {
      url: "https://monsite.fr/licorne",
      avgPosition: 8,
      bestPosition: 6,
      totalVolume: 5400,
      keywords: [{ keyword: "coloriage licorne", position: 6, volume: 5400 }],
    },
  ],
};

function manyTargets(n: number) {
  const rows: StoredBacklink[] = [];
  for (let i = 0; i < n; i++) rows.push(link("rival.fr", `blog-secret${i}.org`, 50 - (i % 40)));
  rows.push(link("autre.fr", "blog-secret0.org"));
  rows.push(link("autre.fr", "casino-gratuit-123.xyz", 5)); // spam : écarté
  rows.push(link("autre.fr", "monsite.fr")); // lien interne : écarté
  return rows;
}

describe("buildResult", () => {
  const input = {
    own: OWN,
    ownLinks: { total: 2, domains: ["deja-lie.org"], partial: false },
    competitors: [
      { domain: "rival.fr", queriesCount: 1, bestRank: 2 },
      { domain: "autre.fr", queriesCount: 1, bestRank: 5 },
    ],
    links: [
      { domain: "rival.fr", referringDomains: 400, rows: manyTargets(30) },
      { domain: "autre.fr", referringDomains: 200, rows: [] },
    ],
  };
  const res = buildResult("monsite.fr", input);

  it("retire spam, liens internes et domaines qui citent déjà le site ; classe par concurrents cités", () => {
    const domains = res.targets.map((t) => t.domain);
    expect(domains).not.toContain("casino-gratuit-123.xyz");
    expect(domains).not.toContain("monsite.fr");
    expect(res.targets[0]?.domain).toBe("blog-secret0.org");
    expect(res.targets[0]?.competitorsCount).toBe(2);
    expect(res.targetsTotal).toBe(30);
    expect(res.targets.length).toBeLessThanOrEqual(FREE_LIMITS.targetsStored);
  });
  it("calcule médiane, score et besoin en domaines référents", () => {
    expect(res.benchmarkMedian).toBe(300);
    expect(res.score?.value).toBe(Math.round(100 * (0.6 * (2 / 300) + 0.4 * 0.25)));
    expect(res.pages[0]?.neededEstimated).not.toBeNull();
  });
});

describe("MA.4 : site neuf sans mot-clé classé", () => {
  const NEW_OWN: OwnKeywordsOut = {
    ok: true,
    queries: ["coloriage enfant", "coloriage enfant en ligne", "coloriage enfant guide"],
    newSite: true,
    keywordsTotal: 0,
    pagesRanked: 0,
    pagesTop10: 0,
    priorityPages: [],
  };
  const build = () =>
    buildResult("monsite.fr", {
      own: NEW_OWN,
      ownLinks: { total: 1, domains: [], partial: false },
      competitors: [{ domain: "rival.fr", queriesCount: 3, bestRank: 2 }],
      links: [{ domain: "rival.fr", referringDomains: 400, rows: manyTargets(30) }],
    });

  it("thème : requêtes de secours sans LLM, normalisées ; saisie invalide refusée", () => {
    expect(nicheQueries("  Coloriage   Enfant ")).toEqual([
      "coloriage enfant",
      "coloriage enfant en ligne",
      "coloriage enfant guide",
    ]);
    expect(nicheQueries("  ")).toEqual([]);
    expect(parseNiche(undefined)).toBe("");
    expect(parseNiche("x")).toBeNull();
    expect(parseNiche("a".repeat(61))).toBeNull();
  });

  it("démarrage : sans requête mais avec un thème, requêtes de secours en source « auto »", async () => {
    const s = startSetup();
    const r = await startPublicAudit(s.base, { domain: "monsite.fr", niche: "Coloriage enfant" });
    expect(r).toMatchObject({ status: "ok", cached: false });
    expect(s.db.tables.public_audits![0]).toMatchObject({
      queries: ["coloriage enfant", "coloriage enfant en ligne", "coloriage enfant guide"],
      queries_source: "auto",
    });
  });

  it("démarrage : des requêtes saisies l'emportent sur le thème", async () => {
    const s = startSetup();
    await startPublicAudit(s.base, {
      domain: "monsite.fr",
      queries: ["coloriage licorne"],
      niche: "coloriage enfant",
    });
    expect(s.db.tables.public_audits![0]).toMatchObject({
      queries: ["coloriage licorne"],
      queries_source: "visiteur",
    });
  });

  it("démarrage : thème invalide refusé avant tout coût", async () => {
    const s = startSetup();
    expect(await startPublicAudit(s.base, { domain: "monsite.fr", niche: "x" })).toMatchObject({
      status: "error",
    });
    expect(s.sent).toHaveLength(0);
  });

  it("résultat : aucun score (pas 0), site marqué neuf, plan de cibles conservé", () => {
    const res = build();
    expect(res.score).toBeNull();
    expect(res.site.newSite).toBe(true);
    expect(res.targets.length).toBeGreaterThan(0);
    const view = projectReport(res, false);
    expect(view.newSite).toBe(true);
    expect(view.score).toBeNull();
  });

  it("rapport : affiche « non classé » et non le message de données insuffisantes", () => {
    const html = renderToStaticMarkup(
      createElement(ReportView, { view: projectReport(build(), false) }),
    );
    expect(html).toContain("Non classé");
    expect(html).not.toContain("Pas assez de données");
    expect(html).not.toContain("sur 100");
  });

  it("un site classé garde son score et n'est pas marqué neuf", () => {
    const res = buildResult("monsite.fr", {
      own: OWN,
      ownLinks: { total: 2, domains: [], partial: false },
      competitors: [{ domain: "rival.fr", queriesCount: 1, bestRank: 2 }],
      links: [{ domain: "rival.fr", referringDomains: 400, rows: [] }],
    });
    expect(res.score).not.toBeNull();
    expect(projectReport(res, false).newSite).toBe(false);
  });
});

describe("projection serveur du rapport (floutage)", () => {
  const res = buildResult("monsite.fr", {
    own: OWN,
    ownLinks: { total: 10, domains: [], partial: false },
    competitors: [{ domain: "rival.fr", queriesCount: 1, bestRank: 2 }],
    links: [{ domain: "rival.fr", referringDomains: 400, rows: manyTargets(30) }],
  });

  it("sans email : AUCUN domaine de cible ni détail de page dans l'objet envoyé au navigateur", () => {
    const view = projectReport(res, false);
    const json = JSON.stringify(view);
    expect(json).not.toContain("blog-secret");
    expect(json).not.toContain("/ressources");
    expect(json).not.toContain("coloriage licorne"); // mots-clés des pages
    expect(view.targets).toHaveLength(FREE_LIMITS.targetsPreview);
    expect(view.targets.every((t) => t.locked)).toBe(true);
    expect(view.moreTargets).toBe(res.targetsTotal - FREE_LIMITS.targetsPreview);
    const html = renderToStaticMarkup(createElement(ReportView, { view }));
    expect(html).not.toContain("blog-secret");
    expect(html).toContain("cibles de plus");
  });

  it("avec email : les 10 cibles et le détail des pages sont présents, pas plus de 10", () => {
    const view = projectReport(res, true);
    expect(view.targets.every((t) => !t.locked)).toBe(true);
    expect(view.targets).toHaveLength(FREE_LIMITS.targetsPreview);
    expect(JSON.stringify(view)).not.toContain("blog-secret" + 29);
    expect(view.pages[0]?.detail?.keywords[0]?.keyword).toBe("coloriage licorne");
    const html = renderToStaticMarkup(createElement(ReportView, { view }));
    expect(html).toContain("blog-secret");
  });
});

describe("exécution de l'audit", () => {
  function runSetup() {
    const db = fakeSupabase({
      public_audits: [
        {
          id: ID,
          domain: "monsite.fr",
          status: "en_attente",
          attempts: 0,
          queries: [],
          queries_source: "auto",
        },
      ],
    });
    return db;
  }

  it("begin : en_attente -> en_cours (une exécution de plus), idempotent, refuse au-delà des tentatives", async () => {
    const db = runSetup();
    const run = await beginPublicAudit(db.client, ID);
    expect(run).toMatchObject({ id: ID, domain: "monsite.fr", queriesSource: "auto" });
    expect(db.tables.public_audits![0]).toMatchObject({ status: "en_cours", attempts: 1 });
    expect(await beginPublicAudit(db.client, ID)).not.toBeNull(); // reprise Inngest
    expect(db.tables.public_audits![0]!.attempts).toBe(1);
    Object.assign(db.tables.public_audits![0]!, { status: "en_attente", attempts: 2 });
    expect(await beginPublicAudit(db.client, ID)).toBeNull();
    db.tables.public_audits![0]!.status = "termine";
    expect(await beginPublicAudit(db.client, ID)).toBeNull();
  });

  it("déduit les requêtes hors marque, par volume décroissant", () => {
    const items = [
      { keyword: "monsite avis", url: "u", position: 1, volume: 9000 },
      { keyword: "coloriage chat", url: "u", position: 12, volume: 3000 },
      { keyword: "coloriage licorne", url: "u", position: 7, volume: 6000 },
      { keyword: "coloriage chien", url: "u", position: 45, volume: 8000 }, // hors top 30
      { keyword: "coloriage licorne", url: "u2", position: 9, volume: 6000 }, // doublon
    ];
    expect(deriveQueries(items, "monsite.fr")).toEqual(["coloriage licorne", "coloriage chat"]);
  });

  const run: PublicRun = { id: ID, domain: "monsite.fr", queries: [], queriesSource: "auto" };
  const labs = (items: { keyword: string; rank: number; url: string; volume: number }[]) => ({
    labsRankedKeywords: vi.fn(async () => ({
      result: {
        total_count: items.length,
        items: items.map((i) => ({
          keyword_data: { keyword: i.keyword, keyword_info: { search_volume: i.volume } },
          ranked_serp_element: { serp_item: { rank_group: i.rank, url: i.url } },
        })),
      },
    })),
  });

  it("sans mot-clé exploitable et sans requête saisie : échec propre (aucun_mot_cle)", async () => {
    const db = runSetup();
    const dfs = labs([]);
    const out = await collectOwnKeywords(db.client, dfs as never, run);
    expect(out).toEqual({ ok: false, code: "aucun_mot_cle" });
  });

  it("MA.4 : aucun mot-clé classé mais requêtes de secours (thème) : audit poursuivi, site neuf", async () => {
    const db = runSetup();
    const dfs = labs([]);
    const fallback: PublicRun = {
      ...run,
      queries: ["coloriage enfant", "coloriage enfant en ligne"],
      queriesSource: "auto",
    };
    const out = await collectOwnKeywords(db.client, dfs as never, fallback);
    expect(out).toMatchObject({
      ok: true,
      newSite: true,
      pagesRanked: 0,
      queries: ["coloriage enfant", "coloriage enfant en ligne"],
    });
  });

  it("enregistre les requêtes déduites et identifie les pages à pousser", async () => {
    const db = runSetup();
    const dfs = labs([
      { keyword: "coloriage licorne", rank: 6, url: "https://monsite.fr/licorne", volume: 5400 },
      { keyword: "coloriage chat", rank: 2, url: "https://monsite.fr/chat", volume: 3000 },
    ]);
    const out = await collectOwnKeywords(db.client, dfs as never, run);
    expect(out).toMatchObject({ ok: true, pagesRanked: 2, pagesTop10: 2 });
    if (out.ok) {
      expect(out.queries).toEqual(["coloriage licorne", "coloriage chat"]);
      expect(out.priorityPages.map((p) => p.url)).toEqual(["https://monsite.fr/licorne"]);
    }
    expect(db.tables.public_audits![0]!.queries).toEqual(["coloriage licorne", "coloriage chat"]);
    // Les appels payants sont rattachés à l'audit public (cost_ledger.public_audit_id).
    expect(dfs.labsRankedKeywords).toHaveBeenCalledWith(expect.anything(), { publicAuditId: ID });
  });

  it("refuse AVANT l'appel payant si le plafond de l'audit serait dépassé", async () => {
    const db = fakeSupabase({
      cost_ledger: [{ public_audit_id: ID, estimated_cost_usd: 0.24, actual_cost_usd: 0.24 }],
    });
    const dfs = labs([]);
    await expect(collectOwnKeywords(db.client, dfs as never, run)).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(dfs.labsRankedKeywords).not.toHaveBeenCalled();
  });

  it("finalise : statut terminé, résultat, score et coût réel du journal", async () => {
    const db = runSetup();
    db.tables.public_audits![0]!.status = "en_cours";
    db.tables.cost_ledger = [
      { public_audit_id: ID, estimated_cost_usd: 0.02, actual_cost_usd: 0.0151 },
      { public_audit_id: ID, estimated_cost_usd: 0.006, actual_cost_usd: null },
    ];
    const out = await finalizePublicAudit(db.client, run, {
      own: OWN,
      ownLinks: { total: 5, domains: [], partial: false },
      competitors: [{ domain: "rival.fr", queriesCount: 1, bestRank: 2 }],
      links: [{ domain: "rival.fr", referringDomains: 100, rows: manyTargets(12) }],
    });
    expect(out.costUsd).toBeCloseTo(0.0211, 6);
    expect(db.tables.public_audits![0]).toMatchObject({ status: "termine", cost_usd: out.costUsd });
    expect(db.tables.public_audits![0]!.score).toBe(out.score);
  });
});
