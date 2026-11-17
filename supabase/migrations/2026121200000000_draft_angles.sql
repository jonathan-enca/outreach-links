-- Rédaction avec recherche d'angle (17/11/2026). Migration ADDITIVE.
-- 1. Catalogue des pages précises du site à promouvoir (le rédacteur y choisit la page à proposer).
-- 2. Cibles écartées faute de raison honnête de demander un lien : décision gardée, jamais rejouée.

create table public.site_pages (
  site_id uuid not null references public.sites (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  url text not null,
  title text not null default '',
  description text not null default '',
  -- Contenu éditorial de la page (plafonné à la lecture).
  content text not null default '',
  read_at timestamptz not null default now(),
  primary key (site_id, url)
);

create table public.draft_declines (
  plan_item_id uuid primary key references public.link_plan_items (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Motif lisible par l'utilisateur.
  reason text not null,
  -- Qui a écarté la cible : le tri (petit modèle) ou le rédacteur (modèle fort).
  declined_by text not null check (declined_by in ('tri', 'redacteur', 'lecture')),
  page_url text,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index draft_declines_plan_idx on public.draft_declines (plan_id);

alter table public.site_pages enable row level security;
alter table public.draft_declines enable row level security;
revoke all on public.site_pages, public.draft_declines from anon, authenticated, service_role;
grant select on public.site_pages, public.draft_declines to authenticated;
grant select, insert, update, delete on public.site_pages to service_role;
grant select, insert, update on public.draft_declines to service_role;

create policy site_pages_select on public.site_pages
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy draft_declines_select on public.draft_declines
  for select to authenticated using (public.is_workspace_member(workspace_id));
