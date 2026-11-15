import { z } from "zod";

/** Politique « c'est payant » (CLAUDE.md 4.3). Jamais décidée seule : l'utilisateur choisit. */
export const PAYMENT_OPTIONS = ["decliner", "echanger", "achat_plafonne"] as const;
export type PaymentOption = (typeof PAYMENT_OPTIONS)[number];

/** Par défaut : décliner poliment. */
export const DEFAULT_PAYMENT_OPTION: PaymentOption = "decliner";

export const PAYMENT_LABELS: Record<PaymentOption, string> = {
  decliner: "Décliner poliment",
  echanger: "Proposer un échange",
  achat_plafonne: "Acheter, avec un plafond (lien sponsorisé)",
};

export type LinkNature = "editorial_gratuit" | "echange" | "sponsorise";

export const LINK_NATURE_LABELS: Record<LinkNature, string> = {
  editorial_gratuit: "Lien éditorial gratuit",
  echange: "Échange",
  sponsorise: "Lien sponsorisé",
};

export const NATURE_BY_OPTION: Record<PaymentOption, LinkNature> = {
  decliner: "editorial_gratuit",
  echanger: "echange",
  achat_plafonne: "sponsorise",
};

/** Plafond d'achat : 1 à 1000 euros, deux décimales. */
export const budgetSchema = z.coerce.number().positive().max(1000);

export function parseBudget(v: unknown): number | null {
  const r = budgetSchema.safeParse(typeof v === "string" ? v.replace(",", ".") : v);
  return r.success ? Math.round(r.data * 100) / 100 : null;
}

export interface PaymentContext {
  signatureFirstName: string;
  /** Page du site que nous voulions voir liée. */
  targetUrl: string;
  /** Prénom ou formule d'appel de la cible, si connu ; sinon « Bonjour ». */
  greeting?: string;
}

export interface PaymentDraft {
  option: PaymentOption;
  subject: string;
  body: string;
  budgetCapEur: number | null;
  linkNature: LinkNature;
}

/**
 * Brouillon de réponse à une demande d'argent. Gabarits sobres, sans IA, sans promesse. L'achat est
 * toujours libellé « sponsorisé » dans le message : on ne déguise jamais un lien payant.
 */
export function buildPaymentDraft(
  option: PaymentOption,
  ctx: PaymentContext,
  budgetCapEur: number | null = null,
): PaymentDraft {
  const hi = ctx.greeting ?? "Bonjour";
  const sign = ctx.signatureFirstName;
  if (option === "decliner") {
    return {
      option,
      subject: "Re : votre réponse",
      body: `${hi},\n\nMerci d'avoir pris le temps de me répondre. Nous ne payons pas pour les liens, je comprends donc que cela s'arrête là. Si un jour la page vous paraît utile à vos lecteurs, vous êtes libre de la citer.\n\nBonne continuation,\n${sign}`,
      budgetCapEur: null,
      linkNature: "editorial_gratuit",
    };
  }
  if (option === "echanger") {
    return {
      option,
      subject: "Re : votre réponse",
      body: `${hi},\n\nMerci pour votre retour. Nous ne payons pas pour les liens, mais je peux vous proposer autre chose : une contribution écrite pour votre site, ou une ressource que vos lecteurs pourraient utiliser (${ctx.targetUrl}). Si l'une de ces pistes vous intéresse, dites-moi laquelle.\n\nCordialement,\n${sign}`,
      budgetCapEur: null,
      linkNature: "echange",
    };
  }
  if (budgetCapEur === null || !(budgetCapEur > 0)) {
    throw new Error("Un achat de lien exige un plafond de budget positif.");
  }
  return {
    option,
    subject: "Re : votre réponse",
    body: `${hi},\n\nMerci pour votre retour. Si l'emplacement convient, nous pouvons envisager un lien sponsorisé, c'est-à-dire un lien clairement identifié comme tel (attribut rel="sponsored") et non un lien éditorial. Notre budget pour cela est limité à ${budgetCapEur.toFixed(2).replace(".", ",")} euros. Pourriez-vous me confirmer si cela vous convient, et pour quelle page ?\n\nCordialement,\n${sign}`,
    budgetCapEur,
    linkNature: "sponsorise",
  };
}
