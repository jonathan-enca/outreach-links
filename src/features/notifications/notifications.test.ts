import { describe, expect, it } from "vitest";
import {
  analysisEmail,
  idleEmail,
  linkLiveEmail,
  linkLostEmail,
  mailboxEmail,
  monthHasNews,
  monthlyEmail,
  paymentEmail,
  ofMonth,
  quotaEmail,
  quotaLevel,
  reminderEmail,
  replyEmail,
  replyKind,
  toValidateEmail,
  weekHasNews,
  weeklyEmail,
} from "./emails";
import { countForms, isIdle, isQuietTime, pendingDecision } from "./run";
import { renderNotification } from "./template";
import { readUnsubscribeToken, unsubscribeToken } from "./unsubscribe";

const links = { appUrl: "https://app.test", unsubscribeUrl: "https://app.test/u?t=x" };
const WS = "11111111-2222-3333-4444-555555555555";

describe("gabarit commun", () => {
  const email = replyEmail(
    [
      { domain: "carnet-de-lea.fr", category: "accepte_lien_pose" },
      { domain: "<b>x</b>.fr", category: "demande_paiement" },
      { domain: null, category: "ambigu" },
    ],
    "https://app.test/app/a-valider?a=1&b=2",
  );
  const out = renderNotification(email, links);
  it("un seul bouton, le pied avec la désinscription et les réglages, tout échappé", () => {
    expect(out.html.match(/border-radius:10px;background:#003070/g)).toHaveLength(1);
    expect(out.html).toContain("a-valider?a=1&amp;b=2");
    expect(out.html).not.toContain("<b>x</b>.fr");
    expect(out.html).toContain("Ne plus recevoir cet email");
    expect(out.html).toContain("https://app.test/app/reglages/notifications");
    expect(out.text).toContain("Voir les réponses : https://app.test/app/a-valider?a=1&b=2");
  });
  it("jamais de montant en dollars ni de mention d'IA", () => {
    expect(`${out.subject}${out.text}`).not.toMatch(/\$|USD|\bIA\b|intelligence artificielle/i);
  });
  it("email toujours envoyé : pas de lien de désinscription", () => {
    const m = renderNotification(mailboxEmail({ email: "a@b.fr", pending: 8 }, "https://x.test"), {
      appUrl: "https://app.test",
      unsubscribeUrl: null,
    });
    expect(m.html).not.toContain("Ne plus recevoir");
    expect(m.html).toContain("il est toujours envoyé");
    expect(m.html).toContain("<b>a@b.fr</b>");
    expect(m.text).toContain("Messages validés en attente : 8");
  });
});

describe("une réponse vous attend", () => {
  it("une seule réponse : le site et le type sont nommés", () => {
    const m = replyEmail([{ domain: "site.fr", category: "question" }], "u");
    expect(m.subject).toBe("site.fr a répondu à votre message");
    expect(m.preheader).toBe("Type de réponse : Question.");
    expect(m.cta.label).toBe("Voir la réponse");
  });
  it("plusieurs réponses : le compte, et une pastille par site", () => {
    const m = replyEmail(
      [
        { domain: "a.fr", category: "accepte_lien_pose" },
        { domain: "b.fr", category: "demande_paiement" },
      ],
      "u",
    );
    expect(m.subject).toBe("2 réponses attendent votre décision");
    expect(m.title).toBe("2 sites vous ont répondu");
  });
  it("catégorie inconnue ou à risque : « à relire », jamais un type inventé", () => {
    expect(replyKind("plainte_hostile")).toBe("autre");
    expect(replyKind(null)).toBe("autre");
    expect(replyKind("demande_echange")).toBe("echange");
  });
});

describe("des messages sont à valider", () => {
  it("annonce les messages, les formulaires et le premier départ", () => {
    const m = toValidateEmail(
      {
        messages: 12,
        forms: 3,
        domain: "site.fr",
        firstStart: "lundi 24 novembre à 9 h",
        sendingNow: false,
      },
      "u",
    );
    expect(m.subject).toBe("12 messages sont prêts à partir pour site.fr");
    expect(renderNotification(m, links).text).toContain(
      "Premier départ après validation : lundi 24 novembre à 9 h",
    );
  });
  it("sans boîte connectée : aucune heure promise", () => {
    const m = toValidateEmail(
      { messages: 1, forms: 0, domain: null, firstStart: null, sendingNow: false },
      "u",
    );
    expect(m.subject).toBe("1 message est prêt à partir");
    expect(renderNotification(m, links).text).not.toContain("Premier départ");
  });
  it("seulement des formulaires : l'objet le dit", () => {
    const m = toValidateEmail(
      { messages: 0, forms: 2, domain: null, firstStart: null, sendingNow: true },
      "u",
    );
    expect(m.subject).toBe("2 formulaires sont à remplir à la main");
  });
  it("rappel : dit que c'est le seul", () => {
    const m = reminderEmail({ messages: 12, days: 3, domain: "site.fr" }, "u");
    expect(m.subject).toBe("12 messages attendent toujours votre accord");
    expect(renderNotification(m, links).text).toContain("seul rappel");
  });
});

describe("quand prévenir pour les messages à valider", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  it("premier email dès qu'il y a des messages", () => {
    expect(pendingDecision({ generatedAt: [ago(1)], last: null, reminded: false, now })).toEqual({
      kind: "new",
    });
  });
  it("un par jour au plus", () => {
    expect(
      pendingDecision({ generatedAt: [ago(1)], last: ago(5), reminded: false, now }),
    ).toBeNull();
    expect(pendingDecision({ generatedAt: [ago(1)], last: ago(25), reminded: false, now })).toEqual(
      { kind: "new" },
    );
  });
  it("rien de nouveau : un seul rappel, après 3 jours", () => {
    const base = { generatedAt: [ago(100)], now };
    expect(pendingDecision({ ...base, last: ago(48), reminded: false })).toBeNull();
    expect(pendingDecision({ ...base, last: ago(73), reminded: false })).toEqual({
      kind: "reminder",
      days: 3,
    });
    expect(pendingDecision({ ...base, last: ago(73), reminded: true })).toBeNull();
  });
  it("rien en attente : rien", () => {
    expect(pendingDecision({ generatedAt: [], last: null, reminded: false, now })).toBeNull();
  });
});

describe("liens", () => {
  it("lien en ligne : les deux pages, le texte du lien, suivi ou non", () => {
    const m = linkLiveEmail(
      {
        sourceDomain: "a.fr",
        sourceUrl: "https://a.fr/ressources/",
        targetUrl: "https://site.fr/guide",
        anchor: "ce guide",
        rel: "nofollow",
        siteDomain: "site.fr",
      },
      "u",
    );
    const text = renderNotification(m, links).text;
    expect(text).toContain("Page qui vous cite : a.fr/ressources");
    expect(text).toContain("Texte du lien : « ce guide »");
    expect(text).toContain("Suivi par Google : Non");
  });
  const lost = {
    sourceDomain: "a.fr",
    sourceUrl: "https://a.fr/liens",
    firstLiveAt: new Date("2026-10-03T08:00:00Z"),
    alertAt: new Date("2026-11-21T08:00:00Z"),
    siteDomain: "site.fr",
  };
  it("disparu : dates en clair", () => {
    const m = linkLostEmail([{ ...lost, alert: "disparu" }], "u");
    expect(m.subject).toBe("Un lien vers site.fr a disparu");
    const text = renderNotification(m, links).text;
    expect(text).toContain("En ligne depuis : le 3 octobre");
    expect(text).toContain("Disparu : le 21 novembre");
  });
  it("plus suivi par Google : « a changé », pas « a disparu »", () => {
    const m = linkLostEmail([{ ...lost, alert: "devenu_nofollow" }], "u");
    expect(m.subject).toBe("Un lien vers site.fr a changé");
  });
  it("plusieurs changements le même jour : un seul email", () => {
    const m = linkLostEmail(
      [
        { ...lost, alert: "disparu" },
        { ...lost, sourceDomain: "b.fr", alert: "non_indexable" },
      ],
      "u",
    );
    expect(m.subject).toBe("2 liens vers votre site ont changé");
    expect(m.cta.label).toBe("Voir mes liens");
  });
});

describe("quota du mois", () => {
  const now = new Date("2026-11-22T10:00:00Z");
  it("paliers : rien sous 80 %, puis 80, puis 100", () => {
    expect(quotaLevel(79, 100)).toBeNull();
    expect(quotaLevel(80, 100)).toBe(80);
    expect(quotaLevel(100, 100)).toBe(100);
    expect(quotaLevel(5, 0)).toBeNull();
  });
  it("à 80 % : ce qu'il reste, la date de remise à zéro, l'offre au-dessus", () => {
    const m = quotaEmail(
      { used: 80, cap: 100, level: 80, plan: "Starter", next: { plan: "Pro", cap: 300 }, now },
      "u",
    );
    expect(m.subject).toBe("Vous avez utilisé 80 de vos 100 envois de novembre");
    expect(m.preheader).toBe("Il vous reste 20 envois jusqu'au 30 novembre.");
    const text = renderNotification(m, links).text;
    expect(text).toContain("repart à zéro le 1er décembre");
    expect(text).toContain("L'offre Pro comprend 300 envois par mois.");
  });
  it("à 100 % pendant la bêta : pas de nom d'offre inventé", () => {
    const m = quotaEmail({ used: 104, cap: 100, level: 100, plan: null, next: null, now }, "u");
    expect(m.subject).toBe("Vos 100 envois de novembre sont utilisés");
    expect(renderNotification(m, links).text).toContain(
      "100 envois utilisés sur les 100 compris pendant la bêta",
    );
  });
});

describe("campagne à l'arrêt", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  const at = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const sent = (id: string, status: string, h: number) => ({
    draft_id: id,
    status,
    claimed_at: at(h),
  });
  it("tout est parti depuis un jour : à l'arrêt", () => {
    expect(
      isIdle({
        validatedDraftIds: ["a", "b"],
        sent: [sent("a", "envoye", 30), sent("b", "ignore", 40)],
        now,
      }),
    ).toEqual({ lastAt: at(30) });
  });
  it("un message validé pas encore parti, ou un envoi en cours : pas à l'arrêt", () => {
    expect(
      isIdle({ validatedDraftIds: ["a", "b"], sent: [sent("a", "envoye", 30)], now }),
    ).toBeNull();
    expect(
      isIdle({
        validatedDraftIds: ["a", "b"],
        sent: [sent("a", "envoye", 30), sent("b", "a_reessayer", 30)],
        now,
      }),
    ).toBeNull();
  });
  it("dernier départ il y a moins d'un jour, ou aucun envoi réel : rien", () => {
    expect(isIdle({ validatedDraftIds: ["a"], sent: [sent("a", "envoye", 3)], now })).toBeNull();
    expect(isIdle({ validatedDraftIds: [], sent: [], now })).toBeNull();
  });
  it("l'email : il reste des sites, ou tous sont contactés", () => {
    const urls = { targets: "t", campaigns: "c" };
    const m = idleEmail({ domain: "site.fr", sent: 41, replies: 6, links: 2, left: 23 }, urls);
    expect(m.cta).toEqual({ label: "Préparer les messages suivants", url: "t" });
    expect(renderNotification(m, links).html).toContain("<b>23 sites retenus</b>");
    const none = idleEmail({ domain: "site.fr", sent: 41, replies: 0, links: 0, left: 0 }, urls);
    expect(none.cta.url).toBe("c");
  });
});

describe("résumé de la semaine", () => {
  const todo = { replies: 0, messages: 0, forms: 0 };
  it("rien de nouveau : pas d'email", () => {
    expect(
      weekHasNews({
        sites: [{ domain: "a.fr", sent: 0, replies: 0, links: 0 }],
        newLinks: [],
        todo,
      }),
    ).toBe(false);
    expect(weekHasNews({ sites: [], newLinks: [], todo: { ...todo, replies: 1 } })).toBe(true);
  });
  it("un site : chiffres, liens et actions", () => {
    const m = weeklyEmail(
      {
        sites: [{ domain: "site.fr", sent: 34, replies: 5, links: 2 }],
        newLinks: ["a.fr", "b.org"],
        todo: { replies: 2, messages: 12, forms: 3 },
      },
      "u",
    );
    expect(m.subject).toBe("Votre semaine : 2 liens obtenus, 5 réponses");
    expect(m.title).toBe("Votre semaine sur site.fr");
    const text = renderNotification(m, links).text;
    expect(text).toContain("34 messages envoyés · 5 réponses · 2 liens obtenus");
    expect(text).toContain("Messages à valider : 12");
  });
  it("plusieurs sites : un seul email, une ligne par site actif", () => {
    const m = weeklyEmail(
      {
        sites: [
          { domain: "a.fr", sent: 3, replies: 0, links: 0 },
          { domain: "b.fr", sent: 0, replies: 0, links: 0 },
        ],
        newLinks: [],
        todo,
      },
      "u",
    );
    expect(m.subject).toBe("Votre semaine : 3 messages envoyés");
    const text = renderNotification(m, links).text;
    expect(text).toContain("a.fr : 3 envoyés");
    expect(text).not.toContain("b.fr");
  });
});

describe("analyse prête", () => {
  it("sites étudiés affichés seulement s'ils dépassent les retenus", () => {
    const m = analysisEmail({ domain: "site.fr", kept: 38, studied: 214 }, "u");
    expect(m.preheader).toBe("38 sites retenus sur 214 étudiés.");
    expect(analysisEmail({ domain: "site.fr", kept: 38, studied: 0 }, "u").preheader).toBe(
      "38 sites retenus.",
    );
  });
});

describe("heures calmes", () => {
  it("en semaine de 8 h à 19 h à Paris, sinon on attend", () => {
    expect(isQuietTime(new Date("2026-11-23T09:00:00Z"))).toBe(false); // lundi 10 h
    expect(isQuietTime(new Date("2026-11-23T21:00:00Z"))).toBe(true); // lundi 22 h
    expect(isQuietTime(new Date("2026-11-22T10:00:00Z"))).toBe(true); // dimanche
  });
});

describe("lien de désinscription", () => {
  it("le jeton désigne un espace et un type d'email", () => {
    const token = unsubscribeToken(WS, "weekly", "secret-de-test-1234");
    expect(readUnsubscribeToken(token, "secret-de-test-1234")).toEqual({
      workspaceId: WS,
      key: "weekly",
    });
  });
  it("jeton modifié, autre secret ou type inconnu : refusé", () => {
    const token = unsubscribeToken(WS, "weekly", "secret-de-test-1234");
    expect(
      readUnsubscribeToken(token.replace("weekly", "quota"), "secret-de-test-1234"),
    ).toBeNull();
    expect(readUnsubscribeToken(token, "autre-secret-0000000")).toBeNull();
    expect(readUnsubscribeToken(`${WS}.mailbox.x`, "secret-de-test-1234")).toBeNull();
    expect(readUnsubscribeToken(undefined, "secret-de-test-1234")).toBeNull();
  });
});

describe("bilan du mois", () => {
  const base = {
    month: new Date("2026-11-01T00:00:00Z"),
    next: new Date("2026-12-01T00:00:00Z"),
    sent: 118,
    replies: 17,
    links: 5,
    liveEver: 9,
    lost: 0,
    campaigns: 1 as number | null,
  };
  const urls = { campaigns: "c", home: "h" };
  it("« de novembre », « d'avril »", () => {
    expect(ofMonth(new Date("2026-11-01T00:00:00Z"))).toBe("de novembre");
    expect(ofMonth(new Date("2026-04-01T00:00:00Z"))).toBe("d'avril");
  });
  it("mois actif : chiffres, et la campagne du mois qui commence", () => {
    const m = monthlyEmail(base, urls);
    expect(m.subject).toBe("Votre mois de novembre : 5 liens obtenus");
    expect(m.cta).toEqual({ label: "Lancer la campagne de décembre", url: "c" });
    const text = renderNotification(m, links).text;
    expect(text).toContain("Sites qui ont répondu : 17 sur 118");
    expect(text).toContain("Votre campagne de décembre est disponible");
    expect(text).not.toMatch(/audit/i);
  });
  it("mois sans activité : seulement le rappel de la campagne", () => {
    const m = monthlyEmail({ ...base, sent: 0, replies: 0, links: 0 }, urls);
    expect(m.subject).toBe("Votre campagne de décembre est disponible");
    expect(renderNotification(m, links).text).not.toContain("messages envoyés");
  });
  it("aucune campagne possible : pas de promesse, et rien du tout sans activité", () => {
    const m = monthlyEmail({ ...base, campaigns: null }, urls);
    expect(m.cta).toEqual({ label: "Ouvrir mon espace", url: "h" });
    expect(renderNotification(m, links).text).not.toContain("est disponible");
    expect(monthHasNews({ ...base, sent: 0, replies: 0, links: 0, campaigns: null })).toBe(false);
  });
});

describe("paiement refusé", () => {
  const failedAt = new Date("2026-11-22T09:00:00Z");
  const pauseAt = new Date("2026-11-29T09:00:00Z");
  it("montant, offre, date du refus et date de la pause ; toujours envoyé", () => {
    const m = paymentEmail({ amountCents: 3990, plan: "Pro", failedAt, pauseAt }, "u");
    const out = renderNotification(m, { appUrl: "https://app.test", unsubscribeUrl: null });
    expect(out.text).toMatch(
      /Le prélèvement de 39,90\s€ pour l'offre Pro a été refusé le 22 novembre\./,
    );
    expect(out.text).toContain("Vos campagnes continuent jusqu'au 29 novembre.");
    expect(out.text).toContain("rien ne sera supprimé");
    expect(out.html).not.toContain("Ne plus recevoir");
  });
  it("montant inconnu : la phrase reste juste", () => {
    const m = paymentEmail({ amountCents: null, plan: "Starter", failedAt, pauseAt }, "u");
    expect(renderNotification(m, links).text).toContain(
      "Le prélèvement pour l'offre Starter a été refusé le 22 novembre.",
    );
  });
});

describe("formulaires à remplir", () => {
  const item = (id: string) => ({ plan_item_id: id });
  it("un brouillon qui a déjà sa tâche n'est compté qu'une fois", () => {
    expect(countForms([item("a"), item("b")], [item("a"), item("b"), item("c")])).toBe(3);
  });
  it("un brouillon sans tâche compte en plus ; rien à faire : zéro", () => {
    expect(countForms([item("a"), item("z")], [item("a")])).toBe(2);
    expect(countForms([], [])).toBe(0);
  });
});
