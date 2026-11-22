-- Paiement refusé (22/11) : date du premier refus et montant, pour prévenir la personne et mettre
-- ses envois en pause après 7 jours sans régularisation. Migration ADDITIVE.
alter table public.subscriptions
  add column if not exists payment_failed_at timestamptz,
  add column if not exists payment_failed_amount_cents integer;
