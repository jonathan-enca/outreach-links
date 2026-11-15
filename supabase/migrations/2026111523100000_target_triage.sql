-- M3.1 : tri des cibles du plan validé. Migration ADDITIVE.
-- Le plan (link_plan_items) reste immuable : le verdict vit dans une table à part.
create table public.link_plan_triage_runs (
  plan_id uuid primary key references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  status text not null check (status in ('en_cours', 'termine', 'echoue')),
  error_message text,
  requested_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  cost_usd numeric(10, 6) not null default 0
);

create table public.link_target_triage (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null unique references public.link_plan_items (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  verdict text not null check (verdict in (
    'ok', 'payant', 'mort', 'pirate', 'hors_sujet', 'compte_obligatoire',
    'concurrent_direct', 'irrealiste', 'non_verifiable')),
  reason text not null,
  confidence numeric(3, 2) check (confidence is null or confidence between 0 and 1),
  needs_review boolean not null default false,
  source text not null check (source in ('regles', 'llm')),
  -- URL réellement lue en HTTP 200 (jamais l'URL partielle d'une redirection Google).
  resolved_url text,
  url_status int,
  url_origin text check (url_origin is null or url_origin in ('plan', 'recherche', 'accueil')),
  hook text,
  page_title text,
  cost_usd numeric(10, 6) not null default 0,
  assessed_at timestamptz not null default now(),
  -- Un `ok` exige une page lue en HTTP 200.
  constraint link_target_triage_ok_needs_200
    check (verdict <> 'ok' or (resolved_url is not null and url_status = 200))
);
create index link_target_triage_plan_idx on public.link_target_triage (plan_id);

alter table public.link_plan_triage_runs enable row level security;
alter table public.link_target_triage enable row level security;
revoke all on public.link_plan_triage_runs, public.link_target_triage from anon, authenticated;
grant select on public.link_plan_triage_runs, public.link_target_triage to authenticated;
-- Écriture réservée au serveur ; pas de delete (relance = update).
revoke all on public.link_plan_triage_runs, public.link_target_triage from service_role;
grant select, insert, update on public.link_plan_triage_runs, public.link_target_triage to service_role;

create policy link_plan_triage_runs_select on public.link_plan_triage_runs
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy link_target_triage_select on public.link_target_triage
  for select to authenticated using (public.is_workspace_member(workspace_id));
