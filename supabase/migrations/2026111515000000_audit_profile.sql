-- M1.5 : profil de liens du site, écart de domaines référents et diagnostic par page.
-- Migration ADDITIVE. Écriture réservée à service_role ; lecture par les membres du workspace.

alter table public.audits
  add column profile_status text not null default 'aucun'
    check (profile_status in ('aucun', 'confirme', 'en_cours', 'termine', 'echoue')),
  -- Limites figées à la confirmation (lignes demandées par appel, pages techniques, etc.).
  add column profile_limits jsonb not null default '{}'::jsonb,
  add column profile_estimated_cost_usd numeric(12, 6)
    check (profile_estimated_cost_usd is null or profile_estimated_cost_usd >= 0),
  add column profile_cost_usd numeric(12, 6)
    check (profile_cost_usd is null or profile_cost_usd >= 0),
  -- Profil de liens (totaux, ancres, dofollow), repères concurrents, compteurs de l'écart.
  add column profile_data jsonb not null default '{}'::jsonb,
  add column profile_summary text,
  add column profile_summary_source text
    check (profile_summary_source is null or profile_summary_source in ('llm', 'modele')),
  add column profile_summary_model text,
  add column profile_error text,
  add column profile_started_at timestamptz,
  add column profile_finished_at timestamptz;

-- Une ligne par page du site (URL) pour un audit.
create table public.audit_pages (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  url text not null,
  -- Mots-clés classés (les plus utiles) : [{ keyword, position, volume }].
  keywords_json jsonb not null default '[]'::jsonb,
  keywords_count int not null default 0 check (keywords_count >= 0),
  total_volume int not null default 0 check (total_volume >= 0),
  avg_position numeric(6, 2),
  best_position int,
  -- Domaines référents de la page observés dans l'échantillon de backlinks (borne basse).
  referring_domains int check (referring_domains is null or referring_domains >= 0),
  -- Ordre de grandeur (jamais une promesse) : fourchette et valeur centrale.
  required_domains_estimated int check (required_domains_estimated is null or required_domains_estimated >= 0),
  required_domains_low int check (required_domains_low is null or required_domains_low >= 0),
  required_domains_high int check (required_domains_high is null or required_domains_high >= 0),
  -- Page en positions 4 à 20 à fort volume : candidate à pousser.
  is_priority boolean not null default false,
  priority_score numeric(14, 2) not null default 0,
  priority_rank int,
  -- Contrôle technique OnPage minimal.
  tech_status text not null default 'non_verifie'
    check (tech_status in ('ok', 'attention', 'probleme', 'non_verifie')),
  tech_issues text[] not null default '{}',
  http_status int,
  onpage_score numeric(5, 2),
  created_at timestamptz not null default now(),
  unique (audit_id, url)
);
create index audit_pages_audit_priority_idx on public.audit_pages (audit_id, is_priority, priority_rank);

-- Écart : domaines qui citent des concurrents mais pas le site.
create table public.audit_gap_domains (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  domain text not null,
  competitors_count int not null check (competitors_count >= 1),
  competitors text[] not null default '{}',
  best_rank int,
  min_spam_score int,
  dofollow boolean,
  sample_url text,
  sample_anchor text,
  created_at timestamptz not null default now(),
  unique (audit_id, domain)
);
create index audit_gap_domains_audit_idx on public.audit_gap_domains (audit_id, competitors_count desc);

alter table public.audit_pages enable row level security;
alter table public.audit_gap_domains enable row level security;
revoke all on public.audit_pages, public.audit_gap_domains from anon, authenticated;
grant select on public.audit_pages, public.audit_gap_domains to authenticated;
grant select, insert, update, delete on public.audit_pages, public.audit_gap_domains to service_role;
grant usage, select on sequence public.audit_pages_id_seq, public.audit_gap_domains_id_seq to service_role;

create policy audit_pages_select on public.audit_pages
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy audit_gap_domains_select on public.audit_gap_domains
  for select to authenticated using (public.is_workspace_member(workspace_id));
