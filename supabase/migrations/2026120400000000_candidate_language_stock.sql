-- Chantier G (17/11/2026) : filtre avant lecture et stock de candidats.
-- `language` : langue de la page selon le fournisseur, quand il la donne (liens morts des concurrents,
-- Content Analysis). Sert à écarter AVANT lecture une page dans une autre langue que la campagne.
alter table public.collection_candidates add column if not exists language text;

-- Lecture d'un lot supplémentaire du stock (« Lire d'autres sites ») : état de la demande en cours.
alter table public.qualification_runs
  add column if not exists more_status text not null default 'aucun'
    check (more_status in ('aucun', 'demande', 'en_cours', 'termine', 'echoue')),
  add column if not exists more_requested_at timestamptz,
  add column if not exists more_stats jsonb not null default '{}'::jsonb;
