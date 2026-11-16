-- MT.4 : qualification en entonnoir (docs/audit-v2.md phase 4). Une qualification par audit
-- (relançable : les résultats sont réécrits), coût annoncé figé à la confirmation, un résultat par
-- candidat de la collecte (retenu, en réserve ou exclu avec l'étage et le motif). Écriture réservée à
-- service_role ; lecture par les membres de l'espace.

create table public.qualification_runs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null unique references public.audits (id) on delete cascade,
  collection_id uuid not null references public.candidate_collections (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  status text not null default 'confirme'
    check (status in ('confirme', 'en_cours', 'termine', 'echoue')),
  -- Limites et modèle figés à la confirmation : coût annoncé = coût engagé.
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  expected_cost_usd numeric(12, 6) not null check (expected_cost_usd >= 0),
  worst_case_usd numeric(12, 6) not null check (worst_case_usd >= 0),
  budget_usd numeric(12, 6) not null check (budget_usd >= 0),
  actual_cost_usd numeric(12, 6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  -- Comptes de l'entonnoir par étage, motifs, mesure de l'autorité.
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  stop_reason text check (stop_reason is null or stop_reason in ('termine', 'budget', 'plafond')),
  error_message text,
  confirmed_by uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint qualification_worst_within_budget check (worst_case_usd <= budget_usd + 0.000001)
);
create index qualification_runs_site_idx on public.qualification_runs (site_id, created_at desc);

create trigger qualification_runs_touch before update on public.qualification_runs
  for each row execute function public.candidate_collections_touch();

create table public.qualified_targets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.qualification_runs (id) on delete cascade,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  domain text not null check (char_length(domain) between 3 and 253),
  url text,
  tactics text[] not null
    check (cardinality(tactics) >= 1 and tactics <@ array['inconnus', 'ressources', 'mentions']::text[]),
  status text not null check (status in ('liste_courte', 'reserve', 'exclu')),
  stage_reached int not null check (stage_reached between 1 and 6),
  exclusion_reason text,
  exclusion_detail text,
  provisional_score numeric not null default 0,
  platform_hosted boolean not null default false,
  domain_rank numeric,
  competitors_count int not null default 0 check (competitors_count >= 0),
  -- Étage 3 : instantané compact de la page lue (titre, extrait, signaux d'éditeur).
  page jsonb,
  -- Étage 4 : type de site, adéquation, vendeur de liens, citation vérifiée.
  site_type text check (site_type is null or site_type in (
    'mairie', 'association', 'ecole', 'photographe', 'ecommerce', 'forum_modere', 'blog', 'media',
    'annuaire', 'autre')),
  fit numeric check (fit is null or (fit >= 0 and fit <= 1)),
  judgement jsonb,
  hook text,
  -- Étage 5 : contact (M3.2).
  contact_status text,
  contact_email text,
  contact_url text,
  form_url text,
  sendable boolean not null default false,
  -- Étage 6.
  score numeric,
  score_parts jsonb,
  rank int check (rank is null or rank >= 1),
  request_lines text[],
  why text,
  created_at timestamptz not null default now(),
  unique (run_id, domain),
  constraint qualified_exclu_has_reason check (status <> 'exclu' or exclusion_reason is not null),
  constraint qualified_short_has_request check (
    status <> 'liste_courte' or (rank is not null and score is not null and cardinality(request_lines) = 3
      and why is not null and contact_status in ('email_verifie', 'email_a_verifier', 'formulaire'))),
  constraint qualified_rank_only_short check (rank is null or status = 'liste_courte')
);
create index qualified_targets_rank_idx on public.qualified_targets (run_id, status, rank);

alter table public.qualification_runs enable row level security;
alter table public.qualified_targets enable row level security;

revoke all on public.qualification_runs, public.qualified_targets from anon, authenticated;
grant select on public.qualification_runs, public.qualified_targets to authenticated;
grant select, insert, update, delete on public.qualification_runs, public.qualified_targets
  to service_role;

create policy qualification_runs_select on public.qualification_runs
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy qualified_targets_select on public.qualified_targets
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Domaines contactés RÉELLEMENT (hors simulation) par un AUTRE espace dans la fenêtre donnée, parmi
-- une liste. Ne révèle ni qui ni quand : seulement le domaine. Réservé au serveur (service_role).
create function public.domains_contacted_elsewhere(
  p_workspace uuid,
  p_domains text[],
  p_days int default 90
) returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct d.domain
  from (
    select regexp_replace(lower(i.source_domain), '^www\.', '') as domain
    from public.sent_messages s
    join public.target_drafts t on t.id = s.draft_id
    join public.link_plan_items i on i.id = t.plan_item_id
    where s.workspace_id <> p_workspace
      and s.dry_run = false
      and s.status = 'envoye'
      and s.sent_at > now() - make_interval(days => greatest(p_days, 1))
    union
    select regexp_replace(lower(split_part(s.to_email, '@', 2)), '^www\.', '')
    from public.sent_messages s
    where s.workspace_id <> p_workspace
      and s.dry_run = false
      and s.status = 'envoye'
      and s.sent_at > now() - make_interval(days => greatest(p_days, 1))
  ) d
  where d.domain = any (select regexp_replace(lower(x), '^www\.', '') from unnest(p_domains) x);
$$;
revoke all on function public.domains_contacted_elsewhere(uuid, text[], int) from public, anon, authenticated;
grant execute on function public.domains_contacted_elsewhere(uuid, text[], int) to service_role;
