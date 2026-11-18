import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { encryptSecret, parseKeyRing } from "@/features/mailboxes/crypto";
import { sendOutreachMail } from "@/features/mailboxes/transport";
import { runSendTick, type SendDeps } from "@/features/sending/service";
import { runReplySendTick } from "./send";

const ring = parseKeyRing(`v1:${Buffer.alloc(32, 1).toString("base64")}`);
const WS = "ws-1";
const MONDAY_10H = new Date("2026-11-16T10:00:00+01:00");

function world(
  opts: {
    status?: string;
    category?: string;
    validatedCategory?: string | null;
    hourly?: number;
    smtpPort?: number;
    fromEmail?: string | null;
    kind?: string;
  } = {},
) {
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
        daily_cap: 20,
      },
    ],
    sent_messages: [
      {
        id: "s1",
        mailbox_id: "mb1",
        from_email: "jo@alice-site.fr",
        subject: "Une idée de lien",
        message_id: "<orig@alice-site.fr>",
        status: "simule",
        dry_run: true,
        claimed_at: "2026-11-10T10:00:00Z",
      },
    ] as Record<string, unknown>[],
    inbound_messages: [
      {
        id: "in1",
        mailbox_id: "mb1",
        sent_message_id: "s1",
        message_id: "<reply1@cible.fr>",
        from_email: opts.fromEmail === undefined ? "Contact@Cible.fr" : opts.fromEmail,
        subject: "Re: Une idée de lien",
        kind: opts.kind ?? "reponse",
      },
    ],
    reply_classifications: [
      {
        id: "c1",
        inbound_message_id: "in1",
        category: opts.category ?? "question",
        validated_category: opts.validatedCategory ?? null,
      },
    ],
    reply_drafts: [
      {
        id: "rd1",
        workspace_id: WS,
        inbound_message_id: "in1",
        sent_message_id: "s1",
        subject: null,
        body: "Bonjour,\n\nVoici la précision demandée.\n\nJo",
        status: opts.status ?? "validee",
        validated_at: "2026-11-16T09:00:00Z",
      },
    ],
    reply_sends: [] as Record<string, unknown>[],
    suppressions: [] as Record<string, unknown>[],
    events: [] as Record<string, unknown>[],
  };
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

describe("envoi des réponses : dry run", () => {
  it("simule la réponse validée, sans jamais appeler le SMTP, vers l'expéditeur seulement", async () => {
    const db = world();
    const d = deps(db);
    const r = await runReplySendTick(d);
    expect(r[0]).toMatchObject({ result: "simule", replyDraftId: "rd1" });
    expect(d.send).not.toHaveBeenCalled();
    expect(db.tables.reply_sends).toHaveLength(1);
    expect(db.tables.reply_sends![0]).toMatchObject({
      status: "simule",
      dry_run: true,
      to_email: "contact@cible.fr",
      in_reply_to: "<reply1@cible.fr>",
      subject: "Re: Une idée de lien",
    });
    expect(db.tables.events!.map((e) => e.type)).toEqual(["reply.simulated"]);
  });

  it("n'envoie jamais un brouillon non validé ou rejeté", async () => {
    for (const status of ["brouillon", "rejetee"]) {
      const db = world({ status });
      const r = await runReplySendTick(deps(db));
      expect(r[0]).toMatchObject({ result: "rien_a_envoyer" });
      expect(db.tables.reply_sends).toHaveLength(0);
    }
  });

  it("idempotent : une seule réponse par brouillon", async () => {
    const db = world();
    const d = deps(db);
    await runReplySendTick(d);
    expect((await runReplySendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    expect(db.tables.reply_sends).toHaveLength(1);
  });

  it("adresse supprimée, catégorie à risque corrigée, destinataire inconnu : ignorée", async () => {
    const a = world();
    a.tables.suppressions!.push({ workspace_id: WS, email: "contact@cible.fr" });
    expect((await runReplySendTick(deps(a)))[0]).toMatchObject({ result: "ignore" });
    expect(a.tables.reply_sends![0]).toMatchObject({ status: "ignore", skip_reason: "supprime" });

    const b = world({ category: "question", validatedCategory: "desinscription" });
    expect((await runReplySendTick(deps(b)))[0]).toMatchObject({ result: "ignore" });
    expect(b.tables.reply_sends![0]).toMatchObject({ skip_reason: "categorie_a_risque" });

    const c = world({ fromEmail: null });
    expect((await runReplySendTick(deps(c)))[0]).toMatchObject({ result: "ignore" });
    expect(c.tables.reply_sends![0]).toMatchObject({ skip_reason: "destinataire_inconnu" });

    const e = world({ kind: "reponse_automatique" });
    expect((await runReplySendTick(deps(e)))[0]).toMatchObject({ result: "ignore" });
  });

  it("hors des heures ouvrées : rien ne part", async () => {
    const db = world();
    const r = await runReplySendTick(
      deps(db, { now: () => new Date("2026-11-21T11:00:00+01:00") }),
    );
    expect(r[0]).toMatchObject({ result: "hors_fenetre" });
    expect(db.tables.reply_sends).toHaveLength(0);
  });

  it("plafond horaire partagé avec l'outreach : la réponse attend, et l'outreach compte les réponses", async () => {
    const db = world({ hourly: 1 });
    db.tables.sent_messages!.push({
      id: "s9",
      mailbox_id: "mb1",
      from_email: "jo@alice-site.fr",
      status: "simule",
      dry_run: true,
      claimed_at: new Date(MONDAY_10H.getTime() - 10 * 60_000).toISOString(),
    });
    expect((await runReplySendTick(deps(db)))[0]).toMatchObject({ result: "plafond" });
    expect(db.tables.reply_sends).toHaveLength(0);

    const db2 = world({ hourly: 1 });
    await runReplySendTick(deps(db2));
    expect(db2.tables.reply_sends).toHaveLength(1);
    // Le moteur d'outreach voit le quota consommé par la réponse.
    db2.tables.mailboxes![0]!.site_id = "site1";
    expect((await runSendTick(deps(db2)))[0]).toMatchObject({ result: "plafond" });
  });
});

describe("envoi des réponses : mode réel contre un faux serveur SMTP local", () => {
  const received: string[] = [];
  let server: SMTPServer;
  let port: number;
  let mode: "ok" | "tempfail" = "ok";
  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: false,
      allowInsecureAuth: true,
      disabledCommands: ["STARTTLS"],
      onAuth(auth, _s, cb) {
        if (auth.password !== "pw-secret") return cb(new Error("535 refused"));
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

  it("envoie dans le fil (In-Reply-To), avec désinscription, puis marque « envoye »", async () => {
    mode = "ok";
    const db = world({ smtpPort: port });
    const r = await runReplySendTick(real(db));
    expect(r[0]).toMatchObject({ result: "envoye" });
    expect(received).toHaveLength(1);
    const mail = await simpleParser(received[0]!);
    expect([mail.to].flat()[0]?.text).toBe("contact@cible.fr");
    expect(mail.subject).toBe("Re: Une idée de lien");
    expect(mail.inReplyTo).toBe("<reply1@cible.fr>");
    expect(mail.text).toContain("Voici la précision demandée");
    expect(mail.text).not.toMatch(/\bIA\b|intelligence artificielle/i);
    expect(received[0]!.replace(/\r\n\s+/g, "")).toContain(
      "https://app.test/api/unsubscribe?t=s1.",
    );
    expect(db.tables.reply_sends![0]).toMatchObject({
      status: "envoye",
      dry_run: false,
      attempts: 1,
    });
    expect(JSON.stringify(db.tables)).not.toContain("pw-secret");
  });

  it("échec temporaire : réessayé après le délai seulement", async () => {
    mode = "tempfail";
    const db = world({ smtpPort: port });
    let now = MONDAY_10H;
    const d = real(db, () => now);
    expect((await runReplySendTick(d))[0]).toMatchObject({ result: "a_reessayer" });
    expect((await runReplySendTick(d))[0]).toMatchObject({ result: "rien_a_envoyer" });
    mode = "ok";
    now = new Date(MONDAY_10H.getTime() + 31 * 60_000);
    const before = received.length;
    expect((await runReplySendTick(d))[0]).toMatchObject({ result: "envoye" });
    expect(received.length).toBe(before + 1);
    expect(db.tables.reply_sends).toHaveLength(1);
    expect(db.tables.reply_sends![0]).toMatchObject({ status: "envoye", attempts: 2 });
  });

  it("jamais d'envoi réel tant que la garde est fermée, même avec un SMTP joignable", async () => {
    const db = world({ smtpPort: port });
    const before = received.length;
    await runReplySendTick(deps(db, { send: real(db).send }));
    expect(received.length).toBe(before);
    expect(db.tables.reply_sends![0]).toMatchObject({ status: "simule", dry_run: true });
  });
});
