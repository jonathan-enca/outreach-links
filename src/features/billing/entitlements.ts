import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  BETA_SEND_PLAN,
  contactedThisMonth,
  effectivePlan,
  monthStart,
  type BillingPlanKey,
} from "./plans";

type Client = SupabaseClient<Database>;

/**
 * Droits d'un espace selon son forfait. Une seule source pour tout le produit : les actions
 * (lancer une campagne, approuver, envoyer, créer un site, une boîte) interrogent ce module, jamais
 * la table `plans` directement.
 *
 * Offre gratuite (décisions du 21/11/2026, docs/offres-et-acces.md) : « tout voir, rien envoyer ».
 * Une analyse complète, une seule fois ; toute la liste des cibles ; pas de contact visible, trois
 * messages lisibles en entier, ni export, ni boîte d'envoi, ni envoi.
 */
export interface Entitlements {
  plan: BillingPlanKey;
  /** Un envoi réel (approbation, relance) est-il permis ? Faux pour le gratuit. */
  canSend: boolean;
  /** Plafond mensuel de cibles contactées (premiers messages ; relances et réponses non comptées). */
  sendCap: number;
  /** Cibles déjà contactées ce mois civil (UTC). */
  sendUsed: number;
  maxSites: number;
  maxMailboxes: number;
  /** Campagnes lancées par mois civil (une campagne = plan de liens + lots d'un site). */
  monthlyCampaigns: number;
  /** Campagnes sur la vie du compte ; `null` = pas de plafond à vie. Gratuit : 1. */
  lifetimeCampaigns: number | null;
  dedicatedDomain: boolean;
  /** Vérification du lien obtenu (toutes les offres payantes). */
  linkChecks: boolean;
  /** Surveillance continue des liens et alerte de disparition (Pro, Scale). */
  linkMonitoring: boolean;
  /** Emails et liens de formulaire des cibles visibles. Faux : ils ne quittent jamais le serveur. */
  contactsVisible: boolean;
  /** Messages rédigés lisibles en entier ; `null` = tous. Gratuit : 3. */
  readableDrafts: number | null;
  exportCsv: boolean;
  /** Réponses « prêtes à insérer » (Pro, Scale). */
  readyReplies: boolean;
  /** Pages du site gardées dans le catalogue du rédacteur. */
  catalogueCap: number;
}

/** Offre gratuite : tout voir, rien envoyer. Un site, une analyse (une fois), aucune boîte. */
export const FREE_LIMITS = {
  maxSites: 1,
  maxMailboxes: 0,
  monthlyCampaigns: 1,
  lifetimeCampaigns: 1,
  dedicatedDomain: false,
  linkChecks: false,
  linkMonitoring: false,
  contactsVisible: false,
  readableDrafts: 3,
  exportCsv: false,
  readyReplies: false,
  catalogueCap: 100,
} as const;

export interface PlanRow {
  key: string;
  monthly_send_cap: number;
  max_sites: number;
  max_mailboxes: number;
  monthly_campaigns: number;
  dedicated_domain: boolean;
  link_checks: boolean;
  link_monitoring: boolean;
  contacts_visible: boolean;
  readable_drafts: number | null;
  export_csv: boolean;
  ready_replies: boolean;
  catalogue_cap: number;
  lifetime_campaigns: number | null;
}

/** Droits tirés d'une ligne `plans` (hors forfait, envoi et compteur). */
function rightsOf(row: PlanRow) {
  return {
    maxSites: row.max_sites,
    maxMailboxes: row.max_mailboxes,
    monthlyCampaigns: row.monthly_campaigns,
    lifetimeCampaigns: row.lifetime_campaigns,
    dedicatedDomain: row.dedicated_domain,
    linkChecks: row.link_checks,
    linkMonitoring: row.link_monitoring,
    contactsVisible: row.contacts_visible,
    readableDrafts: row.readable_drafts,
    exportCsv: row.export_csv,
    readyReplies: row.ready_replies,
    catalogueCap: row.catalogue_cap,
  };
}

/**
 * Calcule les droits à partir du forfait effectif et de la ligne `plans` correspondante.
 * `beta` : tant que le paiement n'est pas ouvert (réglage BETA_MODE), un espace sans abonnement
 * prend les droits de `BETA_SEND_PLAN` (ligne lue par `loadEntitlements`).
 */
export function entitlementsFor(
  plan: BillingPlanKey,
  row: PlanRow | null,
  sendUsed: number,
  beta: boolean,
): Entitlements {
  if (plan === "gratuit") {
    if (beta && row?.key === BETA_SEND_PLAN) {
      return {
        plan,
        canSend: row.monthly_send_cap > 0,
        sendCap: row.monthly_send_cap,
        sendUsed,
        ...rightsOf(row),
      };
    }
    return { plan, canSend: false, sendCap: 0, sendUsed, ...FREE_LIMITS };
  }
  if (!row) {
    // Forfait payant sans ligne `plans` lisible : on refuse l'envoi (jamais d'envoi par défaut).
    return { plan, canSend: false, sendCap: 0, sendUsed, ...FREE_LIMITS };
  }
  return {
    plan,
    canSend: row.monthly_send_cap > 0,
    sendCap: row.monthly_send_cap,
    sendUsed,
    ...rightsOf(row),
  };
}

/** Lit les droits d'un espace : forfait effectif, ligne `plans`, envois réels du mois. */
export async function loadEntitlements(
  db: Client,
  workspaceId: string,
  now: Date,
  beta = false,
): Promise<Entitlements> {
  const subscribed = await effectivePlan(db, workspaceId, now);
  const planKey: BillingPlanKey = subscribed === "gratuit" && beta ? BETA_SEND_PLAN : subscribed;
  const { data: row } = await db
    .from("plans")
    .select(
      "key, monthly_send_cap, max_sites, max_mailboxes, monthly_campaigns, lifetime_campaigns, dedicated_domain, link_checks, link_monitoring, contacts_visible, readable_drafts, export_csv, ready_replies, catalogue_cap",
    )
    .eq("key", planKey)
    .maybeSingle();
  const sendUsed = await contactedThisMonth(db, workspaceId, now);
  return entitlementsFor(subscribed, row ?? null, sendUsed, beta);
}

export type BlockReason = "envoi" | "site" | "boite" | "campagne" | "domaine";

/** Message affiché quand une action est refusée par le forfait. */
export function planBlockMessage(e: Entitlements, reason: BlockReason): string {
  switch (reason) {
    case "envoi":
      if (!e.canSend) {
        return "L'envoi se débloque avec un forfait payant. Vous voyez et préparez tout gratuitement, sans rien envoyer.";
      }
      return `Plafond mensuel atteint (${e.sendCap} cibles contactées sur cette offre). Il se renouvelle le 1er du mois ; les relances et les réponses continuent de partir.`;
    case "site":
      return `Votre forfait permet ${e.maxSites} site(s). Passez à une offre supérieure pour en ajouter.`;
    case "boite":
      return e.maxMailboxes === 0
        ? "La boîte d'envoi se connecte avec un forfait payant."
        : `Votre forfait permet ${e.maxMailboxes} boîte(s) d'envoi.`;
    case "campagne":
      if (e.lifetimeCampaigns !== null) {
        return "L'analyse gratuite se fait une fois. Pour en relancer une, choisissez une offre payante.";
      }
      return `Votre forfait permet ${e.monthlyCampaigns} campagne(s) par mois. Le compteur se renouvelle le 1er du mois.`;
    case "domaine":
      return "Le domaine d'envoi dédié est réservé à l'offre Scale.";
  }
}

/** Refus d'une réponse ou d'une relance : seule l'offre compte, jamais le plafond mensuel. */
export function replyBlock(e: Entitlements): string | null {
  return e.canSend ? null : planBlockMessage(e, "envoi");
}

/** Refus d'un premier message (approbation) : message à afficher, ou `null` si l'envoi est permis. */
export function sendBlock(e: Entitlements): string | null {
  if (!e.canSend || e.sendUsed >= e.sendCap) return planBlockMessage(e, "envoi");
  return null;
}

/** Une nouvelle campagne est-elle refusée par l'offre ? (plafond à vie du gratuit, sinon mensuel) */
export function campaignBlocked(e: Entitlements, usedThisMonth: number, usedEver: number): boolean {
  if (e.lifetimeCampaigns !== null && usedEver >= e.lifetimeCampaigns) return true;
  return usedThisMonth >= e.monthlyCampaigns;
}

/** Campagnes lancées depuis la création de l'espace (une analyse échouée ne compte pas). */
export async function campaignsEver(db: Client, workspaceId: string): Promise<number> {
  const { data } = await db
    .from("audits")
    .select("id, sites!inner(workspace_id)")
    .eq("sites.workspace_id", workspaceId)
    .neq("status", "echoue");
  return data?.length ?? 0;
}

/**
 * Campagnes lancées ce mois civil (UTC) : une campagne = une analyse de site + son plan de liens.
 * Une analyse échouée ne compte pas. Sert à la facturation et au refus d'une nouvelle campagne.
 */
export async function campaignsThisMonth(
  db: Client,
  workspaceId: string,
  now: Date,
): Promise<number> {
  const { data } = await db
    .from("audits")
    .select("id, sites!inner(workspace_id)")
    .eq("sites.workspace_id", workspaceId)
    .neq("status", "echoue")
    .gte("created_at", monthStart(now).toISOString());
  return data?.length ?? 0;
}
