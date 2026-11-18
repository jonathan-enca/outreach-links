import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { encryptSecret, parseKeyRing } from "@/features/mailboxes/crypto";
import { sendOutreachMail } from "@/features/mailboxes/transport";
import {
  buildOutgoing,
  makeMessageId,
  makeUnsubscribeToken,
  verifyUnsubscribeToken,
  verifyUnsubscribeTokenWithRing,
} from "./message";
import { buildFollowUp, followUpState, type SignalKind } from "./followup";
import {
  addDays,
  describeWindow,
  effectiveDailyCap,
  isInSendWindow,
  nextSendStart,
  planSendTimes,
} from "./schedule";
import { formatSendTime, queueNoteText, queuedMessageText } from "./queue-note";
import { runSendTick, type SendDeps } from "./service";

const W = { timezone: "Europe/Paris", startHour: 9, endHour: 18 };

describe("fenêtre d'envoi et échauffement", () => {
  it("heures ouvrées du fuseau de la boîte, semaine seulement", () => {
    expect(isInSendWindow(new Date("2026-11-16T10:00:00+01:00"), W)).toBe(true); // lundi
    expect(isInSendWindow(new Date("2026-11-16T08:59:00+01:00"), W)).toBe(false);
    expect(isInSendWindow(new Date("2026-11-16T18:00:00+01:00"), W)).toBe(false);
    expect(isInSendWindow(new Date("2026-11-21T11:00:00+01:00"), W)).toBe(false); // samedi
    expect(isInSendWindow(new Date("2026-11-22T11:00:00+01:00"), W)).toBe(false); // dimanche
    expect(
      isInSendWindow(new Date("2026-11-16T10:00:00+01:00"), { ...W, timezone: "Nope/Zone" }),
    ).toBe(false);
  });
  it("prochaine ouverture : le soir même, le lendemain 9 h ; le vendredi soir, le lundi", () => {
    expect(nextSendStart(new Date("2026-11-17T10:00:00+01:00"), W)).toBeNull();
    expect(nextSendStart(new Date("2026-11-17T22:14:00+01:00"), W)?.toISOString()).toBe(
      new Date("2026-11-18T09:00:00+01:00").toISOString(),
    );
    expect(nextSendStart(new Date("2026-11-20T18:30:00+01:00"), W)?.toISOString()).toBe(
      new Date("2026-11-23T09:00:00+01:00").toISOString(),
    );
    expect(
      queueNoteText({
        state: "ferme",
        waiting: 5,
        hours: "",
        nextAt: new Date("2026-11-18T09:00:00+01:00"),
        timezone: "Europe/Paris",
      }),
    ).toBe("5 emails approuvés partiront à la reprise des envois, mercredi 18 novembre à 9 h.");
    expect(
      nextSendStart(new Date("2026-11-17T22:14:00+01:00"), { ...W, timezone: "Nulle/Part" }),
    ).toBeNull();
  });
  it("jours réglables : une boîte peut envoyer le samedi et se taire le lundi", () => {
    const sat = { ...W, days: [2, 3, 4, 5, 6] };
    expect(isInSendWindow(new Date("2026-11-21T11:00:00+01:00"), sat)).toBe(true); // samedi
    expect(isInSendWindow(new Date("2026-11-16T10:00:00+01:00"), sat)).toBe(false); // lundi
    expect(isInSendWindow(new Date("2026-11-16T10:00:00+01:00"), { ...W, days: null })).toBe(true);
    expect(describeWindow(W)).toBe("du lundi au vendredi, de 9 h à 18 h");
    expect(describeWindow({ ...W, days: [1, 2, 3, 4, 5, 6, 7] })).toBe(
      "tous les jours, de 9 h à 18 h",
    );
    expect(describeWindow({ startHour: 8, endHour: 12, days: [3, 1] })).toBe(
      "le lundi et mercredi, de 8 h à 12 h",
    );
  });
  it("heures de départ probables : un passage sur six minutes, échauffement de cinq par jour", () => {
    const base = { window: W, recent: [], firstSendAt: null, dailyCap: 20, hourlyCap: 10 };
    const iso = (h: string, d = "18") => new Date(`2026-11-${d}T${h}:00+01:00`).toISOString();
    // Mardi 22 h 14 : rien avant mercredi 9 h, puis un message toutes les six minutes.
    const night = planSendTimes(new Date("2026-11-17T22:14:00+01:00"), 7, base);
    expect(night.slice(0, 5).map((d) => d.at!.toISOString())).toEqual(
      ["09:00", "09:06", "09:12", "09:18", "09:24"].map((h) => iso(h)),
    );
    // Le premier attend l'ouverture des horaires ; les suivants partent à la suite, sans raison à donner.
    expect(night[0]!.reason).toEqual({ kind: "horaires" });
    expect(night[1]!.reason).toBeNull();
    // Première semaine : cinq par 24 heures. Le sixième attend la limite, pas les horaires.
    expect(night[5]!.at!.toISOString()).toBe(iso("09:06", "19"));
    expect(night[5]!.reason).toEqual({ kind: "jour", cap: 5 });
    expect(formatSendTime(night[1]!.at!, "Europe/Paris", false)).toBe(
      "mercredi 18 novembre vers 9 h 06",
    );
    // En pleine journée, le prochain passage est le bon.
    const day = planSendTimes(new Date("2026-11-18T10:01:00+01:00"), 1, base);
    expect(day[0]!.at!.toISOString()).toBe(iso("10:06"));
    expect(day[0]!.reason).toBeNull();
    // Plafond horaire atteint : on attend que l'heure glisse.
    const busy = planSendTimes(new Date("2026-11-18T10:01:00+01:00"), 1, {
      ...base,
      hourlyCap: 1,
      firstSendAt: new Date("2026-09-01T09:00:00+02:00"),
      recent: [new Date("2026-11-18T09:54:00+01:00")],
    });
    expect(busy[0]!.at!.toISOString()).toBe(iso("10:54"));
    expect(busy[0]!.reason).toEqual({ kind: "heure", cap: 1 });
    // Fuseau inconnu : aucune estimation, jamais d'heure inventée.
    expect(
      planSendTimes(new Date(), 2, { ...base, window: { ...W, timezone: "Nulle/Part" } }),
    ).toEqual([
      { at: null, reason: null },
      { at: null, reason: null },
    ]);
  });
  it("24 h sur 24, 7 jours sur 7 : tout part au prochain passage, la limite du jour seule retient", () => {
    // Cas réel du 17/11/2026 : horaires 9 h à 23 h, il est 23 h 04 à Paris, un envoi déjà parti.
    const always = {
      timezone: "Europe/Paris",
      startHour: 0,
      endHour: 24,
      days: [1, 2, 3, 4, 5, 6, 7],
    };
    expect(isInSendWindow(new Date("2026-11-17T23:04:00+01:00"), always)).toBe(true);
    expect(isInSendWindow(new Date("2026-11-22T03:00:00+01:00"), always)).toBe(true); // dimanche, 3 h
    expect(describeWindow(always)).toBe("tous les jours, 24 h sur 24");
    expect(describeWindow({ ...always, days: [1, 2, 3, 4, 5] })).toBe(
      "du lundi au vendredi, 24 h sur 24",
    );
    const slots = planSendTimes(new Date("2026-11-17T23:04:00+01:00"), 5, {
      window: always,
      recent: [new Date("2026-11-17T22:54:00+01:00")],
      firstSendAt: new Date("2026-11-17T22:54:00+01:00"),
      dailyCap: 20,
      hourlyCap: 10,
    });
    // Quatre places restent aujourd'hui (5 par 24 h, un déjà parti) : départ immédiat, un par passage.
    expect(slots.slice(0, 4).map((x) => x.at!.toISOString())).toEqual(
      ["23:06", "23:12", "23:18", "23:24"].map((h) =>
        new Date(`2026-11-17T${h}:00+01:00`).toISOString(),
      ),
    );
    expect(slots.slice(0, 4).every((x) => x.reason === null)).toBe(true);
    // Le cinquième attend que le premier envoi ait plus de 24 heures (premier passage ensuite), et le dit.
    expect(slots[4]!.at!.toISOString()).toBe(new Date("2026-11-18T23:00:00+01:00").toISOString());
    expect(slots[4]!.reason).toEqual({ kind: "jour", cap: 5 });
    expect(
      queuedMessageText({ at: slots[4]!.at!, timezone: "Europe/Paris", reason: slots[4]!.reason }),
    ).toBe(
      "Message approuvé. Limite de 5 emails par 24 heures atteinte (rythme progressif des premières semaines, pour ménager votre boîte). Départ prévu mercredi 18 novembre vers 23 h.",
    );
    expect(
      queuedMessageText({
        at: slots[0]!.at!,
        timezone: "Europe/Paris",
        reason: { kind: "horaires" },
      }),
    ).toMatch(/horaires d'envoi sont fermés/);
  });
  it("échauffement 5, 10, 15 par jour puis le plafond de la boîte", () => {
    const now = new Date("2026-12-01T10:00:00Z");
    expect(effectiveDailyCap(20, null, now)).toBe(5);
    expect(effectiveDailyCap(20, addDays(now, -3), now)).toBe(5);
    expect(effectiveDailyCap(20, addDays(now, -8), now)).toBe(10);
    expect(effectiveDailyCap(20, addDays(now, -15), now)).toBe(15);
    expect(effectiveDailyCap(20, addDays(now, -30), now)).toBe(20);
    expect(effectiveDailyCap(3, addDays(now, -30), now)).toBe(3);
  });
});

describe("message sortant", () => {
  const ring = parseKeyRing(`v1:${Buffer.alloc(32, 1).toString("base64")}`);
  it("Message-ID sur le domaine de la boîte, List-Unsubscribe, pied de page, sans mention de l'IA", () => {
    const id = makeMessageId("jo@alice-site.fr");
    expect(id).toMatch(/^<[0-9a-f-]+@alice-site\.fr>$/);
    const m = buildOutgoing({
      fromName: "Jo",
      fromAddress: "jo@alice-site.fr",
      to: "c@cible.fr",
      subject: "Sujet",
      body: "Bonjour,\n\nMessage.\n\nJo",
      messageId: id,
      unsubscribeUrl: "https://app.test/api/unsubscribe?t=x",
    });
    expect(m.headers["List-Unsubscribe"]).toContain("<mailto:jo@alice-site.fr?subject=stop>");
    expect(m.headers["List-Unsubscribe"]).toContain("<https://app.test/api/unsubscribe?t=x>");
    expect(m.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(m.text).toContain("répondez « stop »");
    expect(m.text).not.toMatch(/\bIA\b|intelligence artificielle|automatis/i);
  });
  it("jeton de désinscription signé, altération et mauvaise clé refusées, rotation tolérée", () => {
    const t = makeUnsubscribeToken("abc", "secret");
    expect(verifyUnsubscribeToken(t, "secret")).toBe("abc");
    expect(verifyUnsubscribeToken(t, "autre")).toBeNull();
    expect(verifyUnsubscribeToken(t.replace("abc", "abd"), "secret")).toBeNull();
    expect(verifyUnsubscribeToken("n'importe quoi", "secret")).toBeNull();
    const ring2 = parseKeyRing(
      `v2:${Buffer.alloc(32, 2).toString("base64")},v1:${Buffer.alloc(32, 1).toString("base64")}`,
    );
    const old = makeUnsubscribeToken("id1", Buffer.alloc(32, 1).toString("base64"));
    expect(verifyUnsubscribeTokenWithRing(old, ring2)).toBe("id1");
    expect(verifyUnsubscribeTokenWithRing(old, ring)).toBe("id1");
  });
});

const ring = parseKeyRing(`v1:${Buffer.alloc(32, 1).toString("base64")}`);
const WS = "ws-1";
const MONDAY_10H = new Date("2026-11-16T10:00:00+01:00");

function world(
  opts: {
    drafts?: number;
    batchStatus?: string;
    hourly?: number;
    daily?: number;
    smtpPort?: number;
    site?: Record<string, unknown>;
  } = {},
) {
  const n = opts.drafts ?? 3;
  const enc = encryptSecret("pw-secret", ring);
  const t = {
    // M6.1 : l'envoi réel exige un abonnement actif.
    plans: [{ key: "starter", monthly_send_cap: 150 }],
    subscriptions: [
      {
        workspace_id: WS,
        plan: "starter",
        status: "active",
        current_period_end: "2099-01-01T00:00:00Z",
      },
    ],
    mailboxes: [
      {
        id: "mb1",
        workspace_id: WS,
        site_id: "site1",
        status: "verifiee",
        email: "jo@alice-site.fr",
        from_name: "Jo",
        username: "jo",
        password_enc: enc.value,
        key_version: enc.version,
        smtp_host: "127.0.0.1",
        smtp_port: opts.smtpPort ?? 587,
        timezone: "Europe/Paris",
        send_window_start: 9,
        send_window_end: 18,
        hourly_cap: opts.hourly ?? 10,
        daily_cap: opts.daily ?? 20,
      },
    ],
    mailbox_sites: [{ mailbox_id: "mb1", site_id: "site1", workspace_id: WS }],
    sites: opts.site ? [{ id: "site1", ...opts.site }] : [],
    link_plans: [{ id: "plan1", site_id: "site1" }],
    batches: [
      {
        id: "b1",
        plan_id: "plan1",
        number: 1,
        status: opts.batchStatus ?? "valide",
        validated_at: "2026-11-15T10:00:00Z",
      },
    ],
    batch_items: [] as Record<string, unknown>[],
    target_drafts: [] as Record<string, unknown>[],
    target_contacts: [] as Record<string, unknown>[],
    sent_messages: [] as Record<string, unknown>[],
    suppressions: [] as Record<string, unknown>[],
    events: [] as Record<string, unknown>[],
  };
  for (let i = 1; i <= n; i++) {
    t.batch_items.push({ batch_id: "b1", draft_id: `d${i}`, position: i });
    t.target_drafts.push({
      id: `d${i}`,
      plan_id: "plan1",
      plan_item_id: `pi${i}`,
      workspace_id: WS,
      channel: "email",
      subject: `Sujet ${i}`,
      body: `Bonjour,\n\nCorps ${i}\n\nJo`,
      status: "valide",
    });
    t.target_contacts.push({ plan_item_id: `pi${i}`, email: `c${i}@cible${i}.fr`, sendable: true });
  }
  return fakeSupabase(t);
}

function deps(db: ReturnType<typeof world>, over: Partial<SendDeps> = {}): SendDeps {
  return {
    getServiceClient: () => db.client,
    now: () => MONDAY_10H,
    realSendingAllowed: () => false,
    keyRing: () => ring,
    send: vi.fn(async () => ({ ok: true as const })),
    appUrl: "https://app.test",
    ...over,
  };
}

describe("moteur d'envoi : dry run", () => {
  it("simule un message par passage, dans l'ordre du lot, sans jamais appeler le SMTP", async () => {
    const db = world();
    const d = deps(db);
    const r1 = await runSendTick(d);
    expect(r1[0]).toMatchObject({ result: "simule", draftId: "d1" });
    const r2 = await runSendTick(d);
    expect(r2[0]).toMatchObject({ result: "simule", draftId: "d2" });
    expect(d.send).not.toHaveBeenCalled();
    const rows = db.tables.sent_messages!;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      status: "simule",
      dry_run: true,
      to_email: "c1@cible1.fr",
      step: "initial",
    });
    // Relance prévue à J+10.
    expect(new Date(rows[0]!.follow_up_due_at as string).getTime()).toBe(
      addDays(MONDAY_10H, 10).getTime(),
    );
    expect(db.tables.events!.map((e) => e.type)).toEqual(["send.simulated", "send.simulated"]);
  });

  it("n'envoie jamais un brouillon deux fois (idempotence)", async () => {
    const db = world({ drafts: 1 });
    const d = deps(db);
    await runSendTick(d);
    const again = await runSendTick(d);
    expect(again[0]).toMatchObject({ result: "rien_a_envoyer" });
    expect(db.tables.sent_messages).toHaveLength(1);
  });

  it("brouillon prioritaire : part en premier malgré l'échauffement, une seule fois", async () => {
    const db = world({ drafts: 3 });
    const claimed = new Date(MONDAY_10H.getTime() - 3 * 3_600_000).toISOString();
    for (let i = 0; i < 5; i++) {
      db.tables.sent_messages!.push({
        draft_id: `old${i}`,
        from_email: "jo@alice-site.fr",
        dry_run: true,
        status: "simule",
        step: "initial",
        claimed_at: claimed,
      });
    }
    // Sans priorité : quota d'échauffement (5) atteint.
    expect((await runSendTick(deps(db)))[0]).toMatchObject({ result: "plafond" });
    // Avec priorité : d3 part, pas d1.
    const d = deps(db, { priorityDraftId: "d3" });
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule", draftId: "d3" });
    // Une seule fois : ensuite le quota (6 envois) retient tout.
    expect((await runSendTick(d))[0]).toMatchObject({ result: "plafond" });
  });

  it("brouillon prioritaire : ne dépasse jamais le plafond journalier de la boîte", async () => {
    const db = world({ drafts: 2, daily: 5 });
    const claimed = new Date(MONDAY_10H.getTime() - 3 * 3_600_000).toISOString();
    for (let i = 0; i < 5; i++) {
      db.tables.sent_messages!.push({
        draft_id: `old${i}`,
        from_email: "jo@alice-site.fr",
        dry_run: true,
        status: "simule",
        step: "initial",
        claimed_at: claimed,
      });
    }
    const r = await runSendTick(deps(db, { priorityDraftId: "d2" }));
    expect(r[0]).toMatchObject({ result: "plafond" });
  });

  it("aucun envoi sans lot validé", async () => {
    const db = world({ batchStatus: "brouillon" });
    const r = await runSendTick(deps(db));
    expect(r[0]).toMatchObject({ result: "rien_a_envoyer" });
    expect(db.tables.sent_messages).toHaveLength(0);
  });

  it("aucun envoi hors des heures ouvrées", async () => {
    const db = world();
    const r = await runSendTick(deps(db, { now: () => new Date("2026-11-21T11:00:00+01:00") }));
    expect(r[0]).toMatchObject({ result: "hors_fenetre" });
    expect(db.tables.sent_messages).toHaveLength(0);
  });

  it("adresse en suppression (adresse, domaine, global) : ignorée, jamais envoyée", async () => {
    const db = world({ drafts: 3 });
    db.tables.suppressions!.push(
      { workspace_id: WS, email: "c1@cible1.fr" },
      { workspace_id: null, domain: "cible2.fr" },
    );
    db.tables.target_contacts![2]!.sendable = false;
    const d = deps(db);
    const r = await runSendTick(d);
    expect(r[0]).toMatchObject({ result: "ignore", draftId: "d1" });
    expect(db.tables.sent_messages![0]).toMatchObject({
      status: "ignore",
      skip_reason: "supprime",
    });
    expect((await runSendTick(d))[0]).toMatchObject({ result: "ignore", draftId: "d2" });
    expect((await runSendTick(d))[0]).toMatchObject({ result: "ignore", draftId: "d3" });
    expect(db.tables.sent_messages!.every((m) => m.status === "ignore")).toBe(true);
    expect(db.tables.sent_messages![2]!.skip_reason).toBe("contact_non_envoyable");
  });

  it("plafond horaire : jamais plus de hourly_cap par heure ; l'heure suivante repart", async () => {
    const db = world({ drafts: 5, hourly: 2 });
    let now = MONDAY_10H;
    const d = deps(db, { now: () => now });
    await runSendTick(d);
    await runSendTick(d);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "plafond" });
    expect(db.tables.sent_messages).toHaveLength(2);
    now = new Date(MONDAY_10H.getTime() + 61 * 60_000);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule", draftId: "d3" });
  });

  it("échauffement : 5 par jour au départ même si la boîte autorise 20", async () => {
    const db = world({ drafts: 8, hourly: 10, daily: 20 });
    let now = MONDAY_10H;
    const d = deps(db, { now: () => now });
    for (let i = 0; i < 5; i++) {
      now = new Date(MONDAY_10H.getTime() + i * 70 * 60_000);
      expect((await runSendTick(d))[0]).toMatchObject({ result: "simule" });
    }
    now = new Date(MONDAY_10H.getTime() + 6 * 70 * 60_000 - 20 * 60_000);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "plafond" });
  });
});

describe("moteur d'envoi : plafonds et relances par adresse d'envoi", () => {
  /** Envois d'une boîte supprimée : détachés (mailbox_id vide), mais toujours rangés sous l'adresse. */
  const detached = (n: number, minutesAgo: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `old${i}`,
      mailbox_id: null,
      from_email: "jo@alice-site.fr",
      dry_run: true,
      status: "simule",
      claimed_at: new Date(MONDAY_10H.getTime() - (minutesAgo + i) * 60_000).toISOString(),
    }));

  it("supprimer puis recréer la boîte ne remet pas le plafond horaire à zéro", async () => {
    const db = world({ drafts: 3, hourly: 2 });
    db.tables.sent_messages!.push(...detached(2, 20));
    expect((await runSendTick(deps(db)))[0]).toMatchObject({ result: "plafond" });
    expect(db.tables.sent_messages).toHaveLength(2);
  });

  it("ni l'échauffement : cinq envois déjà comptés pour l'adresse, le sixième attend", async () => {
    const db = world({ drafts: 3, hourly: 10, daily: 20 });
    db.tables.sent_messages!.push(...detached(5, 90));
    expect((await runSendTick(deps(db)))[0]).toMatchObject({ result: "plafond" });
  });

  it("l'historique d'une autre adresse ne compte pas", async () => {
    const db = world({ drafts: 3, hourly: 2 });
    db.tables.sent_messages!.push(
      ...detached(2, 20).map((r) => ({ ...r, from_email: "autre@autre-site.fr" })),
    );
    expect((await runSendTick(deps(db)))[0]).toMatchObject({ result: "simule", draftId: "d1" });
  });

  it("la relance d'un message parti d'une boîte supprimée part quand même, depuis la nouvelle boîte", async () => {
    const db = world({ drafts: 1 });
    const d = deps(db);
    await runSendTick(d);
    // La boîte d'origine est supprimée : l'envoi garde son adresse mais perd sa boîte.
    db.tables.sent_messages![0]!.mailbox_id = null;
    d.now = () => addDays(MONDAY_10H, 10);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule", draftId: "d1" });
    expect(db.tables.sent_messages![1]).toMatchObject({
      step: "relance",
      mailbox_id: "mb1",
      from_email: "jo@alice-site.fr",
    });
  });

  it("chaque envoi enregistre l'adresse d'envoi", async () => {
    const db = world({ drafts: 1 });
    await runSendTick(deps(db));
    expect(db.tables.sent_messages![0]).toMatchObject({ from_email: "jo@alice-site.fr" });
  });
});

describe("moteur d'envoi : mode réel contre un faux serveur SMTP local", () => {
  const received: string[] = [];
  let server: SMTPServer;
  let port: number;
  let mode: "ok" | "tempfail" | "authfail" = "ok";
  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: false,
      allowInsecureAuth: true,
      disabledCommands: ["STARTTLS"],
      onAuth(auth, _s, cb) {
        if (mode === "authfail" || auth.password !== "pw-secret")
          return cb(new Error("535 refused"));
        cb(null, { user: auth.username });
      },
      onData(stream, _s, cb) {
        if (mode === "tempfail") {
          stream.resume();
          stream.on("end", () =>
            cb(Object.assign(new Error("451 try later"), { responseCode: 451 })),
          );
          return;
        }
        let raw = "";
        stream.on("data", (c) => (raw += c));
        stream.on("end", () => {
          received.push(raw);
          cb();
        });
      },
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.server.address() as { port: number }).port;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  const real = (db: ReturnType<typeof world>, now = () => MONDAY_10H) =>
    deps(db, {
      realSendingAllowed: () => true,
      send: (ep, c, m, o) =>
        sendOutreachMail(ep, c, m, {
          ...o,
          allowPrivate: true,
          plaintextForTests: true,
          timeoutMs: 3000,
        }),
      now,
    });

  it("envoie vraiment (au faux serveur) avec les bons en-têtes, puis marque « envoye »", async () => {
    mode = "ok";
    const db = world({ drafts: 1, smtpPort: port });
    const r = await runSendTick(real(db));
    expect(r[0]).toMatchObject({ result: "envoye" });
    expect(received).toHaveLength(1);
    const mail = await simpleParser(received[0]!);
    expect([mail.to].flat()[0]?.text).toBe("c1@cible1.fr");
    expect(mail.subject).toBe("Sujet 1");
    expect(mail.messageId).toMatch(/@alice-site\.fr>$/);
    expect(received[0]!.replace(/\r\n\s+/g, "")).toContain("https://app.test/api/unsubscribe?t=");
    expect(mail.text).toContain("répondez « stop »");
    const row = db.tables.sent_messages![0]!;
    expect(row).toMatchObject({ status: "envoye", dry_run: false, attempts: 1 });
    expect(JSON.stringify(db.tables)).not.toContain("pw-secret");
  });

  it("signature du site : remplace le prénom final ; avec un logo, le message part aussi en HTML", async () => {
    mode = "ok";
    const token = "ab".repeat(16);
    const db = world({
      drafts: 1,
      smtpPort: port,
      site: {
        domain: "alice-site.fr",
        founder_role: "fondateur",
        signature_first_name: "Jo",
        signature_last_name: "Martin",
        signature_show_site: true,
        signature_linkedin_url: null,
        signature_phone: null,
        signature_logo_token: token,
      },
    });
    const r = await runSendTick(real(db));
    expect(r[0]).toMatchObject({ result: "envoye" });
    const mail = await simpleParser(received[received.length - 1]!);
    const signed = "Corps 1\n\nJo Martin\nFondateur de alice-site.fr\nhttps://alice-site.fr";
    expect(mail.text).toContain(signed);
    expect(mail.text).toContain("répondez « stop »");
    expect(mail.html).toContain(`<img src="https://app.test/api/logo/${token}"`);
    expect(mail.html).toContain("<strong>Jo Martin</strong>");
    // Le texte enregistré est celui qui est parti.
    expect(db.tables.sent_messages![0]!.body).toContain(signed);
  });

  it("sans logo, le message signé reste en texte seul", async () => {
    mode = "ok";
    const db = world({
      drafts: 1,
      smtpPort: port,
      site: {
        domain: "alice-site.fr",
        founder_role: null,
        signature_first_name: "Jo",
        signature_last_name: null,
        signature_show_site: true,
        signature_linkedin_url: null,
        signature_phone: null,
        signature_logo_token: null,
      },
    });
    await runSendTick(real(db));
    const mail = await simpleParser(received[received.length - 1]!);
    expect(mail.text).toContain("Corps 1\n\nJo\nhttps://alice-site.fr");
    expect(mail.html).toBe(false);
  });

  it("échec temporaire : réessayé après le délai, puis envoyé ; jamais avant", async () => {
    mode = "tempfail";
    const db = world({ drafts: 1, smtpPort: port });
    let now = MONDAY_10H;
    const d = real(db, () => now);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "a_reessayer" });
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    mode = "ok";
    now = new Date(MONDAY_10H.getTime() + 31 * 60_000);
    const before = received.length;
    expect((await runSendTick(d))[0]).toMatchObject({ result: "envoye" });
    expect(received.length).toBe(before + 1);
    expect(db.tables.sent_messages).toHaveLength(1);
    expect(db.tables.sent_messages![0]).toMatchObject({ status: "envoye", attempts: 2 });
  });

  it("identifiants refusés : échec définitif et boîte mise en erreur (plus aucun envoi)", async () => {
    mode = "authfail";
    const db = world({ drafts: 2, smtpPort: port });
    const d = real(db);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "echec" });
    expect(db.tables.mailboxes![0]!.status).toBe("erreur");
    expect(await runSendTick(d)).toEqual([]);
  });

  it("clé de chiffrement absente : rien ne part, nouvel essai plus tard", async () => {
    mode = "ok";
    const db = world({ drafts: 1, smtpPort: port });
    const d = real(db);
    d.keyRing = () => {
      throw new Error("clé manquante");
    };
    const before = received.length;
    expect((await runSendTick(d))[0]).toMatchObject({ result: "a_reessayer" });
    expect(received.length).toBe(before);
  });

  it("relance réelle à J+10 : même fil (In-Reply-To / References), même adresse, texte court sans IA", async () => {
    mode = "ok";
    const db = world({ drafts: 1, smtpPort: port });
    let now = MONDAY_10H;
    const d = real(db, () => now);
    const before = received.length;
    expect((await runSendTick(d))[0]).toMatchObject({ result: "envoye" });
    const initial = db.tables.sent_messages![0]!;
    now = addDays(MONDAY_10H, 9);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    now = addDays(MONDAY_10H, 10);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "envoye", draftId: "d1" });
    expect(received.length).toBe(before + 2);
    const mail = await simpleParser(received.at(-1)!);
    expect([mail.to].flat()[0]?.text).toBe("c1@cible1.fr");
    expect(mail.subject).toBe("Re: Sujet 1");
    expect(mail.inReplyTo).toBe(initial.message_id);
    expect(mail.references).toContain(initial.message_id as string);
    expect(mail.messageId).not.toBe(initial.message_id);
    expect(mail.text).toContain("Corps 1");
    expect(mail.text).not.toMatch(/\bIA\b|intelligence artificielle|automatis/i);
    const rows = db.tables.sent_messages!;
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ step: "relance", status: "envoye", dry_run: false });
    expect(rows[1]!.follow_up_due_at ?? null).toBeNull();
    // Une seule relance, jamais deux.
    now = addDays(MONDAY_10H, 21);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    expect(received.length).toBe(before + 2);
  });
});

describe("relance unique : dry run", () => {
  const J10 = addDays(MONDAY_10H, 10);

  async function sentOnce(drafts = 1) {
    const db = world({ drafts });
    const d = deps(db);
    await runSendTick(d);
    return { db, d };
  }
  const signal = (db: ReturnType<typeof world>, kind: SignalKind) =>
    (db.tables.reply_signals ??= []).push({
      sent_message_id: db.tables.sent_messages![0]!.id,
      kind,
    });

  it("simule la relance à J+10 (pas avant), dans le même fil, une seule fois", async () => {
    const { db, d } = await sentOnce();
    d.now = () => addDays(MONDAY_10H, 9);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    d.now = () => J10;
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule", draftId: "d1" });
    const [initial, relance] = db.tables.sent_messages!;
    expect(relance).toMatchObject({
      step: "relance",
      status: "simule",
      dry_run: true,
      to_email: "c1@cible1.fr",
      subject: "Re: Sujet 1",
      in_reply_to: initial!.message_id,
    });
    expect(relance!.message_id).not.toBe(initial!.message_id);
    expect(relance!.follow_up_due_at ?? null).toBeNull();
    expect(d.send).not.toHaveBeenCalled();
    d.now = () => addDays(MONDAY_10H, 30);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    expect(db.tables.sent_messages).toHaveLength(2);
  });

  it("M5.1 : une réponse automatique d'absence repousse la relance, puis elle repart", async () => {
    const { db, d } = await sentOnce();
    const initialId = db.tables.sent_messages![0]!.id as string;
    // Réponse automatique reçue mais pas encore classée : on attend, on ne relance pas.
    (db.tables.inbound_messages ??= []).push({
      id: "in1",
      sent_message_id: initialId,
      kind: "reponse_automatique",
      classified_at: null,
    });
    d.now = () => J10;
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    // Classée : relance repoussée de 7 jours.
    db.tables.inbound_messages![0]!.classified_at = J10.toISOString();
    (db.tables.reply_classifications ??= []).push({
      sent_message_id: initialId,
      follow_up_not_before: addDays(J10, 7).toISOString(),
    });
    d.now = () => addDays(J10, 6);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    expect(db.tables.sent_messages).toHaveLength(1);
    d.now = () => addDays(J10, 8);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule", draftId: "d1" });
    expect(db.tables.sent_messages).toHaveLength(2);
  });

  it("la relance due passe avant un nouvel envoi", async () => {
    const { db, d } = await sentOnce(2);
    d.now = () => J10;
    const r = (await runSendTick(d))[0];
    expect(r).toMatchObject({ result: "simule", draftId: "d1" });
    expect(db.tables.sent_messages!.map((m) => `${m.draft_id}:${m.step}`)).toEqual([
      "d1:initial",
      "d1:relance",
    ]);
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule", draftId: "d2" });
  });

  it.each(["reponse", "desinscription", "rebond"] as const)(
    "un signal « %s » annule la relance : rien n'est envoyé, motif enregistré, jamais retentée",
    async (kind) => {
      const { db, d } = await sentOnce();
      signal(db, kind);
      d.now = () => J10;
      expect((await runSendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
      const relance = db.tables.sent_messages![1]!;
      expect(relance).toMatchObject({
        step: "relance",
        status: "ignore",
        skip_reason: {
          reponse: "reponse_recue",
          desinscription: "desinscription",
          rebond: "rebond",
        }[kind],
      });
      expect(db.tables.events!.map((e) => e.type)).toContain("send.followup_cancelled");
      d.now = () => addDays(MONDAY_10H, 40);
      await runSendTick(d);
      expect(db.tables.sent_messages).toHaveLength(2);
      expect(d.send).not.toHaveBeenCalled();
    },
  );

  it("adresse passée en suppression entre-temps : relance ignorée", async () => {
    const { db, d } = await sentOnce();
    db.tables.suppressions!.push({ workspace_id: WS, email: "c1@cible1.fr", domain: null });
    d.now = () => J10;
    await runSendTick(d);
    expect(db.tables.sent_messages![1]).toMatchObject({
      status: "ignore",
      skip_reason: "supprime",
    });
  });

  it("les relances respectent la fenêtre d'envoi (week-end : attendre lundi)", async () => {
    const { db, d } = await sentOnce();
    d.now = () => new Date("2026-11-28T11:00:00+01:00"); // samedi, J+12
    expect((await runSendTick(d))[0]).toMatchObject({ result: "hors_fenetre" });
    d.now = () => new Date("2026-11-30T10:00:00+01:00");
    expect((await runSendTick(d))[0]).toMatchObject({ result: "simule" });
    expect(db.tables.sent_messages).toHaveLength(2);
  });
});

describe("machine à états de la relance", () => {
  const now = new Date("2026-12-01T10:00:00Z");
  const initial = {
    status: "envoye",
    sent_at: "2026-11-16T09:00:00Z",
    follow_up_due_at: "2026-11-26T09:00:00Z",
  };
  it("Envoyé J0 → relance due → Relancé → Terminé sans réponse", () => {
    const early = new Date("2026-11-20T10:00:00Z");
    expect(followUpState(initial, null, [], early)).toBe("envoye_j0");
    expect(followUpState(initial, null, [], now)).toBe("relance_due");
    const relance = { status: "envoye", sent_at: "2026-11-30T09:00:00Z" };
    expect(followUpState(initial, relance, [], now)).toBe("relancé");
    expect(followUpState(initial, relance, [], addDays(now, 7))).toBe("termine_sans_reponse");
    expect(followUpState(initial, { status: "a_reessayer" }, [], now)).toBe("relance_a_reessayer");
    expect(followUpState(initial, { status: "ignore" }, [], now)).toBe("annulee_autre");
  });
  it("un signal annule, quelle que soit l'étape ; la réponse prime", () => {
    expect(followUpState(initial, null, ["rebond"], now)).toBe("annulee_rebond");
    expect(followUpState(initial, null, ["desinscription", "rebond"], now)).toBe(
      "annulee_desinscription",
    );
    expect(followUpState(initial, null, ["rebond", "reponse"], now)).toBe("annulee_reponse");
    expect(followUpState({ status: "en_cours" }, null, [], now)).toBe("sans_relance");
    expect(followUpState(null, null, [], now)).toBe("sans_relance");
  });
  it("le texte de relance cite le message d'origine, reste court et ne mentionne pas l'IA", () => {
    const m = buildFollowUp({
      fromName: "Jo",
      subject: "Re: Sujet",
      body: "Bonjour,\n\nCorps\n\nJo",
      sentAt: new Date("2026-11-16T09:00:00Z"),
    });
    expect(m.subject).toBe("Re: Sujet");
    expect(m.body).toContain("> Corps");
    expect(m.body).toContain("16 novembre 2026");
    expect(m.body.split("\n> ")[0]!.length).toBeLessThan(500);
    expect(m.body).not.toMatch(/\bIA\b|intelligence artificielle|automatis/i);
  });
});

describe("moteur d'envoi : plan d'abonnement (M6.1)", () => {
  const realDeps = (db: ReturnType<typeof world>): SendDeps => ({
    getServiceClient: () => db.client,
    now: () => new Date("2026-11-16T10:00:00+01:00"),
    realSendingAllowed: () => true,
    keyRing: () => parseKeyRing(`v1:${Buffer.alloc(32, 1).toString("base64")}`),
    send: vi.fn() as unknown as SendDeps["send"],
    appUrl: "https://app.test",
  });
  it("sans abonnement actif, aucun envoi réel (le transport n'est jamais appelé)", async () => {
    const db = world({ drafts: 2 });
    db.tables.subscriptions!.length = 0;
    const deps = realDeps(db);
    const out = await runSendTick(deps);
    expect(out[0]).toMatchObject({ result: "abonnement_requis" });
    expect(deps.send).not.toHaveBeenCalled();
    expect(db.tables.sent_messages).toHaveLength(0);
  });
  it("plafond mensuel atteint : plus d'envoi réel", async () => {
    const db = world({ drafts: 2 });
    db.tables.plans![0]!.monthly_send_cap = 1;
    db.tables.sent_messages!.push({
      workspace_id: WS,
      dry_run: false,
      status: "envoye",
      claimed_at: "2026-11-02T10:00:00Z",
      mailbox_id: "mb1",
    });
    const deps = realDeps(db);
    const out = await runSendTick(deps);
    expect(out[0]).toMatchObject({ result: "quota_mensuel" });
    expect(deps.send).not.toHaveBeenCalled();
  });
});
