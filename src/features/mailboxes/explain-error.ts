import { t } from "@/lib/messages";

export type MailboxErrorKind =
  | "appPassword"
  | "microsoftBlocked"
  | "credentials"
  | "hostNotFound"
  | "unreachable"
  | "certificate"
  | "privateHost"
  | "disabledAccess";

/**
 * Règles dans l'ordre : la première qui reconnaît le message brut du serveur gagne. Les cas précis
 * (mot de passe d'application exigé, blocage Microsoft) passent avant le refus d'identifiants générique.
 */
const RULES: ReadonlyArray<[MailboxErrorKind, RegExp]> = [
  ["appPassword", /application-specific password|5\.7\.9\b|app password|InvalidSecondFactor/i],
  [
    "microsoftBlocked",
    /basic authentication is disabled|5\.7\.139|5\.7\.3 authentication unsuccessful|SmtpClientAuthentication is disabled|BasicAuthBlocked/i,
  ],
  [
    "disabledAccess",
    /imap (access )?is (disabled|not enabled)|not enabled for imap|imap.*d[ée]sactiv|please enable imap|account is not enabled|\[ALERT\]/i,
  ],
  [
    "credentials",
    /\b535\b|5\.7\.8|authentication failed|authenticationfailed|invalid login|invalid credentials|login failed|bad username or password|incorrect authentication|authentication credentials invalid/i,
  ],
  ["privateHost", /adresse non publique/i],
  ["hostNotFound", /ENOTFOUND|EAI_AGAIN|hôte introuvable|getaddrinfo/i],
  ["certificate", /certificate|self[- ]signed|altnames|CERT_/i],
  [
    "unreachable",
    /ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|timeout|timed out|greeting never received|connection closed|socket/i,
  ],
];

export function classifyMailboxError(raw: string | null | undefined): MailboxErrorKind | null {
  if (!raw) return null;
  return RULES.find(([, re]) => re.test(raw))?.[0] ?? null;
}

/** Explication en clair d'un échec de connexion, ou `null` si le message du serveur n'est pas reconnu. */
export function explainMailboxError(raw: string | null | undefined): string | null {
  const kind = classifyMailboxError(raw);
  return kind ? t.mailboxGuides.ui.errorHelp[kind] : null;
}
