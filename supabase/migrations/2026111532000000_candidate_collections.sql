-- MT.3 : collecte de candidats (docs/audit-v2.md phase 3). Une collecte par audit (relançable : les
-- candidats sont réécrits), plan et coût annoncés figés à la confirmation, candidats BRUTS fusionnés
-- par domaine (la qualification est MT.4). Écriture réservée à service_role ; lecture par les membres.

create table public.candidate_collections (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null unique references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  status text not null default 'confirme'
    check (status in ('confirme', 'en_cours', 'termine', 'echoue')),
  -- Plan figé (requêtes, concurrents à recouper, appels Content Analysis) : coût annoncé = coût engagé.
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  expected_cost_usd numeric(12, 6) not null check (expected_cost_usd >= 0),
  worst_case_usd numeric(12, 6) not null check (worst_case_usd >= 0),
  target_usd numeric(12, 6) not null check (target_usd >= 0),
  actual_cost_usd numeric(12, 6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  -- Par phase : appels, coût, lignes, nouveaux domaines, appels servis par le cache, arrêt éventuel.
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  stop_reason text,
  error_message text,
  confirmed_by uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index candidate_collections_site_idx on public.candidate_collections (site_id, created_at desc);

create function public.candidate_collections_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.candidate_collections_touch() from public, anon, authenticated;
create trigger candidate_collections_touch before update on public.candidate_collections
  for each row execute function public.candidate_collections_touch();

create table public.collection_candidates (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.candidate_collections (id) on delete cascade,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  domain text not null check (char_length(domain) between 3 and 253),
  url text,
  title text,
  tactics text[] not null
    check (cardinality(tactics) >= 1 and tactics <@ array['inconnus', 'ressources', 'mentions']::text[]),
  -- [{ source, query, persona, rank, pageType }] : au plus quelques sources par domaine.
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  competitors_count int not null default 0 check (competitors_count >= 0),
  domain_rank numeric,
  spam_score numeric,
  page_type text,
  signal_count int not null default 1 check (signal_count >= 1),
  created_at timestamptz not null default now(),
  unique (collection_id, domain)
);
create index collection_candidates_order_idx
  on public.collection_candidates (collection_id, competitors_count desc, signal_count desc);

alter table public.candidate_collections enable row level security;
alter table public.collection_candidates enable row level security;

revoke all on public.candidate_collections, public.collection_candidates from anon, authenticated;
grant select on public.candidate_collections, public.collection_candidates to authenticated;
grant select, insert, update, delete on public.candidate_collections, public.collection_candidates
  to service_role;

create policy candidate_collections_select on public.candidate_collections
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy collection_candidates_select on public.collection_candidates
  for select to authenticated using (public.is_workspace_member(workspace_id));
