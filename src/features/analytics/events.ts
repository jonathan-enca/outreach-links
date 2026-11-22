/**
 * Événements personnalisés Vercel Analytics du tunnel (visite → inscription → campagne → paiement).
 * Liste fermée : un nom hors de cette liste ne compile pas. Deux propriétés au plus par événement
 * (limite du plan Pro) et jamais de donnée personnelle (ni email, ni nom, ni domaine du client).
 */
export type AnalyticsEvents = {
  /** Clic sur un bouton d'appel à l'essai : `emplacement` = hero, en-tête, article… */
  cta_click: { emplacement: string };
  /** Compte créé (le mail de confirmation est parti, ou la session est ouverte tout de suite). */
  signup_completed: { confirmation: "email" | "immediate" };
  /** Lien du mail de confirmation ouvert : le tunnel passe parfois un autre jour ou un autre appareil. */
  email_confirmed: Record<string, never>;
  /** Étape 1 : la campagne (site × pays) est créée. */
  campaign_site_added: Record<string, never>;
  /** Search Console connectée (depuis la campagne ou les réglages). */
  search_console_connected: { depuis: "campagne" | "reglages" };
  /** Étape 1 terminée : l'audit est lancé. */
  campaign_launched: Record<string, never>;
  plan_validated: Record<string, never>;
  batch_validated: Record<string, never>;
  /** Premiers messages approuvés pour l'envoi. */
  messages_approved: Record<string, never>;
  checkout_started: { plan: string; periode: string };
  subscription_started: { plan: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;
