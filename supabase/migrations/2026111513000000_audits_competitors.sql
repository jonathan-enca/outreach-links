-- M1.3 : découverte des concurrents via la SERP.
-- Tables audits, audit_serp_results, competitors ; colonne workspaces.plan ;
-- clé étrangère cost_ledger.audit_id -> audits. Migration ADDITIVE.
-- Écriture réservée à service_role (les transitions de statut et les coûts sont
-- des faits établis par le serveur) ; lecture par les membres du workspace.

alter table public.workspaces
  add column plan text not null default 'gratuit' check (plan in ('gratuit', 'payant'));
-- Aucun droit d'écriture client sur plan : grant update (name) seulement (M0.2).

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  status text not null default 'en_attente'
    check (status in ('en_attente', 'estime', 'confirme', 'en_cours', 'termine', 'echoue')),
  plan text not null default 'gratuit' check (plan in ('gratuit', 'payant')),
  queries text[] not null check (cardinality(queries) between 1 and 3),
  max_competitors int not null check (max_competitors between 1 and 20),
  estimated_cost_usd numeric(12, 6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  cost_cap_usd numeric(12, 6) not null check (cost_cap_usd > 0),
  actual_cost_usd numeric(12, 6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  estimate_details jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  estimated_at timestamptz,
  confirmed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
create index audits_site_created_idx on public.audits (site_id, created_at desc);
create index audits_workspace_created_idx on public.audits (workspace_id, created_at desc);
-- Un seul audit "actif" par site : empêche un double lancement (donc une double dépense).
create unique index audits_one_active_per_site_idx on public.audits (site_id)
  where status in ('en_attente', 'estime', 'confirme', 'en_cours');

create function public.audits_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.audits_touch() from public, anon, authenticated;
create trigger audits_touch before update on public.audits
  for each row execute function public.audits_touch();

create table public.audit_serp_results (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  query text not null,
  rank int not null check (rank >= 1),
  domain text not null,
  url text not null,
  title text,
  unique (audit_id, query, rank)
);
create index audit_serp_results_audit_idx on public.audit_serp_results (audit_id);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  domain text not null,
  queries_count int not null check (queries_count >= 1),
  appearances int not null check (appearances >= 1),
  best_rank int not null check (best_rank >= 1),
  avg_rank numeric(6, 2) not null,
  score numeric(8, 3) not null,
  selected boolean not null default false,
  sample_url text,
  created_at timestamptz not null default now(),
  unique (audit_id, domain)
);
create index competitors_audit_score_idx on public.competitors (audit_id, score desc);

alter table public.audits enable row level security;
alter table public.audit_serp_results enable row level security;
alter table public.competitors enable row level security;

revoke all on public.audits, public.audit_serp_results, public.competitors from anon, authenticated;
grant select on public.audits, public.audit_serp_results, public.competitors to authenticated;
grant select, insert, update, delete on public.audits, public.audit_serp_results, public.competitors
  to service_role;
grant usage, select on sequence public.audit_serp_results_id_seq to service_role;

create policy audits_select on public.audits
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy audit_serp_results_select on public.audit_serp_results
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy competitors_select on public.competitors
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- cost_ledger.audit_id : la table audits existe, on ajoute la contrainte annoncée en M0.3.
-- Le coût reste conservé si l'audit est supprimé.
alter table public.cost_ledger
  add constraint cost_ledger_audit_id_fkey foreign key (audit_id)
  references public.audits (id) on delete set null;
