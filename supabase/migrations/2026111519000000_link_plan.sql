-- M2.3 : plan de liens validé, figé et versionné. Migration ADDITIVE.
-- Sélection et ordre se règlent sur link_opportunities (status retenu/ecarte + position) ;
-- « Valider le plan » copie les opportunités retenues dans un instantané immuable.
alter table public.link_opportunities
  add column plan_position int check (plan_position is null or plan_position > 0);

create table public.link_plans (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  version int not null check (version > 0),
  item_count int not null check (item_count > 0),
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz not null default now(),
  unique (audit_id, version)
);
create index link_plans_audit_idx on public.link_plans (audit_id, version desc);

create table public.link_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Référence souple : l'instantané reste valable si l'opportunité est régénérée.
  opportunity_id uuid,
  position int not null check (position > 0),
  type text not null,
  source_domain text not null,
  source_url text,
  target_page_url text not null,
  anchor_kind text not null check (anchor_kind in ('marque', 'url', 'descriptive', 'generique')),
  anchor_text text not null,
  expected_link_type text not null,
  offer text,
  rationale text not null,
  priority text not null check (priority in ('haute', 'moyenne', 'basse')),
  priority_score int not null check (priority_score between 0 and 100),
  broken_url text,
  unique (plan_id, position)
);
create index link_plan_items_plan_idx on public.link_plan_items (plan_id, position);

alter table public.link_plans enable row level security;
alter table public.link_plan_items enable row level security;
revoke all on public.link_plans, public.link_plan_items from anon, authenticated;
grant select on public.link_plans, public.link_plan_items to authenticated;
-- Figé : service_role n'a PAS update/delete (les suppressions en cascade passent par le propriétaire).
revoke all on public.link_plans, public.link_plan_items from service_role;
grant select, insert on public.link_plans, public.link_plan_items to service_role;

create policy link_plans_select on public.link_plans
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy link_plan_items_select on public.link_plan_items
  for select to authenticated using (public.is_workspace_member(workspace_id));
