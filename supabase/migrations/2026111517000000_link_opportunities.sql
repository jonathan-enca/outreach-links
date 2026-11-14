-- M2.1 : opportunités de liens (génération depuis l'écart, la SERP de marque, les pages
-- ressources, les annuaires et les cibles « jamais sollicitées »).
-- Migration ADDITIVE. Écriture réservée à service_role ; lecture par les membres du workspace.

alter table public.audits
  add column opportunities_status text not null default 'aucun'
    check (opportunities_status in ('aucun', 'confirme', 'en_cours', 'termine', 'echoue')),
  add column opportunities_limits jsonb not null default '{}'::jsonb,
  add column opportunities_estimated_cost_usd numeric(12, 6)
    check (opportunities_estimated_cost_usd is null or opportunities_estimated_cost_usd >= 0),
  add column opportunities_cost_usd numeric(12, 6)
    check (opportunities_cost_usd is null or opportunities_cost_usd >= 0),
  add column opportunities_stats jsonb not null default '{}'::jsonb,
  add column opportunities_error text,
  add column opportunities_started_at timestamptz,
  add column opportunities_finished_at timestamptz;

create table public.link_opportunities (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  -- "lien_mort" est réservé au sous-jalon 2.2.
  type text not null
    check (type in ('ecart_domaines', 'mention_marque', 'page_ressources', 'jamais_sollicite', 'annuaire', 'lien_mort')),
  source_domain text not null,
  source_url text,
  source_title text,
  -- Page du site à promouvoir (toujours renseignée).
  target_page_url text not null,
  -- Nature attendue du lien et de ce qui est offert en échange (codes, libellés côté interface).
  expected_link_type text not null
    check (expected_link_type in ('editorial', 'ressource', 'mention_a_lier', 'annuaire', 'reprise_lien_mort')),
  offer text,
  -- Pourquoi cette cible (court, lisible) et requête d'origine.
  rationale text not null,
  origin_query text,
  priority_score int not null check (priority_score between 0 and 100),
  priority text not null check (priority in ('haute', 'moyenne', 'basse')),
  status text not null default 'nouveau' check (status in ('nouveau', 'retenu', 'ecarte')),
  created_at timestamptz not null default now(),
  unique (audit_id, source_domain)
);
create index link_opportunities_audit_idx on public.link_opportunities (audit_id, priority_score desc);
create index link_opportunities_site_idx on public.link_opportunities (site_id);

alter table public.link_opportunities enable row level security;
revoke all on public.link_opportunities from anon, authenticated;
grant select on public.link_opportunities to authenticated;
grant select, insert, update, delete on public.link_opportunities to service_role;

create policy link_opportunities_select on public.link_opportunities
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
