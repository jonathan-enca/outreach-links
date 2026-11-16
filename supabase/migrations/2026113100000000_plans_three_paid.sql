-- Tarifs (décision de Jonathan, 16/11/2026) : trois offres payantes à 19,90 / 39,90 / 99,90 € par mois.
-- Migration ADDITIVE : nouvelle offre `business`, nouvelle colonne `monthly_audits` (audits complets
-- par mois), puis mise à jour du catalogue. `gratuit` reste l'état sans abonnement (aucun envoi).
-- Les plafonds par offre sont une PROPOSITION (PROGRESS.md) : ils se changent ici, par simple update.
alter table public.plans drop constraint plans_key_check;
alter table public.plans
  add constraint plans_key_check check (key in ('gratuit', 'starter', 'pro', 'business'));
alter table public.plans
  add column monthly_audits int not null default 0 check (monthly_audits >= 0);

update public.plans
set price_eur_cents = 1990, monthly_send_cap = 100, monthly_credits = 100,
    max_sites = 1, max_mailboxes = 1, monthly_audits = 1
where key = 'starter';
update public.plans
set price_eur_cents = 3990, monthly_send_cap = 300, monthly_credits = 300,
    max_sites = 3, max_mailboxes = 2, monthly_audits = 3
where key = 'pro';
insert into public.plans
  (key, name, price_eur_cents, monthly_send_cap, monthly_credits, max_sites, max_mailboxes, monthly_audits, sort_order)
values ('business', 'Business', 9990, 1000, 1000, 10, 5, 10, 4);
