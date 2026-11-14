-- M0.3 : journal des coûts (cost_ledger). Chaque appel payant (DataForSEO, LLM,
-- recherche d'emails) y écrit une ligne via recordCost(). Écriture réservée au
-- serveur (service_role) ; lecture par les membres du workspace.
-- audit_id : pas de clé étrangère pour l'instant (la table audits arrive en M1) ;
-- la contrainte sera ajoutée par une migration additive.
-- workspace_id nul = appel système (ex. fonction health), invisible côté client.

create table public.cost_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  audit_id uuid,
  provider text not null check (char_length(provider) between 1 and 60),
  operation text not null check (char_length(operation) between 1 and 120),
  units numeric not null default 1 check (units >= 0),
  estimated_cost_usd numeric(12, 6) not null default 0 check (estimated_cost_usd >= 0),
  actual_cost_usd numeric(12, 6) check (actual_cost_usd is null or actual_cost_usd >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index cost_ledger_workspace_created_idx on public.cost_ledger (workspace_id, created_at desc);
create index cost_ledger_audit_id_idx on public.cost_ledger (audit_id) where audit_id is not null;
create index cost_ledger_provider_created_idx on public.cost_ledger (provider, created_at desc);

alter table public.cost_ledger enable row level security;

revoke all on public.cost_ledger from anon, authenticated;
grant select on public.cost_ledger to authenticated;
grant select, insert on public.cost_ledger to service_role;
grant usage, select on sequence public.cost_ledger_id_seq to service_role;

create policy cost_ledger_select on public.cost_ledger
  for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));
