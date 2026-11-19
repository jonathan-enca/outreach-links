-- Abonnement annuel : 20 % de remise sur 12 mois, prix exact (décision du 19/11/2026, sans arrondi).
-- Starter 29,90 € x 12 x 0,8 = 287,04 € ; Pro 49,90 € x 12 x 0,8 = 479,04 € ; Scale 199,90 € x 12 x 0,8 = 1 919,04 €.
alter table public.plans
  add column price_annual_eur_cents int not null default 0 check (price_annual_eur_cents >= 0);

update public.plans set price_annual_eur_cents = 0 where key = 'gratuit';
update public.plans set price_annual_eur_cents = 28704 where key = 'starter';
update public.plans set price_annual_eur_cents = 47904 where key = 'pro';
update public.plans set price_annual_eur_cents = 191904 where key = 'business';
