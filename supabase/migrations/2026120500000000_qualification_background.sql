-- Étape 1 de l'arrière-plan (17/11/2026) : après la première liste, la réserve de sites se lit toute
-- seule, lot par lot. Un seul lot à la fois (more_status), compteurs rejouables (compare-and-set sur
-- auto_lots), raison d'arrêt gardée pour l'écran.
alter table public.qualification_runs
  add column if not exists auto_status text not null default 'aucun'
    check (auto_status in ('aucun', 'en_cours', 'termine', 'echoue')),
  add column if not exists auto_started_at timestamptz,
  add column if not exists auto_lots integer not null default 0 check (auto_lots >= 0),
  add column if not exists auto_low_streak integer not null default 0 check (auto_low_streak >= 0),
  add column if not exists auto_added integer not null default 0 check (auto_added >= 0),
  add column if not exists auto_cost_usd numeric not null default 0 check (auto_cost_usd >= 0),
  add column if not exists auto_stop text
    check (auto_stop is null or auto_stop in ('reserve_epuisee', 'budget', 'rendement_faible', 'duree', 'erreur'));
