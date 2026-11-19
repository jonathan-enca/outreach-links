import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { BETA_SEND_PLAN, effectivePlan, monthStart, type BillingPlanKey } from "./plans";

type Client = SupabaseClient<Database>;

/**
 * Droits d'un espace selon son forfait. Une seule source pour tout le produit : les actions
 * (lancer une campagne, approuver, envoyer, créer un site, une boîte) interrogent ce module, jamais
 * la table `plans` directement. Le gratuit fait l'analyse et voit toutes les opportunités, mais
 * n'envoie rien. Un audit ne se compte pas : il se relance pour lancer une campagne.
 */
export interface Entitlements {
  plan: BillingPlanKey;
  /** Un envoi réel (approbation, relance) est-il permis ? Faux pour le gratuit. */
  canSend: boolean;
  /** Plafond mensuel d'envois réels (emails + relances). 0 pour le gratuit. */
  sendCap: number;
  /** Envois réels déjà partis ce mois civil (UTC). */
  sendUsed: number;
  maxSites: number;
  maxMailboxes: number;
  /** Campagnes lancées par mois civil (une campagne = plan de liens + lots d'un site). */
  monthlyCampaigns: number;
  dedicatedDomain: boolean;
  linkChecks: boolean;
}

/** Forfait gratuit : un site, une campagne en aperçu par mois, aucun envoi, aucune boîte. */
export const FREE_LIMITS = {
  maxSites: 1,
  maxMailboxes: 0,
  monthlyCampaigns: 1,
  dedicatedDomain: false,
  linkChecks: false,
} as const;

export interface PlanRow {
  key: string;
  monthly_send_cap: number;
  max_sites: number;
  max_mailboxes: number;
  monthly_campaigns: number;
  dedicated_domain: boolean;
  link_checks: boolean;
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
        maxSites: row.max_sites,
        maxMailboxes: row.max_mailboxes,
        monthlyCampaigns: row.monthly_campaigns,
        dedicatedDomain: row.dedicated_domain,
        linkChecks: row.link_checks,
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
    maxSites: row.max_sites,
    maxMailboxes: row.max_mailboxes,
    monthlyCampaigns: row.monthly_campaigns,
    dedicatedDomain: row.dedicated_domain,
    linkChecks: row.link_checks,
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
      "key, monthly_send_cap, max_sites, max_mailboxes, monthly_campaigns, dedicated_domain, link_checks",
    )
    .eq("key", planKey)
    .maybeSingle();
  const since = monthStart(now).toISOString();
  const real = ["en_cours", "envoye", "a_reessayer", "echec"];
  const [mails, replies] = await Promise.all([
    db
      .from("sent_messages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("dry_run", false)
      .in("status", real)
      .gte("claimed_at", since),
    db
      .from("reply_sends")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("dry_run", false)
      .in("status", real)
      .gte("claimed_at", since),
  ]);
  const sendUsed = (mails.data?.length ?? 0) + (replies.data?.length ?? 0);
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
      return `Plafond mensuel atteint (${e.sendCap} envois sur ce forfait). Il se renouvelle le 1er du mois.`;
    case "site":
      return `Votre forfait permet ${e.maxSites} site(s). Passez à une offre supérieure pour en ajouter.`;
    case "boite":
      return e.maxMailboxes === 0
        ? "La boîte d'envoi se connecte avec un forfait payant."
        : `Votre forfait permet ${e.maxMailboxes} boîte(s) d'envoi.`;
    case "campagne":
      return `Votre forfait permet ${e.monthlyCampaigns} campagne(s) par mois. Le compteur se renouvelle le 1er du mois.`;
    case "domaine":
      return "Le domaine d'envoi dédié est réservé à l'offre Scale.";
  }
}

/** Refus d'un envoi (approbation, relance) : message à afficher, ou `null` si l'envoi est permis. */
export function sendBlock(e: Entitlements): string | null {
  if (!e.canSend || e.sendUsed >= e.sendCap) return planBlockMessage(e, "envoi");
  return null;
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
