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
import { addDays, effectiveDailyCap, isInSendWindow } from "./schedule";
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
  } = {},
) {
  const n = opts.drafts ?? 3;
  const enc = encryptSecret("pw-secret", ring);
  const t = {
    mailboxes: [
      {
        id: "mb1",
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
});
