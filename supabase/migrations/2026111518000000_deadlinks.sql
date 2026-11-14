-- M2.2 : chasseur 404 (liens morts). Migration ADDITIVE.
-- Étape gratuite (aucun appel payant) : on vérifie en HTTP des URL déjà connues.
alter table public.audits
  add column deadlinks_status text not null default 'aucun'
    check (deadlinks_status in ('aucun', 'en_cours', 'termine', 'echoue')),
  add column deadlinks_stats jsonb not null default '{}'::jsonb,
  add column deadlinks_error text,
  add column deadlinks_started_at timestamptz,
  add column deadlinks_finished_at timestamptz;

-- Preuve du lien mort : URL cassée, statut HTTP constaté (404 ou 410 seulement) et date.
alter table public.link_opportunities
  add column broken_url text,
  add column broken_http_status int,
  add column broken_checked_at timestamptz,
  add constraint link_opportunities_dead_proof check (
    type <> 'lien_mort'
    or (broken_url is not null and broken_http_status in (404, 410) and broken_checked_at is not null)
  );
