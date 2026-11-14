-- M1.4 : backlinks des concurrents et nettoyage. Migration ADDITIVE.
-- Écriture réservée à service_role ; lecture par les membres du workspace.

alter table public.audits
  add column backlinks_status text not null default 'aucun'
    check (backlinks_status in ('aucun', 'confirme', 'en_cours', 'termine', 'echoue')),
  add column backlinks_limit int check (backlinks_limit is null or backlinks_limit between 1 and 1000),
  add column backlinks_estimated_cost_usd numeric(12, 6)
    check (backlinks_estimated_cost_usd is null or backlinks_estimated_cost_usd >= 0),
  add column backlinks_cost_usd numeric(12, 6)
    check (backlinks_cost_usd is null or backlinks_cost_usd >= 0),
  add column backlinks_stats jsonb not null default '{}'::jsonb,
  add column backlinks_error text,
  add column backlinks_started_at timestamptz,
  add column backlinks_finished_at timestamptz;

create table public.competitor_backlinks (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  source_domain text not null,
  source_url text not null,
  target_url text,
  anchor text,
  item_type text,
  dofollow boolean,
  is_broken boolean,
  spam_score int check (spam_score is null or spam_score between 0 and 100),
  source_rank int,
  first_seen timestamptz,
  last_seen timestamptz,
  -- Résultat du nettoyage : "garde" ou "exclu", avec les motifs lisibles (codes).
  clean_status text not null default 'garde' check (clean_status in ('garde', 'exclu')),
  exclusion_reasons text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index competitor_backlinks_audit_status_idx
  on public.competitor_backlinks (audit_id, clean_status);
create index competitor_backlinks_competitor_idx on public.competitor_backlinks (competitor_id);

alter table public.competitor_backlinks enable row level security;
revoke all on public.competitor_backlinks from anon, authenticated;
grant select on public.competitor_backlinks to authenticated;
grant select, insert, update, delete on public.competitor_backlinks to service_role;
grant usage, select on sequence public.competitor_backlinks_id_seq to service_role;

create policy competitor_backlinks_select on public.competitor_backlinks
  for select to authenticated using (public.is_workspace_member(workspace_id));
