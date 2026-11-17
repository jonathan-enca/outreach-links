import { t } from "@/lib/messages";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { functions } from "@/inngest/functions";
import { planDrafts } from "@/inngest/functions/plan-drafts";
import { draftItem } from "./draft";
import { summarizeDrafts } from "./drafts-section";
import { lintMessage, maxSimilarity, similarity } from "./lint";
import { summarize } from "./run";
import { startDrafts } from "./service";
import type { DraftContext, DraftItem } from "./types";
import { buildPrompt, draftSchema } from "./write";

const CTX: DraftContext = {
  siteDomain: "mega-coloring.com",
  niche: "coloriages pour enfants",
  language: "fr",
  offeredAsset: "coloriages gratuits à imprimer",
  signatureFirstName: "Jonathan",
};
const URL_OK = "https://mega-coloring.com/coloriage-licorne";

const item = (over: Partial<DraftItem> = {}): DraftItem => ({
  id: "item-1",
  domain: "blog-parents.fr",
  type: "page_ressources",
  expectedLinkType: "editorial",
  offer: null,
  rationale: "Page ressources pour parents",
  targetPageUrl: URL_OK,
  anchorText: "coloriage licorne",
  brokenUrl: null,
  channel: "email",
  pageUrl: "https://blog-parents.fr/ressources",
  pageTitle: "Ressources pour occuper les enfants",
  hook: "Nos ressources pour occuper les enfants à la maison",
  ...over,
});

const GOOD_BODY = `Bonjour,

J'ai lu votre page "Nos ressources pour occuper les enfants à la maison" et je pense que notre coloriage licorne à imprimer pourrait plaire à vos lecteurs : ${URL_OK}
Seriez-vous d'accord pour l'ajouter à votre liste ?

Jonathan`;

const lint = (over: Partial<Parameters<typeof lintMessage>[0]> = {}) =>
  lintMessage({
    channel: "email",
    subject: "Une ressource pour votre page enfants",
    body: GOOD_BODY,
    proposedUrl: URL_OK,
    hook: item().hook,
    signatureFirstName: "Jonathan",
    ...over,
  });

describe("linter de messages", () => {
  it("accepte un bon message", () => {
    expect(lint()).toEqual([]);
  });

  it.each([
    [
      "mention de l'IA",
      GOOD_BODY.replace("Seriez-vous", "Cet email est généré par une IA. Seriez-vous"),
      "mention_ia",
    ],
    ["ChatGPT", GOOD_BODY.replace("Bonjour,", "Bonjour, ChatGPT m'a aidé,"), "mention_ia"],
    ["automatisation", GOOD_BODY.replace("Bonjour,", "Message automatisé,"), "mention_ia"],
    [
      "formule creuse",
      GOOD_BODY.replace("Bonjour,", "J'espère que vous allez bien."),
      "formule_interdite",
    ],
    ["promesse", GOOD_BODY.replace("Seriez-vous", "Résultat garanti. Seriez-vous"), "promesse"],
    ["argent", GOOD_BODY.replace("Seriez-vous", "Je peux payer 50 euros. Seriez-vous"), "promesse"],
    ["gabarit", GOOD_BODY.replace("Bonjour,", "Bonjour [Prénom],"), "variable_non_remplacee"],
    ["autre URL", GOOD_BODY + "\nhttps://autre.fr/page", "url_inattendue"],
    ["URL absente", GOOD_BODY.replace(URL_OK, "notre page"), "url_absente"],
    ["sans signature", GOOD_BODY.replace("Jonathan", "Cordialement"), "signature_absente"],
    [
      "hors page",
      GOOD_BODY.replace("Nos ressources pour occuper les enfants à la maison", "votre site"),
      "hook_absent",
    ],
    ["trop court", `Bonjour ${URL_OK} Jonathan`, "trop_court"],
    ["trop long", GOOD_BODY + " mot".repeat(120) + "\nJonathan", "trop_long"],
  ])("refuse : %s", (_n, body, code) => {
    expect(lint({ body }).map((i) => i.code)).toContain(code);
  });

  it("exige un sujet pour un email, pas pour un formulaire", () => {
    expect(lint({ subject: null }).map((i) => i.code)).toContain("sujet_absent");
    expect(lint({ subject: null, channel: "formulaire" })).toEqual([]);
  });

  it("tolère une ponctuation après l'URL", () => {
    expect(lint({ body: GOOD_BODY.replace(URL_OK, `${URL_OK}.`) })).toEqual([]);
  });
});

describe("similarité", () => {
  it("détecte deux messages quasi identiques et pas deux messages distincts", () => {
    expect(similarity(GOOD_BODY, GOOD_BODY)).toBe(1);
    const other =
      "Vos lecteurs cherchent peut-être de quoi occuper les petits un jour de pluie : une planche licorne se trouve sur notre site, " +
      URL_OK +
      " . Elle pourrait compléter votre sélection. Bien à vous, Jonathan";
    expect(similarity(GOOD_BODY, other)).toBeLessThan(0.2);
    expect(maxSimilarity(GOOD_BODY, [])).toBe(0);
    expect(maxSimilarity(GOOD_BODY, [other, GOOD_BODY])).toBe(1);
  });
});

function llmReplying(replies: { subject: string | null; body: string }[]) {
  let i = 0;
  const prompts: string[] = [];
  const llm = {
    generate: async (o: { prompt: string; schema: { parse: (d: unknown) => unknown } }) => {
      prompts.push(o.prompt);
      const r = replies[Math.min(i++, replies.length - 1)]!;
      return {
        data: o.schema.parse({ ...r, targeting_reason: "Page ressources sur le même thème." }),
        costUsd: 0.0005,
      };
    },
  };
  return { llm: llm as never, prompts, calls: () => i };
}

const scope = { workspaceId: "w", auditId: "a" };
const fetchStatus = (status: number | null) => async () =>
  status === null ? null : { status, text: "" };

describe("rédaction d'un message", () => {
  it("vérifie l'URL en 200, écrit un message prêt et cumule le coût", async () => {
    const l = llmReplying([{ subject: "Une ressource pour votre page", body: GOOD_BODY }]);
    const out = await draftItem(item(), CTX, {
      llm: l.llm,
      fetch: fetchStatus(200),
      scope,
      previousBodies: [],
    });
    if (!("result" in out)) throw new Error("attendu : un message");
    expect(out.result.ready).toBe(true);
    expect(out.result.urlStatus).toBe(200);
    expect(out.result.proposedUrl).toBe(URL_OK);
    expect(out.result.issues).toEqual([]);
    expect(out.result.costUsd).toBeCloseTo(0.0005);
    expect(l.calls()).toBe(1);
  });

  it("n'écrit rien (et n'appelle pas le LLM) si l'URL ne répond pas 200", async () => {
    for (const status of [404, 500, null]) {
      const l = llmReplying([{ subject: "x", body: GOOD_BODY }]);
      const out = await draftItem(item(), CTX, {
        llm: l.llm,
        fetch: fetchStatus(status),
        scope,
        previousBodies: [],
      });
      expect("skipped" in out).toBe(true);
      expect(l.calls()).toBe(0);
    }
  });

  it("régénère une fois un message qui rate le linter, puis le garde « à relire »", async () => {
    const bad = GOOD_BODY.replace("Bonjour,", "Bonjour, écrit par une IA.");
    const l = llmReplying([{ subject: "Sujet ok", body: bad }]);
    const out = await draftItem(item(), CTX, {
      llm: l.llm,
      fetch: fetchStatus(200),
      scope,
      previousBodies: [],
    });
    if (!("result" in out)) throw new Error("attendu");
    expect(l.calls()).toBe(2);
    expect(out.result.ready).toBe(false);
    expect(out.result.issues.map((i) => i.code)).toContain("mention_ia");
  });

  it("corrige à la seconde tentative", async () => {
    const bad = GOOD_BODY.replace("Bonjour,", "Bonjour, écrit par une IA.");
    const l = llmReplying([
      { subject: "Sujet ok", body: bad },
      { subject: "Sujet ok", body: GOOD_BODY },
    ]);
    const out = await draftItem(item(), CTX, {
      llm: l.llm,
      fetch: fetchStatus(200),
      scope,
      previousBodies: [],
    });
    if (!("result" in out)) throw new Error("attendu");
    expect(out.result.ready).toBe(true);
    expect(l.calls()).toBe(2);
    expect(l.prompts[1]).toContain("NE PAS réutiliser");
  });

  it("signale un doublon avec un message déjà écrit dans le lot", async () => {
    const l = llmReplying([{ subject: "Sujet ok", body: GOOD_BODY }]);
    const out = await draftItem(item(), CTX, {
      llm: l.llm,
      fetch: fetchStatus(200),
      scope,
      previousBodies: [GOOD_BODY],
    });
    if (!("result" in out)) throw new Error("attendu");
    expect(out.result.ready).toBe(false);
    expect(out.result.issues.map((i) => i.code)).toContain("doublon");
  });

  it("un formulaire n'a pas de sujet", async () => {
    const l = llmReplying([{ subject: "Sujet inutile", body: GOOD_BODY }]);
    const out = await draftItem(item({ channel: "formulaire" }), CTX, {
      llm: l.llm,
      fetch: fetchStatus(200),
      scope,
      previousBodies: [],
    });
    if (!("result" in out)) throw new Error("attendu");
    expect(out.result.subject).toBeNull();
    expect(out.result.ready).toBe(true);
  });

  it("une panne du LLM donne un motif, jamais une exception", async () => {
    const llm = {
      generate: async () => {
        throw new Error("HTTP 529");
      },
    } as never;
    const out = await draftItem(item(), CTX, {
      llm,
      fetch: fetchStatus(200),
      scope,
      previousBodies: [],
    });
    expect("skipped" in out && out.skipped).toMatch(/impossible/i);
  });
});

describe("prompt et schéma", () => {
  it("encadre le contenu externe, interdit l'IA et inclut l'URL exacte", () => {
    const p = buildPrompt(item(), CTX, URL_OK, ["Bonjour, j'ai lu votre page"]);
    expect(p).toContain("<donnees_non_fiables>");
    expect(p).toContain(URL_OK);
    expect(p).toContain("Jonathan");
    expect(p).toContain("NE PAS réutiliser");
    expect(draftSchema.safeParse({ subject: null, body: "", targeting_reason: "x" }).success).toBe(
      false,
    );
  });
});

describe("synthèse, service et fonction", () => {
  it("résume les brouillons", () => {
    const base = {
      channel: "email" as const,
      subject: "s",
      body: "b",
      hook: "h",
      targetingReason: "r",
      proposedUrl: URL_OK,
      urlStatus: 200,
      issues: [],
      costUsd: 0,
    };
    const results = [
      { ...base, itemId: "1", ready: true },
      { ...base, itemId: "2", ready: false, channel: "formulaire" as const },
    ];
    expect(summarize(results, 1, 2)).toEqual({
      drafted: 2,
      skipped: 2,
      notDrafted: 1,
      ready: 1,
      withIssues: 1,
      email: 1,
      formulaire: 1,
    });
    expect(
      summarizeDrafts({ rows: results.map((r) => ({ ...r, domain: "d", ready: r.ready })) }),
    ).toEqual({ ready: 1, toFix: 1 });
  });

  it("refuse sans contacts terminés ou sans prénom, lance une fois, ne relance pas", async () => {
    const PLAN = "33333333-3333-4333-8333-333333333333";
    const AUDIT = "11111111-1111-4111-8111-111111111111";
    const mk = (contacts: Record<string, unknown>[], sig: string | null = "Jonathan") =>
      fakeSupabase({
        link_plans: [{ id: PLAN, audit_id: AUDIT, workspace_id: "w", version: 1 }],
        contact_runs: contacts,
        audits: [{ id: AUDIT, site_id: "s1" }],
        sites: [{ id: "s1", signature_first_name: sig }],
        draft_runs: [],
        events: [],
      });
    const sent: unknown[] = [];
    const send = async (e: unknown) => void sent.push(e);
    const run = (db: ReturnType<typeof mk>) =>
      startDrafts(db.client as never, AUDIT, () => db.client as never, send as never);
    expect((await run(mk([]))).message).toMatch(/contacts/i);
    expect((await run(mk([{ plan_id: PLAN, status: "termine" }], null))).message).toMatch(
      /prénom/i,
    );
    expect(sent).toHaveLength(0);
    const db = mk([{ plan_id: PLAN, status: "termine" }]);
    const first = await run(db);
    expect(first.message).toBe(t.drafts.messages.started);
    expect(sent).toHaveLength(1);
    expect((await run(db)).message).toMatch(/déjà/);
    expect(sent).toHaveLength(1);
  });

  it("la fonction Inngest est enregistrée", () => {
    expect(functions).toContain(planDrafts);
  });
});

describe("messages manquants (18/11)", () => {
  it("compte par plan les cibles contactables avec accroche et sans message", async () => {
    const { countMissing } = await import("./service");
    const contacts = [
      { plan_id: "p1", plan_item_id: "a" },
      { plan_id: "p1", plan_item_id: "b" },
      { plan_id: "p1", plan_item_id: "c" },
      { plan_id: "p2", plan_item_id: "d" },
    ];
    const triage = [
      { plan_item_id: "a", hook: "Une citation", page_title: null },
      { plan_item_id: "b", hook: " ", page_title: "Titre de page" },
      { plan_item_id: "c", hook: null, page_title: null }, // pas d'accroche : jamais rédigée
      { plan_item_id: "d", hook: "x", page_title: null },
    ];
    const m = countMissing(contacts, triage, [{ plan_item_id: "a" }]);
    expect([...m.entries()]).toEqual([
      ["p1", 1],
      ["p2", 1],
    ]);
  });
});
