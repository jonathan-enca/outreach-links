-- MT.5 : constats par page (liens morts constatés, liens inadaptés, mentions de marque sans lien) pour
-- les cibles de la liste courte de la qualification (MT.4). Une exécution par audit (relançable : les
-- constats sont réécrits), coût annoncé figé à la confirmation, un constat par cible et par sorte.
-- Écriture réservée à service_role ; lecture par les membres de l'espace.

create table public.findings_runs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null unique references public.audits (id) on delete cascade,
  qualification_run_id uuid not null references public.qualification_runs (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  status text not null default 'confirme'
    check (status in ('confirme', 'en_cours', 'termine', 'echoue')),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  expected_cost_usd numeric(12, 6) not null check (expected_cost_usd >= 0),
  worst_case_usd numeric(12, 6) not null check (worst_case_usd >= 0),
  budget_usd numeric(12, 6) not null check (budget_usd >= 0),
  actual_cost_usd numeric(12, 6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  stop_reason text check (stop_reason is null or stop_reason in ('termine', 'budget', 'plafond')),
  error_message text,
  confirmed_by uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint findings_worst_within_budget check (worst_case_usd <= budget_usd + 0.000001)
);
create index findings_runs_site_idx on public.findings_runs (site_id, created_at desc);

create trigger findings_runs_touch before update on public.findings_runs
  for each row execute function public.candidate_collections_touch();

create table public.target_findings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.findings_runs (id) on delete cascade,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Une nouvelle qualification réécrit `qualified_targets` : les constats de l'ancienne disparaissent.
  target_id uuid not null references public.qualified_targets (id) on delete cascade,
  domain text not null check (char_length(domain) between 3 and 253),
  kind text not null check (kind in ('lien_mort', 'lien_inadapte', 'mention_sans_lien')),
  page_url text not null,
  -- Citation EXACTE de la page (phrase de la mention, du lien ou du passage).
  quote text not null check (char_length(quote) between 1 and 600),
  link_url text,
  http_status int check (http_status is null or http_status in (404, 410)),
  anchor text,
  resource_url text not null,
  resource_title text not null,
  replacement_how text not null check (replacement_how in ('recoupement', 'jugement', 'accueil')),
  proposed_sentence text,
  reason text not null,
  request_lines text[] not null check (cardinality(request_lines) = 3),
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  created_at timestamptz not null default now(),
  unique (run_id, target_id, kind),
  constraint finding_dead_has_proof check (
    kind <> 'lien_mort' or (link_url is not null and http_status is not null)),
  constraint finding_unsuited_has_link check (
    kind <> 'lien_inadapte' or (link_url is not null and http_status is null)),
  constraint finding_mention_has_sentence check (
    kind <> 'mention_sans_lien'
    or (link_url is null and http_status is null and anchor is not null and proposed_sentence is not null))
);
create index target_findings_audit_idx on public.target_findings (audit_id, kind);

alter table public.findings_runs enable row level security;
alter table public.target_findings enable row level security;

revoke all on public.findings_runs, public.target_findings from anon, authenticated;
grant select on public.findings_runs, public.target_findings to authenticated;
grant select, insert, update, delete on public.findings_runs, public.target_findings to service_role;

create policy findings_runs_select on public.findings_runs
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy target_findings_select on public.target_findings
  for select to authenticated using (public.is_workspace_member(workspace_id));
