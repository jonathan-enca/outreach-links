import {
  createPageReader,
  type PageReaderDeps,
  type PageRead,
} from "@/features/triage/page-reader";
import { contactCandidates, extractEmails, isOwnDomainEmail, rankEmails } from "./extract";
import { CONTACT_LIMITS } from "./limits";
import type { EmailProvider, FreeVerifier } from "./provider";
import type { ContactItem, ContactResult, Verification } from "./types";

export interface InvestigateDeps extends Omit<PageReaderDeps, "maxRequests"> {
  provider: EmailProvider | null;
  /**
   * Vérificateur GRATUIT (DNS) : n'est utilisé que pour un email publié par la cible elle-même,
   * sur son propre domaine, quand aucun vérificateur payant n'a pu trancher.
   */
  freeVerifier?: FreeVerifier | null;
  /** Domaines et emails à ne jamais contacter (liste de suppression). */
  isSuppressed: (email: string | null, domain: string) => boolean;
  /** Appels payants encore autorisés pour l'exécution (décrémenté par l'appelant). */
  paidCallsLeft: number;
}

const stripWww = (d: string) => d.replace(/^www\./, "").toLowerCase();

function base(item: ContactItem): ContactResult {
  return {
    itemId: item.id,
    status: "introuvable",
    email: null,
    emailSource: null,
    verification: "non_verifie",
    verifier: null,
    contactUrl: null,
    formUrl: null,
    reason: "",
    sendable: false,
    paidCalls: 0,
  };
}

/**
 * Enquête sur UNE cible « ok » : email visible (page, accueil, pages de contact et légales),
 * sinon finder, sinon formulaire (tâche manuelle). Ne lève jamais : une erreur réseau ou
 * fournisseur devient un résultat avec motif. Un email n'est envoyable que vérifié « valide ».
 */
export async function investigateItem(
  item: ContactItem,
  deps: InvestigateDeps,
): Promise<ContactResult> {
  const out = base(item);
  const domain = stripWww(item.domain);
  if (deps.isSuppressed(null, domain)) {
    return { ...out, status: "supprime", reason: "Domaine sur la liste « ne pas contacter »." };
  }

  const reader = createPageReader({
    ...deps,
    hostDelayMs: deps.hostDelayMs ?? CONTACT_LIMITS.hostDelayMs,
    maxRequests: CONTACT_LIMITS.maxRequestsPerItem,
  });

  // 1. Pages à lire : la page de la cible, l'accueil, puis les pages de contact et légales.
  const pages: PageRead[] = [];
  const seen = new Set<string>();
  const readOnce = async (url: string) => {
    if (seen.has(url)) return null;
    seen.add(url);
    const p = await reader.read(url);
    if (p.status === 200) pages.push(p);
    return p;
  };
  const first = await readOnce(item.resolvedUrl);
  let home: PageRead | null = null;
  try {
    const origin = new URL(item.resolvedUrl).origin + "/";
    home = await readOnce(origin);
  } catch {
    /* URL invalide : seule la page de la cible compte */
  }
  const linkPool = [...(first?.links ?? []), ...(home?.links ?? [])];
  for (const href of contactCandidates(linkPool, CONTACT_LIMITS.maxContactPages)) {
    await readOnce(href);
  }

  const emails = rankEmails(
    [...new Set(pages.flatMap((p) => extractEmails(p.text, p.mailtos)))],
    domain,
  );
  const formPage = pages.find((p) => p.hasContactForm);
  const contactPage = pages.find((p) => /contact/i.test(p.url) && p.status === 200);
  const contactUrl = contactPage?.url ?? formPage?.url ?? null;
  let paid = 0;

  let verifiedBy: string | null = null;
  const verify = async (email: string, source: "page" | "finder"): Promise<Verification> => {
    if (deps.provider && deps.paidCallsLeft - paid > 0) {
      paid++;
      try {
        const v = await deps.provider.verify(email);
        verifiedBy = deps.provider.name;
        return v;
      } catch {
        /* repli sur la vérification gratuite */
      }
    }
    if (deps.freeVerifier && source === "page" && isOwnDomainEmail(email, domain)) {
      try {
        const v = await deps.freeVerifier.verify(email);
        if (v !== "non_verifie") verifiedBy = deps.freeVerifier.name;
        return v;
      } catch {
        return "non_verifie";
      }
    }
    return "non_verifie";
  };

  const finish = async (email: string, source: "page" | "finder"): Promise<ContactResult> => {
    if (deps.isSuppressed(email, domain)) {
      return {
        ...out,
        status: "supprime",
        email,
        emailSource: source,
        contactUrl,
        reason: "Adresse sur la liste « ne pas contacter ».",
        paidCalls: paid,
      };
    }
    const v = await verify(email, source);
    const common = {
      ...out,
      email,
      emailSource: source,
      verification: v,
      contactUrl,
      paidCalls: paid,
    };
    const verifier = v !== "non_verifie" ? verifiedBy : null;
    if (v === "valide") {
      return {
        ...common,
        verifier,
        status: "email_verifie",
        sendable: true,
        reason:
          verifier === "mx"
            ? "Email publié par le site sur son propre domaine, domaine de messagerie vérifié (DNS). Vérification gratuite : un rebond éventuel arrêtera les envois."
            : source === "page"
              ? "Email visible sur le site, vérifié valide."
              : "Email trouvé par recherche, vérifié valide.",
      };
    }
    if (v === "invalide") {
      return {
        ...common,
        verifier,
        status: "email_invalide",
        reason: "L'adresse est invalide selon le vérificateur : elle ne sera pas utilisée.",
      };
    }
    if (v === "risque" || v === "inconnu") {
      return {
        ...common,
        verifier,
        status: "email_a_verifier",
        reason:
          "Vérification non concluante (adresse risquée ou inconnue) : pas d'envoi automatique.",
      };
    }
    return {
      ...common,
      status: "email_a_verifier",
      reason: deps.provider
        ? "Vérification indisponible : pas d'envoi tant que l'adresse n'est pas vérifiée."
        : "Aucun vérificateur configuré : l'adresse reste à vérifier, pas d'envoi.",
    };
  };

  // 2. Email visible (de préférence celui du domaine de la cible).
  const own = emails.find((e) => isOwnDomainEmail(e, domain));
  if (own) return finish(own, "page");

  // 3. Finder payant (seulement si configuré et dans le plafond d'appels).
  if (deps.provider && deps.paidCallsLeft - paid > 0) {
    paid++;
    try {
      const found = (await deps.provider.findByDomain(domain))
        .filter((f) => isOwnDomainEmail(f.email, domain))
        .sort((a, b) => b.confidence - a.confidence)[0];
      if (found) return finish(found.email, "finder");
    } catch {
      /* repli sur le formulaire */
    }
  }

  // 4. Un email tiers visible n'est jamais utilisé tel quel : on préfère le formulaire.
  if (formPage) {
    return {
      ...out,
      status: "formulaire",
      formUrl: formPage.url,
      contactUrl,
      paidCalls: paid,
      reason: "Pas d'email trouvé : formulaire de contact à remplir à la main (tâche créée).",
    };
  }
  if (emails.length > 0) {
    return {
      ...out,
      status: "email_a_verifier",
      email: emails[0]!,
      emailSource: "page",
      contactUrl,
      paidCalls: paid,
      reason:
        "Seule une adresse d'un autre domaine est visible : à vérifier à la main, pas d'envoi.",
    };
  }
  return {
    ...out,
    paidCalls: paid,
    contactUrl,
    reason: "Aucun email ni formulaire trouvé sur le site.",
  };
}
