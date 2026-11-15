import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { resolveSafeHost } from "./network";
import { isImplicitTls } from "./schema";

export interface Credentials {
  username: string;
  password: string;
}
export interface Endpoint {
  host: string;
  port: number;
}
export interface TransportOptions {
  /** Tests seulement : autorise un faux serveur sur 127.0.0.1. */
  allowPrivate?: boolean;
  /** Tests seulement : accepte le certificat auto-signé du faux serveur. */
  insecureTlsForTests?: boolean;
  /** Tests seulement : faux serveur sans TLS (jamais utilisé en production). */
  plaintextForTests?: boolean;
  timeoutMs?: number;
}
export type TestResult = { ok: true } | { ok: false; error: string };

/** Message d'erreur sans identifiants : on ne journalise jamais le mot de passe. */
function safeError(e: unknown, secret: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  return (secret.length >= 4 ? raw.split(secret).join("***") : raw).slice(0, 300);
}

/**
 * Vérifie la connexion et l'authentification SMTP. N'envoie AUCUN message
 * (poignée de main EHLO + AUTH seulement).
 */
export async function verifySmtp(
  ep: Endpoint,
  cred: Credentials,
  opts: TransportOptions = {},
): Promise<TestResult> {
  try {
    const ip = await resolveSafeHost(ep.host, opts.allowPrivate);
    const transport = nodemailer.createTransport({
      host: ip,
      port: ep.port,
      secure: isImplicitTls(ep.port),
      requireTLS: !isImplicitTls(ep.port) && !opts.insecureTlsForTests && !opts.plaintextForTests,
      ignoreTLS: opts.plaintextForTests === true,
      auth: { user: cred.username, pass: cred.password },
      tls: { servername: ep.host, rejectUnauthorized: !opts.insecureTlsForTests },
      connectionTimeout: opts.timeoutMs ?? 10000,
      greetingTimeout: opts.timeoutMs ?? 10000,
      socketTimeout: opts.timeoutMs ?? 10000,
    });
    await transport.verify();
    transport.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: safeError(e, cred.password) };
  }
}

/** Vérifie la connexion IMAP et l'authentification, sans lire aucun message. */
export async function verifyImap(
  ep: Endpoint,
  cred: Credentials,
  opts: TransportOptions = {},
): Promise<TestResult> {
  let client: ImapFlow | undefined;
  try {
    const ip = await resolveSafeHost(ep.host, opts.allowPrivate);
    client = new ImapFlow({
      host: ip,
      port: ep.port,
      secure: isImplicitTls(ep.port),
      doSTARTTLS:
        isImplicitTls(ep.port) || opts.plaintextForTests
          ? opts.plaintextForTests
            ? false
            : undefined
          : true,
      auth: { user: cred.username, pass: cred.password },
      tls: { servername: ep.host, rejectUnauthorized: !opts.insecureTlsForTests },
      logger: false,
      connectionTimeout: opts.timeoutMs ?? 10000,
    });
    client.on("error", () => undefined);
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (e) {
    try {
      client?.close();
    } catch {
      /* déjà fermé */
    }
    return { ok: false, error: safeError(e, cred.password) };
  }
}

export interface TestMail {
  from: { name: string; address: string };
  /** Toujours l'adresse de l'utilisateur connecté : jamais un tiers. */
  to: string;
  subject: string;
  text: string;
}

/** Envoi réel du message de test (garde d'envoi vérifiée par l'appelant). */
export async function sendSmtp(
  ep: Endpoint,
  cred: Credentials,
  mail: TestMail,
  opts: TransportOptions = {},
): Promise<TestResult> {
  try {
    const ip = await resolveSafeHost(ep.host, opts.allowPrivate);
    const transport = nodemailer.createTransport({
      host: ip,
      port: ep.port,
      secure: isImplicitTls(ep.port),
      requireTLS: !isImplicitTls(ep.port) && !opts.insecureTlsForTests && !opts.plaintextForTests,
      ignoreTLS: opts.plaintextForTests === true,
      auth: { user: cred.username, pass: cred.password },
      tls: { servername: ep.host, rejectUnauthorized: !opts.insecureTlsForTests },
      connectionTimeout: opts.timeoutMs ?? 10000,
    });
    await transport.sendMail({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    transport.close();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: safeError(e, cred.password) };
  }
}
