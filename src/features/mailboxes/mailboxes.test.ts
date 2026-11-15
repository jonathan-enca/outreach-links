import net from "node:net";
import { SMTPServer } from "smtp-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, needsRotation, parseKeyRing } from "./crypto";
import { checkDomainHealth } from "./health";
import { healthWarnings } from "./health-warnings";
import { resolveSafeHost, UnsafeHostError } from "./network";
import { mailboxSchema } from "./schema";
import { healthText } from "./mailbox-section";
import { sendSmtp, verifyImap, verifySmtp } from "./transport";

const K1 = Buffer.alloc(32, 1).toString("base64");
const K2 = Buffer.alloc(32, 2).toString("base64");
const opts = { allowPrivate: true, plaintextForTests: true, timeoutMs: 3000 };

describe("chiffrement des identifiants", () => {
  const ring = parseKeyRing(`v1:${K1}`);
  it("aller-retour, valeur illisible, IV différent à chaque fois", () => {
    const a = encryptSecret("mot-de-passe-secret", ring);
    const b = encryptSecret("mot-de-passe-secret", ring);
    expect(a.value).not.toContain("mot-de-passe-secret");
    expect(a.value).not.toBe(b.value);
    expect(decryptSecret(a.value, ring)).toBe("mot-de-passe-secret");
  });
  it("rotation : l'ancienne clé déchiffre encore, la nouvelle chiffre", () => {
    const old = encryptSecret("x", ring);
    const rotated = parseKeyRing(`v2:${K2},v1:${K1}`);
    expect(decryptSecret(old.value, rotated)).toBe("x");
    expect(needsRotation(old.version, rotated)).toBe(true);
    expect(encryptSecret("x", rotated).version).toBe("v2");
  });
  it("refuse une valeur altérée, une clé inconnue ou mal formée", () => {
    const enc = encryptSecret("x", ring).value;
    const [v, iv, tag, ct] = enc.split(".");
    const tampered = [v, iv, tag, Buffer.from("zz").toString("base64url") + ct].join(".");
    expect(() => decryptSecret(tampered, ring)).toThrow();
    expect(() => decryptSecret(enc, parseKeyRing(`v9:${K2}`))).toThrow();
    expect(() => parseKeyRing(undefined)).toThrow();
    expect(() => parseKeyRing("v1:court")).toThrow();
    expect(() => parseKeyRing(`v1:${K1},v1:${K2}`)).toThrow();
  });
});

describe("formulaire", () => {
  const ok = {
    email: " Jo@Alice-Site.fr ",
    fromName: "Jo",
    username: "jo",
    password: "pw",
    smtpHost: "SMTP.alice-site.fr",
    smtpPort: "587",
    imapHost: "imap.alice-site.fr",
    imapPort: "993",
  };
  it("normalise et accepte", () => {
    const r = mailboxSchema.parse(ok);
    expect(r.email).toBe("jo@alice-site.fr");
    expect(r.smtpHost).toBe("smtp.alice-site.fr");
  });
  it("refuse un port hors liste et un hôte invalide", () => {
    expect(mailboxSchema.safeParse({ ...ok, smtpPort: "22" }).success).toBe(false);
    expect(mailboxSchema.safeParse({ ...ok, imapPort: "80" }).success).toBe(false);
    expect(mailboxSchema.safeParse({ ...ok, smtpHost: "a b;rm" }).success).toBe(false);
  });
});

describe("anti-SSRF", () => {
  it("refuse une adresse non publique", async () => {
    await expect(resolveSafeHost("localhost")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(resolveSafeHost("127.0.0.1")).rejects.toBeInstanceOf(UnsafeHostError);
    await expect(resolveSafeHost("127.0.0.1", true)).resolves.toBe("127.0.0.1");
  });
  it("verifySmtp renvoie une erreur sans toucher le réseau interne", async () => {
    const r = await verifySmtp(
      { host: "127.0.0.1", port: 587 },
      { username: "u", password: "pw-long" },
    );
    expect(r).toEqual({ ok: false, error: "adresse non publique refusée" });
  });
});

describe("santé du domaine", () => {
  it("détecte SPF, DMARC, DKIM et signale les absents", async () => {
    const dns = async (n: string) =>
      ({
        "a.fr": ["v=spf1 include:x ~all"],
        "_dmarc.a.fr": ["v=DMARC1; p=none"],
      })[n] ?? [];
    const h = await checkDomainHealth("jo@a.fr", dns, () => new Date(0));
    expect(h).toMatchObject({ domain: "a.fr", spf: true, dmarc: true, dkim: false });
    expect(healthWarnings(h)).toEqual(["dkim"]);
    expect(healthText(h)).toMatch(/DKIM/);
    const dkim = await checkDomainHealth("jo@a.fr", async (n) =>
      n === "google._domainkey.a.fr" ? ["v=DKIM1; k=rsa; p=AAA"] : [],
    );
    expect(dkim.dkim).toBe(true);
  });
});

/** Faux serveur IMAP minimal : salutation, CAPABILITY, LOGIN, LOGOUT. */
function fakeImap(user: string, pass: string) {
  const server = net.createServer((sock) => {
    sock.write("* OK fake imap ready\r\n");
    let buf = "";
    sock.on("data", (d) => {
      buf += d.toString();
      let i: number;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const [tag, cmd, ...args] = line.split(" ");
        if (cmd === "CAPABILITY") sock.write(`* CAPABILITY IMAP4rev1\r\n${tag} OK done\r\n`);
        else if (cmd === "LOGIN") {
          const [u, p] = args.map((a) => a.replace(/^"|"$/g, ""));
          sock.write(
            u === user && p === pass ? `${tag} OK logged in\r\n` : `${tag} NO bad login\r\n`,
          );
        } else if (cmd === "LOGOUT") {
          sock.write(`* BYE\r\n${tag} OK bye\r\n`);
          sock.end();
        } else sock.write(`${tag} OK\r\n`);
      }
    });
  });
  return server;
}

describe("connexion contre faux serveurs locaux (aucun envoi réel)", () => {
  const received: string[] = [];
  let smtp: SMTPServer;
  let smtpPort = 0;
  let imap: net.Server;
  let imapPort = 0;

  beforeAll(async () => {
    smtp = new SMTPServer({
      authOptional: false,
      allowInsecureAuth: true,
      disabledCommands: ["STARTTLS"],
      onAuth(auth, _s, cb) {
        if (auth.username === "jo" && auth.password === "bon") cb(null, { user: "jo" });
        else cb(new Error("Invalid login"));
      },
      onData(stream, _s, cb) {
        let d = "";
        stream.on("data", (c) => (d += c));
        stream.on("end", () => {
          received.push(d);
          cb();
        });
      },
    });
    await new Promise<void>((r) => smtp.listen(0, "127.0.0.1", r));
    smtpPort = (smtp.server.address() as net.AddressInfo).port;
    imap = fakeImap("jo", "bon");
    await new Promise<void>((r) => imap.listen(0, "127.0.0.1", r));
    imapPort = (imap.address() as net.AddressInfo).port;
  });
  afterAll(async () => {
    await new Promise((r) => smtp.close(() => r(null)));
    await new Promise((r) => imap.close(() => r(null)));
  });

  const good = { username: "jo", password: "bon" };
  const bad = { username: "jo", password: "mauvais-secret" };

  it("SMTP : bon mot de passe accepté, aucun message envoyé par le test", async () => {
    expect(await verifySmtp({ host: "127.0.0.1", port: smtpPort }, good, opts)).toEqual({
      ok: true,
    });
    expect(received).toHaveLength(0);
  });
  it("SMTP : mauvais mot de passe refusé, secret absent du message d'erreur", async () => {
    const r = await verifySmtp({ host: "127.0.0.1", port: smtpPort }, bad, opts);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("mauvais-secret");
  });
  it("IMAP : bon et mauvais identifiants", async () => {
    expect(await verifyImap({ host: "127.0.0.1", port: imapPort }, good, opts)).toEqual({
      ok: true,
    });
    const r = await verifyImap({ host: "127.0.0.1", port: imapPort }, bad, opts);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("mauvais-secret");
  });
  it("sendSmtp arrive sur le faux serveur local seulement", async () => {
    const r = await sendSmtp(
      { host: "127.0.0.1", port: smtpPort },
      good,
      {
        from: { name: "Jo", address: "jo@alice-site.fr" },
        to: "jo@alice-site.fr",
        subject: "Test",
        text: "Salut",
      },
      opts,
    );
    expect(r.ok).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]).toContain("Subject: Test");
  });
});
