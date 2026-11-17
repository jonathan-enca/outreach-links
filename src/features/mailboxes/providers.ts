import { t } from "@/lib/messages";
import type { GuideGroup, ProviderGuide } from "../../../messages/mailbox-guides";

/** Fournisseurs de messagerie connus : réglages de serveurs et guide pas à pas (textes dans `messages/mailbox-guides.ts`). */
export const PROVIDERS: readonly ProviderGuide[] = t.mailboxGuides.providers;

export const GUIDES_BASE = "/aide/boite-envoi";
export const guideHref = (slug: string) => `${GUIDES_BASE}/${slug}`;

/** Ordre d'affichage des familles, dans la liste déroulante comme dans le sommaire des guides. */
export const GROUP_ORDER: readonly GuideGroup[] = [
  "grandPublic",
  "operateur",
  "hebergeur",
  "autre",
];

export function providerBySlug(slug: string | null | undefined): ProviderGuide | null {
  return PROVIDERS.find((p) => p.slug === slug) ?? null;
}

export function providersByGroup(group: GuideGroup): ProviderGuide[] {
  return PROVIDERS.filter((p) => p.group === group);
}

const domainOf = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

/** Fournisseur reconnu à l'adresse (gmail.com, orange.fr…). Une adresse à son propre domaine n'est pas devinable. */
export function detectProvider(email: string): ProviderGuide | null {
  const domain = domainOf(email);
  if (!domain) return null;
  return PROVIDERS.find((p) => p.domains.includes(domain)) ?? null;
}

/** Fournisseur reconnu au serveur d'envoi enregistré (utile pour une adresse à son propre domaine). */
export function detectProviderByHost(host: string | null | undefined): ProviderGuide | null {
  const h = host?.trim().toLowerCase();
  if (!h) return null;
  return (
    PROVIDERS.find(
      (p) =>
        p.server?.smtpHost === h ||
        p.server?.imapHost === h ||
        p.hostSuffixes?.some((s) => h === s || h.endsWith(`.${s}`)),
    ) ?? null
  );
}

/** Le guide à proposer pour une boîte déjà enregistrée : par l'adresse, sinon par le serveur. */
export function providerForMailbox(email: string, smtpHost?: string | null): ProviderGuide | null {
  return detectProvider(email) ?? detectProviderByHost(smtpHost);
}

/** Titre de la page d'un guide. */
export function guideTitle(p: ProviderGuide): string {
  const gd = t.mailboxGuides.ui.guide;
  if (p.title) return p.title;
  return p.compatible ? gd.title(p.name) : gd.titleNotCompatible(p.name);
}
