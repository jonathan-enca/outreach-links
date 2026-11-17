import { describe, expect, it } from "vitest";
import { fr } from "../../../messages/fr";
import { classifyMailboxError, explainMailboxError } from "./explain-error";
import {
  detectProvider,
  detectProviderByHost,
  GROUP_ORDER,
  guideHref,
  providerBySlug,
  providerForMailbox,
  PROVIDERS,
  providersByGroup,
} from "./providers";
import { IMAP_PORTS, mailboxSchema, SMTP_PORTS } from "./schema";

function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String(value("X"))];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === "object") return Object.values(value).flatMap(texts);
  return [];
}

describe("fournisseurs de messagerie", () => {
  it("couvre les messageries courantes, chacune avec une adresse de guide unique", () => {
    const slugs = PROVIDERS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const must of ["gmail", "outlook", "yahoo", "icloud", "orange", "free", "ovh", "autre"])
      expect(slugs).toContain(must);
    expect(guideHref("gmail")).toBe("/aide/boite-envoi/gmail");
  });

  it("chaque fournisseur est rangé dans une famille affichée", () => {
    const shown = GROUP_ORDER.flatMap((g) => providersByGroup(g));
    expect(shown).toHaveLength(PROVIDERS.length);
  });

  it("un domaine d'adresse ne désigne qu'un seul fournisseur", () => {
    const all = PROVIDERS.flatMap((p) => p.domains);
    expect(new Set(all).size).toBe(all.length);
    for (const d of all) expect(d).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
  });

  it("les réglages remplis d'office passent le contrôle du formulaire", () => {
    for (const p of PROVIDERS) {
      if (!p.server) continue;
      expect(SMTP_PORTS as readonly number[], p.slug).toContain(p.server.smtpPort);
      expect(IMAP_PORTS as readonly number[], p.slug).toContain(p.server.imapPort);
      const r = mailboxSchema.safeParse({
        email: "jo@exemple.fr",
        fromName: "Jo",
        username: "jo@exemple.fr",
        password: "x",
        smtpHost: p.server.smtpHost,
        smtpPort: String(p.server.smtpPort),
        imapHost: p.server.imapHost,
        imapPort: String(p.server.imapPort),
      });
      expect(r.success, p.slug).toBe(true);
    }
  });

  it("un guide compatible va jusqu'au bout : étapes, pannes, sources ; sinon il dit quoi faire à la place", () => {
    for (const p of PROVIDERS) {
      expect(p.intro.length, p.slug).toBeGreaterThan(20);
      // Le guide générique n'a pas de fournisseur, donc pas d'aide officielle à citer.
      if (p.group !== "autre") expect(p.sources.length, p.slug).toBeGreaterThan(0);
      for (const s of p.sources) expect(s.href, p.slug).toMatch(/^https:\/\//);
      for (const step of p.steps) if (step.link) expect(step.link.href).toMatch(/^https:\/\//);
      if (p.compatible) {
        expect(p.steps.length, p.slug).toBeGreaterThanOrEqual(1);
        expect(p.errors.length, p.slug).toBeGreaterThanOrEqual(1);
        expect(p.server || p.serverHint, p.slug).toBeTruthy();
      } else {
        expect(p.server, p.slug).toBeUndefined();
        expect(p.alternatives?.length ?? 0, p.slug).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("textes : vouvoiement, aucune garantie, pas de point d'exclamation", () => {
    const all = texts(fr.mailboxGuides).join("\n");
    expect(all).not.toMatch(/(?<![\p{L}])(tu|ton|ta|tes|toi)(?![\p{L}])/iu);
    expect(all).not.toMatch(/garanti/i);
    expect(all).not.toMatch(/!/);
  });
});

describe("reconnaissance du fournisseur", () => {
  it("par l'adresse", () => {
    expect(detectProvider(" Jo@Gmail.com ")?.slug).toBe("gmail");
    expect(detectProvider("jo@hotmail.fr")?.slug).toBe("outlook");
    expect(detectProvider("jo@wanadoo.fr")?.slug).toBe("orange");
    expect(detectProvider("jo@mon-site.fr")).toBeNull();
    expect(detectProvider("pas-une-adresse")).toBeNull();
  });
  it("par le serveur, pour une adresse à son propre domaine", () => {
    expect(detectProviderByHost("smtp.gmail.com")?.slug).toBe("gmail");
    expect(detectProviderByHost("SSL0.OVH.NET")?.slug).toBe("ovh");
    expect(detectProviderByHost("smtp.inconnu.example")).toBeNull();
    expect(providerForMailbox("jo@mon-site.fr", "ssl0.ovh.net")?.slug).toBe("ovh");
    expect(providerForMailbox("jo@yahoo.fr", "n-importe.quoi")?.slug).toBe("yahoo");
  });
  it("un fournisseur non compatible n'offre aucun réglage", () => {
    expect(providerBySlug("outlook")?.compatible).toBe(false);
    expect(providerBySlug("inconnu")).toBeNull();
  });
});

describe("explication d'un échec de connexion", () => {
  it.each([
    ["Invalid login: 534-5.7.9 Application-specific password required", "appPassword"],
    ["Invalid login: 535-5.7.8 Username and Password not accepted", "credentials"],
    ["Command failed: AUTHENTICATIONFAILED Invalid credentials (Failure)", "credentials"],
    [
      "Invalid login: 535 5.7.139 Authentication unsuccessful, basic authentication is disabled",
      "microsoftBlocked",
    ],
    ["getaddrinfo ENOTFOUND smtp.exemple.fr", "hostNotFound"],
    ["hôte introuvable", "hostNotFound"],
    ["connect ETIMEDOUT 1.2.3.4:587", "unreachable"],
    ["Greeting never received", "unreachable"],
    ["Hostname/IP does not match certificate's altnames", "certificate"],
    ["adresse non publique refusée", "privateHost"],
  ])("%s", (raw, kind) => {
    expect(classifyMailboxError(raw)).toBe(kind);
    expect(explainMailboxError(raw)).toBe(fr.mailboxGuides.ui.errorHelp[kind as "credentials"]);
  });
  it("message inconnu ou absent : pas d'explication inventée", () => {
    expect(explainMailboxError("421 4.3.2 Service not available")).toBeNull();
    expect(explainMailboxError(null)).toBeNull();
  });
});
