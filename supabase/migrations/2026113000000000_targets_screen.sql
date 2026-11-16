-- MT.6 : écran « Vos cibles ». Migration ADDITIVE.
-- 1. `sites.founder_role` : comment l'utilisateur se présente aux éditeurs. Jamais supposé : tant que la
--    réponse est nulle, aucune demande n'est validée (une présentation fausse serait un mensonge).
-- 2. `plan_item_briefs` : le brief du rédacteur (point précis cité, ressource, ancre, présentation) d'un
--    élément de plan créé depuis la liste courte (« Valider ces demandes »).

alter table public.sites
  add column founder_role text check (founder_role is null or founder_role in ('fondateur', 'equipe', 'agence')),
  add column founder_confirmed_at timestamptz;

-- Droits par colonne (voir M1.2) : l'utilisateur déclare lui-même sa présentation.
grant update (founder_role, founder_confirmed_at) on public.sites to authenticated;

create table public.plan_item_briefs (
  plan_item_id uuid primary key references public.link_plan_items (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  target_id uuid references public.qualified_targets (id) on delete set null,
  finding_id uuid references public.target_findings (id) on delete set null,
  kind text not null check (kind in (
    'lien_mort', 'lien_inadapte', 'mention_sans_lien', 'site_non_sollicite', 'page_ressources')),
  -- Citation EXACTE de la page de la cible (le point précis par lequel le message s'ouvre).
  quote text,
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  request_lines text[] not null check (cardinality(request_lines) = 3),
  presentation text not null check (presentation in ('fondateur', 'equipe', 'agence')),
  created_at timestamptz not null default now()
);
create index plan_item_briefs_plan_idx on public.plan_item_briefs (plan_id);

alter table public.plan_item_briefs enable row level security;
revoke all on public.plan_item_briefs from anon, authenticated, service_role;
grant select on public.plan_item_briefs to authenticated;
grant select, insert, update on public.plan_item_briefs to service_role;
create policy plan_item_briefs_select on public.plan_item_briefs
  for select to authenticated using (public.is_workspace_member(workspace_id));
