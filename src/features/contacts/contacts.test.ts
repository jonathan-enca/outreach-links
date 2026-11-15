import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { functions } from "@/inngest/functions";
import { planContacts } from "@/inngest/functions/plan-contacts";
import { parseHtml } from "@/features/triage/page-reader";
import { summarizeContacts } from "./contacts-section";
import {
  contactCandidates,
  deobfuscate,
  extractEmails,
  isOwnDomainEmail,
  isUsableEmail,
  rankEmails,
} from "./extract";
import { investigateItem, type InvestigateDeps } from "./investigate";
import {
  createHunterProvider,
  createMxVerifier,
  createProviderFromEnv,
  mapHunterStatus,
  type EmailProvider,
} from "./provider";
import { makeSuppressionCheck, summarize } from "./run";
import { startContacts } from "./service";
import type { ContactResult, Verification } from "./types";

const html = (body: string) =>
  `<html lang="fr"><head><title>T</title></head><body>${body}</body></html>`;

function web(pages: Record<string, string>) {
  const hits: string[] = [];
  const fetch = async (url: string) => {
    hits.push(url);
    if (url.endsWith("/robots.txt")) return { status: 200, text: "User-agent: *\nAllow: /" };
    const body = pages[url];
    return body === undefined ? { status: 404, text: "" } : { status: 200, text: body };
  };
  return { fetch, hits };
}

function deps(
  fetch: InvestigateDeps["fetch"],
  over: Partial<InvestigateDeps> = {},
): InvestigateDeps {
  let t = 1_000_000;
  return {
    fetch,
    sleep: async (ms) => void (t += ms),
    now: () => t,
    provider: null,
    isSuppressed: () => false,
    paidCallsLeft: 10,
    ...over,
  };
}

function provider(
  verdict: Verification,
  found: { email: string; confidence: number }[] = [],
): EmailProvider & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: "fake",
    calls,
    findByDomain: async (d) => (calls.push(`find:${d}`), found),
    verify: async (e) => (calls.push(`verify:${e}`), verdict),
  };
}

const item = (domain: string, url: string) => ({ id: `i-${domain}`, domain, resolvedUrl: url });

describe("extraction des emails", () => {
  it("lit mailto et texte, ignore réseaux sociaux, no-reply, gabarits et fichiers", () => {
    const emails = extractEmails(
      "Écrivez à Contact@Blog.fr ou noreply@blog.fr, jean@example.com, logo@2x.png, page@facebook.com, votre@email.fr",
      ["redaction@blog.fr", "bad"],
    );
    expect(emails.sort()).toEqual(["contact@blog.fr", "redaction@blog.fr"]);
  });

  it("désobfusque « [at] », « (arobase) » et « [point] »", () => {
    expect(deobfuscate("contact [at] site [point] fr")).toBe("contact@site.fr");
    expect(extractEmails("contact(arobase)asso.fr")).toEqual(["contact@asso.fr"]);
  });

  it("classe d'abord le domaine de la cible puis les adresses de contact usuelles", () => {
    const ranked = rankEmails(
      ["jean@agence.com", "pierre@blog.fr", "contact@blog.fr"],
      "www.blog.fr",
    );
    expect(ranked).toEqual(["contact@blog.fr", "pierre@blog.fr", "jean@agence.com"]);
    expect(isOwnDomainEmail("a@mail.blog.fr", "blog.fr")).toBe(true);
    expect(isOwnDomainEmail("a@autre.fr", "blog.fr")).toBe(false);
    expect(isUsableEmail("x@t.me")).toBe(false);
  });

  it("choisit les pages de contact puis légales, au plus N", () => {
    const links = [
      { href: "https://b.fr/blog", text: "Blog" },
      { href: "https://b.fr/mentions-legales", text: "Mentions légales" },
      { href: "https://b.fr/contact", text: "Contact" },
      { href: "https://b.fr/a-propos", text: "À propos" },
      { href: "https://b.fr/cgu", text: "CGU" },
    ];
    expect(contactCandidates(links, 2)).toEqual([
      "https://b.fr/contact",
      "https://b.fr/mentions-legales",
    ]);
  });
});

describe("parseHtml : mailto et formulaire", () => {
  it("récupère les mailto et distingue formulaire de contact, recherche et commentaires", () => {
    const p = parseHtml(
      html(
        '<a href="mailto:Contact@B.fr?subject=x">m</a><form action="/search"><input name="q"></form><form id="commentform"><textarea></textarea></form>',
      ),
      "https://b.fr/",
    );
    expect(p.mailtos).toEqual(["contact@b.fr"]);
    expect(p.hasContactForm).toBe(false);
    const q = parseHtml(
      html('<form action="/envoyer"><input name="nom"><textarea name="message"></textarea></form>'),
      "https://b.fr/contact",
    );
    expect(q.hasContactForm).toBe(true);
  });
});

describe("fournisseur d'emails", () => {
  it("n'est pas créé sans clé", () => {
    expect(createProviderFromEnv({})).toBeNull();
    expect(createProviderFromEnv({ EMAIL_FINDER_API_KEY: "k" })?.name).toBe("hunter");
  });

  it("Hunter : statuts douteux jamais « valide »", () => {
    expect(mapHunterStatus("valid")).toBe("valide");
    expect(mapHunterStatus("invalid")).toBe("invalide");
    expect(mapHunterStatus("accept_all")).toBe("risque");
    expect(mapHunterStatus("webmail")).toBe("risque");
    expect(mapHunterStatus("unknown")).toBe("inconnu");
    expect(mapHunterStatus(undefined)).toBe("inconnu");
  });

  it("Hunter : appelle domain-search puis email-verifier avec la clé, erreur HTTP = exception", async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      return new Response(
        JSON.stringify(
          url.includes("domain-search")
            ? { data: { emails: [{ value: "Info@Blog.fr", confidence: 91 }, { confidence: 3 }] } }
            : { data: { status: "valid" } },
        ),
      );
    };
    const h = createHunterProvider("secret", fetchImpl);
    expect(await h.findByDomain("blog.fr")).toEqual([{ email: "info@blog.fr", confidence: 91 }]);
    expect(await h.verify("info@blog.fr")).toBe("valide");
    expect(urls[0]).toContain("domain=blog.fr");
    expect(urls[1]).toContain("email=info%40blog.fr");
    const bad = createHunterProvider("k", async () => new Response("no", { status: 429 }));
    await expect(bad.verify("a@b.fr")).rejects.toThrow(/429/);
  });
});

describe("investigateItem", () => {
  const pageWithMail = html('<a href="/contact">Contact</a><p>Écrivez-nous : contact@blog.fr</p>');

  it("email visible + vérificateur valide : envoyable", async () => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const p = provider("valide");
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: p }),
    );
    expect(r).toMatchObject({
      status: "email_verifie",
      email: "contact@blog.fr",
      emailSource: "page",
      verification: "valide",
      sendable: true,
      verifier: "fake",
      paidCalls: 1,
    });
  });

  it("email visible SANS vérificateur : à vérifier, jamais envoyable", async () => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const r = await investigateItem(item("blog.fr", "https://blog.fr/p"), deps(w.fetch));
    expect(r).toMatchObject({
      status: "email_a_verifier",
      sendable: false,
      verification: "non_verifie",
    });
    expect(r.paidCalls).toBe(0);
  });

  it.each<[Verification, string, boolean]>([
    ["invalide", "email_invalide", false],
    ["risque", "email_a_verifier", false],
    ["inconnu", "email_a_verifier", false],
  ])("vérification %s : %s, envoyable = %s", async (v, status, sendable) => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: provider(v) }),
    );
    expect(r.status).toBe(status);
    expect(r.sendable).toBe(sendable);
  });

  it("une panne du vérificateur ne rend jamais l'email envoyable", async () => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const broken: EmailProvider = {
      name: "x",
      findByDomain: async () => [],
      verify: async () => {
        throw new Error("down");
      },
    };
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: broken }),
    );
    expect(r.sendable).toBe(false);
    expect(r.status).toBe("email_a_verifier");
  });

  it("trouve l'email dans la page de contact ou les mentions légales liées", async () => {
    const w = web({
      "https://blog.fr/p": html('<a href="/mentions-legales">Mentions légales</a>'),
      "https://blog.fr/mentions-legales": html("<p>Éditeur : Jean, jean.dupont@blog.fr</p>"),
    });
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: provider("valide") }),
    );
    expect(r.email).toBe("jean.dupont@blog.fr");
    expect(r.sendable).toBe(true);
  });

  it("sans email : finder (domaine de la cible seulement), puis vérification", async () => {
    const w = web({ "https://blog.fr/p": html("<p>Rien ici</p>") });
    const p = provider("valide", [
      { email: "x@autre.com", confidence: 99 },
      { email: "info@blog.fr", confidence: 80 },
    ]);
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: p }),
    );
    expect(r).toMatchObject({
      email: "info@blog.fr",
      emailSource: "finder",
      status: "email_verifie",
    });
    expect(p.calls).toEqual(["find:blog.fr", "verify:info@blog.fr"]);
    expect(r.paidCalls).toBe(2);
  });

  it("sans email ni finder : formulaire = tâche manuelle ; sinon introuvable", async () => {
    const form = web({
      "https://blog.fr/p": html('<a href="/contact">Contact</a>'),
      "https://blog.fr/contact": html(
        '<form action="/send"><textarea name="message"></textarea></form>',
      ),
    });
    const r = await investigateItem(item("blog.fr", "https://blog.fr/p"), deps(form.fetch));
    expect(r).toMatchObject({
      status: "formulaire",
      formUrl: "https://blog.fr/contact",
      sendable: false,
    });
    const none = web({ "https://nu.fr/p": html("<p>Rien</p>") });
    const n = await investigateItem(item("nu.fr", "https://nu.fr/p"), deps(none.fetch));
    expect(n.status).toBe("introuvable");
  });

  it("un email d'un autre domaine n'est jamais envoyable ni préféré à un formulaire", async () => {
    const w = web({
      "https://blog.fr/p": html(
        "<p>Site par agence@webagency.com</p><form><textarea></textarea></form>",
      ),
    });
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: provider("valide") }),
    );
    expect(r.status).toBe("formulaire");
    expect(r.sendable).toBe(false);
    const w2 = web({ "https://blog.fr/p": html("<p>Site par agence@webagency.com</p>") });
    const r2 = await investigateItem(item("blog.fr", "https://blog.fr/p"), deps(w2.fetch));
    expect(r2).toMatchObject({ status: "email_a_verifier", sendable: false });
  });

  it("respecte la liste de suppression (domaine et adresse), sans lire la page", async () => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const dom = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { isSuppressed: makeSuppressionCheck({ emails: [], domains: ["blog.fr"] }) }),
    );
    expect(dom.status).toBe("supprime");
    expect(w.hits).toHaveLength(0);
    const mail = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, {
        isSuppressed: makeSuppressionCheck({ emails: ["contact@blog.fr"], domains: [] }),
        provider: provider("valide"),
      }),
    );
    expect(mail).toMatchObject({ status: "supprime", sendable: false });
  });

  it("plafond d'appels payants : plus de finder ni de vérification à zéro", async () => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const p = provider("valide");
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { provider: p, paidCallsLeft: 0 }),
    );
    expect(p.calls).toEqual([]);
    expect(r.sendable).toBe(false);
  });

  it("respecte robots.txt et le plafond de requêtes par cible", async () => {
    const w = web({ "https://blog.fr/p": pageWithMail });
    const robots = async (url: string) =>
      url.endsWith("/robots.txt")
        ? { status: 200, text: "User-agent: *\nDisallow: /" }
        : w.fetch(url);
    const r = await investigateItem(item("blog.fr", "https://blog.fr/p"), deps(robots));
    expect(r.status).toBe("introuvable");
    expect(w.hits).toHaveLength(0);
  });
});

describe("vérification gratuite (DNS)", () => {
  const mx = (records: string[]) =>
    createMxVerifier(async () => records.map((exchange) => ({ exchange })));
  const err = (code: string) =>
    createMxVerifier(async () => {
      throw Object.assign(new Error(code), { code });
    });

  it("valide un domaine avec MX ; invalide sans MX, null MX, inexistant ou jetable ; inconnu si panne DNS", async () => {
    expect(await mx(["mx.blog.fr"]).verify("a@blog.fr")).toBe("valide");
    expect(await mx([]).verify("a@blog.fr")).toBe("invalide");
    expect(await mx(["."]).verify("a@blog.fr")).toBe("invalide");
    expect(await err("ENOTFOUND").verify("a@blog.fr")).toBe("invalide");
    expect(await err("ENODATA").verify("a@blog.fr")).toBe("invalide");
    expect(await err("ETIMEOUT").verify("a@blog.fr")).toBe("inconnu");
    expect(await mx(["mx.yopmail.com"]).verify("a@yopmail.com")).toBe("invalide");
  });

  const page = html("<p>contact@blog.fr</p>");
  it("email publié sur le domaine de la cible + MX : envoyable, vérificateur « mx »", async () => {
    const w = web({ "https://blog.fr/p": page });
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { freeVerifier: mx(["mx.blog.fr"]) }),
    );
    expect(r).toMatchObject({
      status: "email_verifie",
      sendable: true,
      verifier: "mx",
      paidCalls: 0,
    });
  });

  it("sans MX : invalide, jamais envoyable ; panne DNS : à vérifier", async () => {
    const w = web({ "https://blog.fr/p": page });
    const none = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { freeVerifier: mx([]) }),
    );
    expect(none).toMatchObject({ status: "email_invalide", sendable: false });
    const down = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { freeVerifier: err("ETIMEOUT") }),
    );
    expect(down).toMatchObject({ status: "email_a_verifier", sendable: false });
  });

  it("n'est jamais appliquée à un email trouvé par le finder ni à une adresse d'un autre domaine", async () => {
    const w = web({ "https://blog.fr/p": html("<p>Rien</p>") });
    const found = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, {
        freeVerifier: mx(["mx.blog.fr"]),
        provider: {
          name: "fake",
          findByDomain: async () => [{ email: "info@blog.fr", confidence: 90 }],
          verify: async () => {
            throw new Error("down");
          },
        },
      }),
    );
    expect(found).toMatchObject({ emailSource: "finder", sendable: false });
    const w2 = web({ "https://blog.fr/p": html("<p>Site par agence@webagency.com</p>") });
    const other = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w2.fetch, { freeVerifier: mx(["mx.webagency.com"]) }),
    );
    expect(other.sendable).toBe(false);
  });

  it("le vérificateur payant prime ; son refus (invalide) n'est pas contourné par le DNS", async () => {
    const w = web({ "https://blog.fr/p": page });
    const r = await investigateItem(
      item("blog.fr", "https://blog.fr/p"),
      deps(w.fetch, { freeVerifier: mx(["mx.blog.fr"]), provider: provider("invalide") }),
    );
    expect(r).toMatchObject({ status: "email_invalide", sendable: false });
  });
});

describe("taux de contact sur un échantillon synthétique de 20 cibles", () => {
  // Échantillon représentatif des petits sites FR : email visible, légal, formulaire, rien.
  const sample: Record<string, Record<string, string>> = {};
  const add = (d: string, pages: Record<string, string>) => (sample[d] = pages);
  for (let i = 0; i < 6; i++)
    add(`visible${i}.fr`, { [`https://visible${i}.fr/p`]: html(`<p>contact@visible${i}.fr</p>`) });
  for (let i = 0; i < 4; i++)
    add(`legal${i}.fr`, {
      [`https://legal${i}.fr/p`]: html('<a href="/mentions-legales">Mentions légales</a>'),
      [`https://legal${i}.fr/mentions-legales`]: html(`<p>Directeur : x@legal${i}.fr</p>`),
    });
  for (let i = 0; i < 4; i++)
    add(`form${i}.fr`, {
      [`https://form${i}.fr/p`]: html('<a href="/contact">Contact</a>'),
      [`https://form${i}.fr/contact`]: html(
        '<form action="/e"><textarea name="m"></textarea></form>',
      ),
    });
  for (let i = 0; i < 3; i++)
    add(`rien${i}.fr`, { [`https://rien${i}.fr/p`]: html("<p>Bienvenue</p>") });
  for (let i = 0; i < 3; i++)
    add(`social${i}.fr`, {
      [`https://social${i}.fr/p`]: html(
        '<a href="https://facebook.com/x">FB</a><p>Suivez-nous sur contact@facebook.com</p>',
      ),
    });

  const all = Object.fromEntries(Object.values(sample).flatMap((p) => Object.entries(p)));

  it("mesure le taux de contact trouvé ; aucun email non vérifié n'est envoyable", async () => {
    const w = web(all);
    const results: ContactResult[] = [];
    for (const d of Object.keys(sample)) {
      results.push(await investigateItem(item(d, `https://${d}/p`), deps(w.fetch)));
    }
    const stats = summarize(results, 0);
    // 14 cibles sur 20 ont un email (10) ou un formulaire (4).
    expect(stats.contactRate).toBe(0.7);
    expect(stats.byStatus).toMatchObject({ email_a_verifier: 10, formulaire: 4, introuvable: 6 });
    expect(results.every((r) => !r.sendable)).toBe(true);

    // Avec un vérificateur valide : les 10 emails deviennent envoyables, pas un de plus.
    const w2 = web(all);
    const verified: ContactResult[] = [];
    for (const d of Object.keys(sample)) {
      verified.push(
        await investigateItem(
          item(d, `https://${d}/p`),
          deps(w2.fetch, { provider: provider("valide") }),
        ),
      );
    }
    expect(verified.filter((r) => r.sendable)).toHaveLength(10);
    expect(verified.filter((r) => r.sendable).every((r) => r.verification === "valide")).toBe(true);
  });
});

describe("résumés, service et job", () => {
  it("le job est enregistré et summarizeContacts compte", () => {
    expect(functions).toContain(planContacts);
    expect(
      summarizeContacts({
        rows: [
          {
            itemId: "a",
            status: "email_verifie",
            email: "a@b.fr",
            verification: "valide",
            formUrl: null,
            reason: "",
            sendable: true,
          },
          {
            itemId: "b",
            status: "formulaire",
            email: null,
            verification: "non_verifie",
            formUrl: "u",
            reason: "",
            sendable: false,
          },
          {
            itemId: "c",
            status: "introuvable",
            email: null,
            verification: "non_verifie",
            formUrl: null,
            reason: "",
            sendable: false,
          },
        ],
      }),
    ).toEqual({ sendable: 1, form: 1, missing: 1 });
  });

  it("refuse sans tri terminé, lance une fois, ne relance pas", async () => {
    const PLAN = "33333333-3333-4333-8333-333333333333";
    const AUDIT = "11111111-1111-4111-8111-111111111111";
    const mk = (triage: Record<string, unknown>[]) =>
      fakeSupabase({
        link_plans: [{ id: PLAN, audit_id: AUDIT, workspace_id: "w", version: 1 }],
        link_plan_triage_runs: triage,
        contact_runs: [],
        events: [],
      });
    const sent: unknown[] = [];
    const send = async (e: unknown) => void sent.push(e);
    const early = mk([]);
    expect(
      (
        await startContacts(
          early.client as never,
          AUDIT,
          () => early.client as never,
          send as never,
        )
      ).message,
    ).toMatch(/tri/i);
    const db = mk([{ plan_id: PLAN, status: "termine" }]);
    const r = await startContacts(
      db.client as never,
      AUDIT,
      () => db.client as never,
      send as never,
    );
    expect(r.status).toBe("ok");
    expect(sent).toHaveLength(1);
    const again = await startContacts(
      db.client as never,
      AUDIT,
      () => db.client as never,
      send as never,
    );
    expect(again.message).toMatch(/déjà/);
    expect(sent).toHaveLength(1);
  });
});
