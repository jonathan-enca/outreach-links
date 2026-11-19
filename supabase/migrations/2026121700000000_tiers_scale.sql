-- Grille de tarifs validée le 19/11/2026 : Starter 29,90 € / Pro 49,90 € / Scale 199,90 € (ex-« Business »,
-- clé `business` conservée pour ne pas toucher Stripe ni les données existantes).
-- Changements :
--   - prix, sites, boîtes d'envoi, envois mensuels mis à jour ;
--   - `monthly_campaigns` (campagnes lancées par mois) remplace le quota d'audits (un audit ne se
--     compte plus : il se relance seulement pour une nouvelle campagne). La colonne `monthly_audits`
--     reste en base, plus lue par le code (suppression reportée, donnée conservée) ;
--   - drapeaux d'offre : domaine d'envoi dédié (Scale seul), vérification des liens (Pro et Scale),
--     digest hebdo (tous les forfaits).
-- Migration additive puis mise à jour : aucune donnée supprimée.

alter table public.plans
  add column monthly_campaigns int not null default 0 check (monthly_campaigns >= 0),
  add column dedicated_domain boolean not null default false,
  add column link_checks boolean not null default false,
  add column weekly_digest boolean not null default true;

update public.plans set
  name = 'Gratuit', price_eur_cents = 0, monthly_send_cap = 0,
  max_sites = 1, max_mailboxes = 0, monthly_campaigns = 1,
  dedicated_domain = false, link_checks = false, weekly_digest = true, sort_order = 0
where key = 'gratuit';

update public.plans set
  name = 'Starter', price_eur_cents = 2990, monthly_send_cap = 100,
  max_sites = 1, max_mailboxes = 1, monthly_campaigns = 1,
  dedicated_domain = false, link_checks = false, weekly_digest = true, sort_order = 1
where key = 'starter';

update public.plans set
  name = 'Pro', price_eur_cents = 4990, monthly_send_cap = 300,
  max_sites = 3, max_mailboxes = 2, monthly_campaigns = 3,
  dedicated_domain = false, link_checks = true, weekly_digest = true, sort_order = 2
where key = 'pro';

update public.plans set
  name = 'Scale', price_eur_cents = 19990, monthly_send_cap = 1000,
  max_sites = 20, max_mailboxes = 10, monthly_campaigns = 20,
  dedicated_domain = true, link_checks = true, weekly_digest = true, sort_order = 3
where key = 'business';

