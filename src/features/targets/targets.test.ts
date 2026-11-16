import { describe, expect, it } from "vitest";
import { buildPrompt, presentationText } from "@/features/drafting/write";
import type { DraftBrief, DraftContext, DraftItem } from "@/features/drafting/types";
import { buildBridge, type BridgeContext } from "./bridge";
import {
  cardTactics,
  countByTactic,
  eligibleIds,
  filterCards,
  isEligible,
  primaryRequest,
  sortFindings,
} from "./cards";
import { contactOf, toCard } from "./service";
import type { FindingView, TargetCard } from "./types";

const LINES = ["Proposer la page.", "Point précis : « x ».", "Pour lui : ses lecteurs."];

const finding = (kind: FindingView["kind"], over: Partial<FindingView> = {}): FindingView => ({
  id: `f-${kind}`,
  kind,
  quote: "Pour colorier, voir free printable coloring pages.",
  pageUrl: "https://ecole-x.fr/liens",
  linkUrl: kind === "mention_sans_lien" ? null : "https://x.com/p",
  httpStatus: kind === "lien_mort" ? 404 : null,
  anchor: kind === "mention_sans_lien" ? "Mega Coloring" : "free printable coloring pages",
  resourceUrl: "https://mega-coloring.com/guide",
  resourceTitle: "Guide des coloriages",
  proposedSentence:
    kind === "mention_sans_lien" ? "[Mega Coloring](https://mega-coloring.com/)" : null,
  reason: "Constat.",
  requestLines: ["a", "b", "c"],
  opening: "Votre page contient un lien qui ne fonctionne plus.",
  ...over,
});

const card = (id: string, over: Partial<TargetCard> = {}): TargetCard => ({
  id,
  rank: 1,
  domain: `${id}.fr`,
  pageUrl: `https://${id}.fr/page`,
  pageTitle: "Ressources",
  siteType: "ecole",
  tactics: ["inconnus"],
  why: "Blog de classe rarement sollicité.",
  hook: "Nos coloriages préférés pour la maternelle.",
  contact: { kind: "email", verified: true, email: `contact@${id}.fr`, url: null },
  requestLines: LINES,
  findings: [],
  contactless: false,
  domainRank: 120,
  platformHosted: false,
  alreadyValidated: false,
  resource: { url: "https://mega-coloring.com/maternelle", title: "Coloriages maternelle" },
  ...over,
});

const CTX: BridgeContext = {
  siteDomain: "mega-coloring.com",
  brandName: "Mega Coloring",
  resources: [
    { url: "https://mega-coloring.com/", title: "Accueil de Mega Coloring" },
    { url: "https://mega-coloring.com/guide", title: "Guide des coloriages" },
  ],
  role: "equipe",
  offeredAsset: "Des coloriages gratuits à imprimer",
};

describe("cartes : constats, tactiques et filtre", () => {
  it("la preuve constatée passe avant la mention, puis le lien inadapté", () => {
    const sorted = sortFindings([
      finding("lien_inadapte"),
      finding("mention_sans_lien"),
      finding("lien_mort"),
    ]);
    expect(sorted.map((f) => f.kind)).toEqual(["lien_mort", "mention_sans_lien", "lien_inadapte"]);
  });
  it("les constats ajoutent leur tactique à celles de la collecte", () => {
    const c = card("a", { tactics: ["inconnus"], findings: [finding("lien_mort")] });
    expect(cardTactics(c).sort()).toEqual(["inconnus", "ressources"]);
    const m = card("b", { tactics: ["inconnus"], findings: [finding("mention_sans_lien")] });
    expect(cardTactics(m).sort()).toEqual(["inconnus", "mentions"]);
  });
  it("filtre et compte par tactique", () => {
    const cards = [
      card("a", { tactics: ["inconnus"] }),
      card("b", { tactics: ["ressources"] }),
      card("c", { tactics: ["mentions"] }),
      card("d", { tactics: ["inconnus"], findings: [finding("mention_sans_lien")] }),
    ];
    expect(filterCards(cards, "toutes")).toHaveLength(4);
    expect(filterCards(cards, "inconnus").map((c) => c.id)).toEqual(["a", "d"]);
    expect(filterCards(cards, "mentions").map((c) => c.id)).toEqual(["c", "d"]);
    expect(countByTactic(cards)).toEqual({ toutes: 4, inconnus: 2, ressources: 1, mentions: 2 });
  });
  it("la demande principale vient du constat le plus probant, sinon de la qualification", () => {
    const withF = card("a", { findings: [finding("lien_inadapte"), finding("lien_mort")] });
    expect(primaryRequest(withF)).toMatchObject({ kind: "lien_mort", lines: ["a", "b", "c"] });
    const without = card("b", { tactics: ["ressources"] });
    expect(primaryRequest(without)).toMatchObject({
      kind: "page_ressources",
      lines: LINES,
      quote: without.hook,
      finding: null,
    });
    expect(primaryRequest(card("c")).kind).toBe("site_non_sollicite");
  });
  it("seules les cibles de la liste courte avec contact, non déjà validées, sont retenables", () => {
    const cards = [
      card("ok"),
      card("sans", { contact: { kind: "aucun", verified: false, email: null, url: null } }),
      card("deja", { alreadyValidated: true }),
      card("mentions", { contactless: true }),
      card("form", {
        contact: { kind: "formulaire", verified: false, email: null, url: "https://f.fr/c" },
      }),
    ];
    expect(cards.filter(isEligible).map((c) => c.id)).toEqual(["ok", "form"]);
    expect(eligibleIds(cards)).toEqual(["ok", "form"]);
  });
});

describe("lecture des lignes de la base", () => {
  it("contact : email vérifié, à vérifier, formulaire ou aucun (jamais d'email inventé)", () => {
    const base = { contact_url: null, form_url: null };
    expect(
      contactOf({ ...base, contact_status: "email_verifie", contact_email: "a@b.fr" }),
    ).toMatchObject({
      kind: "email",
      verified: true,
    });
    expect(
      contactOf({ ...base, contact_status: "email_a_verifier", contact_email: "a@b.fr" }),
    ).toMatchObject({
      kind: "email",
      verified: false,
    });
    expect(
      contactOf({
        contact_status: "formulaire",
        contact_email: null,
        contact_url: null,
        form_url: "https://b.fr/c",
      }),
    ).toMatchObject({ kind: "formulaire", url: "https://b.fr/c" });
    expect(contactOf({ ...base, contact_status: "formulaire", contact_email: null })).toMatchObject(
      {
        kind: "aucun",
      },
    );
    expect(contactOf({ ...base, contact_status: "email_verifie", contact_email: null }).kind).toBe(
      "aucun",
    );
  });
  it("toCard : cible hors liste courte = sans contact, ressource du jugement, constats de la cible seulement", () => {
    const row = {
      id: "t1",
      run_id: "r",
      audit_id: "a",
      workspace_id: "w",
      domain: "ecole-x.fr",
      url: "https://ecole-x.fr/liens",
      tactics: ["mentions", "bidon"],
      status: "exclu",
      stage_reached: 5,
      exclusion_reason: "sans_contact",
      exclusion_detail: null,
      provisional_score: 0.5,
      platform_hosted: false,
      domain_rank: 12,
      competitors_count: 0,
      page: { title: "Liens utiles" },
      site_type: "ecole",
      fit: 0.8,
      judgement: { resource: 1 },
      hook: null,
      contact_status: null,
      contact_email: null,
      contact_url: null,
      form_url: null,
      sendable: false,
      score: null,
      score_parts: null,
      rank: null,
      request_lines: null,
      why: null,
      created_at: "",
    } as unknown as Parameters<typeof toCard>[0];
    const frows = [
      { id: "f1", target_id: "t1", kind: "mention_sans_lien", brief: { opening: "Vous citez" } },
      { id: "f2", target_id: "autre", kind: "lien_mort", brief: {} },
    ] as unknown as Parameters<typeof toCard>[1];
    const c = toCard(row, frows, CTX.resources, new Set(["t1"]));
    expect(c).toMatchObject({
      contactless: true,
      tactics: ["mentions"],
      pageTitle: "Liens utiles",
      alreadyValidated: true,
      resource: { url: "https://mega-coloring.com/guide" },
      domainRank: 12,
    });
    expect(c.findings.map((f) => f.id)).toEqual(["f1"]);
    expect(c.findings[0]!.opening).toBe("Vous citez");
    expect(c.contact.kind).toBe("aucun");
    expect(isEligible(c)).toBe(false);
  });
});

describe("pont vers le plan de liens", () => {
  it("un élément de plan par demande, la présentation choisie, la citation exacte de la page", () => {
    const c = card("a", { findings: [finding("lien_mort")] });
    const { items, skipped } = buildBridge([c], CTX);
    expect(skipped).toEqual([]);
    expect(items).toHaveLength(1);
    const it = items[0]!;
    expect(it.planItem).toMatchObject({
      type: "lien_mort",
      source_domain: "a.fr",
      source_url: "https://ecole-x.fr/liens",
      target_page_url: "https://mega-coloring.com/guide",
      broken_url: "https://x.com/p",
      expected_link_type: "reprise_lien_mort",
      anchor_text: "free printable coloring pages",
      anchor_kind: "descriptive",
      offer: "Des coloriages gratuits à imprimer",
      priority: "haute",
    });
    expect(it.brief).toMatchObject({
      presentation: "equipe",
      quote: "Pour colorier, voir free printable coloring pages.",
      httpStatus: 404,
      opening: "Votre page contient un lien qui ne fonctionne plus.",
    });
    expect(it.contact).toMatchObject({ status: "email_verifie", verified: true });
    expect(it.triage.hook).toBe("Pour colorier, voir free printable coloring pages.");
  });
  it("sans constat : ressource du jugement, accroche vérifiée de la qualification, ancre descriptive", () => {
    const { items } = buildBridge([card("b", { tactics: ["ressources"] })], CTX);
    expect(items[0]!.planItem).toMatchObject({
      type: "page_ressources",
      target_page_url: "https://mega-coloring.com/maternelle",
      anchor_text: "Coloriages maternelle",
      expected_link_type: "ressource",
    });
    expect(items[0]!.brief.quote).toBe("Nos coloriages préférés pour la maternelle.");
  });
  it("mention : ancre = le nom, type « mention »", () => {
    const c = card("m", { findings: [finding("mention_sans_lien")] });
    const it = buildBridge([c], CTX).items[0]!;
    expect(it.planItem).toMatchObject({
      type: "mention",
      anchor_kind: "marque",
      anchor_text: "Mega Coloring",
    });
    expect(it.brief.proposedSentence).toContain("[Mega Coloring]");
  });
  it("formulaire : tâche pour l'utilisateur ; email à vérifier : pas envoyable", () => {
    const { items } = buildBridge(
      [
        card("f", {
          contact: { kind: "formulaire", verified: false, email: null, url: "https://f.fr/c" },
        }),
        card("e", { contact: { kind: "email", verified: false, email: "a@e.fr", url: null } }),
      ],
      CTX,
    );
    expect(items[0]!.contact).toMatchObject({
      status: "formulaire",
      formUrl: "https://f.fr/c",
      email: null,
    });
    expect(items[1]!.contact).toMatchObject({ status: "email_a_verifier", verified: false });
  });
  it("ignore, avec le motif, ce qui n'a ni contact, ni page, ni n'est nouveau", () => {
    const { items, skipped } = buildBridge(
      [
        card("ok"),
        card("sans", { contact: { kind: "aucun", verified: false, email: null, url: null } }),
        card("mentions", { contactless: true }),
        card("deja", { alreadyValidated: true }),
        card("nopage", { pageUrl: null }),
        card("troislignes", { requestLines: ["a"] }),
      ],
      CTX,
    );
    expect(items.map((i) => i.card.id)).toEqual(["ok"]);
    expect(skipped).toEqual([
      { domain: "sans.fr", reason: "contact" },
      { domain: "mentions.fr", reason: "contact" },
      { domain: "deja.fr", reason: "deja_validee" },
      { domain: "nopage.fr", reason: "page" },
      { domain: "troislignes.fr", reason: "page" },
    ]);
  });
  it("priorité par rang", () => {
    const { items } = buildBridge(
      [card("a", { rank: 3 }), card("b", { rank: 20 }), card("c", { rank: 39 })],
      CTX,
    );
    expect(items.map((i) => i.planItem.priority)).toEqual(["haute", "moyenne", "basse"]);
  });
});

describe("rédacteur branché sur le brief des constats", () => {
  const dctx: DraftContext = {
    siteDomain: "mega-coloring.com",
    niche: "coloriages",
    language: "fr",
    offeredAsset: null,
    signatureFirstName: "Léa",
  };
  const brief = (presentation: DraftBrief["presentation"]): DraftBrief => ({
    kind: "lien_mort",
    opening: "Votre page contient un lien qui ne fonctionne plus.",
    resourceTitle: "Guide des coloriages",
    resourceUrl: "https://mega-coloring.com/guide",
    anchor: "guide",
    presentation,
    quote: "Pour colorier, voir free printable coloring pages.",
    linkUrl: "https://x.com/p",
    httpStatus: 404,
    proposedSentence: null,
  });
  const item = (b: DraftBrief | null): DraftItem => ({
    id: "i",
    domain: "ecole-x.fr",
    type: "lien_mort",
    expectedLinkType: "reprise_lien_mort",
    offer: null,
    rationale: "Blog de classe",
    targetPageUrl: "https://mega-coloring.com/guide",
    anchorText: "guide",
    brokenUrl: "https://x.com/p",
    channel: "email",
    pageUrl: "https://ecole-x.fr/liens",
    pageTitle: "Liens",
    hook: "Pour colorier, voir free printable coloring pages.",
    brief: b,
  });
  const payload = (p: string) =>
    JSON.parse(p.split("<donnees_non_fiables>\n")[1]!.split("\n</donnees_non_fiables>")[0]!) as {
      brief?: Record<string, unknown>;
    };
  it("le prompt porte le point précis, la ressource, l'erreur constatée et la présentation choisie", () => {
    const p = payload(
      buildPrompt(item(brief("equipe")), dctx, "https://mega-coloring.com/guide", []),
    );
    expect(p.brief).toMatchObject({
      constat: "lien_mort",
      erreur_http_constatee: 404,
      ressource_a_proposer: { url: "https://mega-coloring.com/guide" },
      presentation_a_utiliser: "Je suis Léa, de l'équipe de mega-coloring.com",
    });
  });
  it("jamais « fondateur » sans l'accord de l'utilisateur", () => {
    expect(presentationText("equipe", "Léa", "s.fr")).not.toContain("fondateur");
    expect(presentationText("agence", "Léa", "s.fr")).not.toContain("fondateur");
    expect(presentationText("fondateur", "Léa", "s.fr")).toContain("fondateur de s.fr");
  });
  it("sans brief (plan d'opportunités), le prompt est inchangé", () => {
    const p = payload(buildPrompt(item(null), dctx, "https://mega-coloring.com/guide", []));
    expect(p.brief).toBeUndefined();
  });
});
