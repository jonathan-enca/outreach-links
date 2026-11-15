-- M3.2 : enquêteur (contacts des cibles triées « ok »). Migration ADDITIVE.
-- Règle d'or : un email n'est « envoyable » que s'il a été vérifié valide par un vérificateur.

-- Liste de suppression (désinscriptions, « ne pas contacter ») : par workspace, ou globale
-- (workspace_id nul, écrite par le serveur). Un email OU un domaine.
create table public.suppressions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  email text,
  domain text,
  reason text not null default 'ne_pas_contacter',
  created_at timestamptz not null default now(),
  constraint suppressions_email_or_domain check (email is not null or domain is not null)
);
create unique index suppressions_ws_email_idx
  on public.suppressions (coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(email))
  where email is not null;
create unique index suppressions_ws_domain_idx
  on public.suppressions (coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(domain))
  where domain is not null;

create table public.contact_runs (
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

create table public.target_contacts (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null unique references public.link_plan_items (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  status text not null check (status in (
    'email_verifie', 'email_a_verifier', 'email_invalide', 'formulaire', 'introuvable', 'supprime')),
  email text,
  email_source text check (email_source is null or email_source in ('page', 'finder')),
  verification text not null default 'non_verifie'
    check (verification in ('valide', 'invalide', 'risque', 'inconnu', 'non_verifie')),
  verifier text,
  contact_url text,
  form_url text,
  reason text not null,
  sendable boolean not null default false,
  cost_usd numeric(10, 6) not null default 0,
  assessed_at timestamptz not null default now(),
  -- Aucun email non vérifié n'est envoyable.
  constraint target_contacts_sendable_needs_valid
    check (not sendable or (email is not null and verification = 'valide' and status = 'email_verifie')),
  constraint target_contacts_verified_is_sendable
    check ((status = 'email_verifie') = sendable)
);
create index target_contacts_plan_idx on public.target_contacts (plan_id);

-- Tâches manuelles : formulaires de contact à remplir par l'utilisateur (jamais automatisés).
create table public.manual_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null unique references public.link_plan_items (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null default 'formulaire' check (type in ('formulaire')),
  form_url text not null,
  -- Message pré-rédigé : rempli par M3.3.
  message text,
  status text not null default 'a_faire' check (status in ('a_faire', 'fait', 'ignoree')),
  created_at timestamptz not null default now()
);
create index manual_tasks_plan_idx on public.manual_tasks (plan_id);

alter table public.suppressions enable row level security;
alter table public.contact_runs enable row level security;
alter table public.target_contacts enable row level security;
alter table public.manual_tasks enable row level security;
revoke all on public.suppressions, public.contact_runs, public.target_contacts, public.manual_tasks
  from anon, authenticated, service_role;
grant select on public.suppressions, public.contact_runs, public.target_contacts, public.manual_tasks
  to authenticated;
-- Écriture réservée au serveur ; pas de delete (relance = update).
grant select, insert, update on public.contact_runs, public.target_contacts, public.manual_tasks
  to service_role;
grant select, insert on public.suppressions to service_role;

create policy suppressions_select on public.suppressions
  for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));
create policy contact_runs_select on public.contact_runs
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy target_contacts_select on public.target_contacts
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy manual_tasks_select on public.manual_tasks
  for select to authenticated using (public.is_workspace_member(workspace_id));
