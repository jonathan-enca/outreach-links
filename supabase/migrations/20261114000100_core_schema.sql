-- M0.2 : schéma de base (workspaces, memberships, sites, events) + RLS.
-- Règle : toute table liée à un utilisateur a la RLS activée, et aucune
-- policy ne laisse lire ou écrire hors des workspaces de l'utilisateur.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  domain text not null check (char_length(domain) between 3 and 253),
  niche text,
  country text,
  language text not null default 'fr',
  signature_first_name text,
  offered_asset text,
  categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (workspace_id, domain)
);
create index sites_workspace_id_idx on public.sites (workspace_id);

create table public.events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null check (char_length(type) between 1 and 120),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_workspace_id_created_at_idx on public.events (workspace_id, created_at desc);

-- Fonctions d'appartenance. SECURITY DEFINER pour éviter la récursion de RLS
-- sur memberships ; search_path vide pour éviter le détournement de schéma.
create function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create function public.has_workspace_role(ws uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.workspace_id = ws and m.user_id = (select auth.uid()) and m.role = any (roles)
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
revoke all on function public.has_workspace_role(uuid, text[]) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

-- RLS
alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.sites enable row level security;
alter table public.events enable row level security;

-- Privilèges : rien pour anon ; le strict nécessaire pour authenticated.
revoke all on public.workspaces, public.memberships, public.sites, public.events from anon, authenticated;
grant select, update (name) on public.workspaces to authenticated;
grant select on public.memberships to authenticated;
grant select, insert, update, delete on public.sites to authenticated;
grant select, insert on public.events to authenticated;

-- workspaces : lecture pour les membres ; renommage pour owner/admin.
-- Création par le trigger d'inscription uniquement (pas d'insert client).
create policy workspaces_select on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_update on public.workspaces
  for update to authenticated
  using (public.has_workspace_role(id, array['owner', 'admin']))
  with check (public.has_workspace_role(id, array['owner', 'admin']));

-- memberships : un membre voit les membres de ses workspaces. Aucune écriture
-- côté client dans ce jalon (invitations : plus tard).
create policy memberships_select on public.memberships
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- sites : tout membre lit et gère les sites de son workspace.
create policy sites_select on public.sites
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy sites_insert on public.sites
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy sites_update on public.sites
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy sites_delete on public.sites
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- events : journal en ajout seul (ni update ni delete). L'acteur est l'utilisateur courant.
create policy events_select on public.events
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and actor_id = (select auth.uid()));

-- Inscription : un workspace personnel + membership owner, automatiquement.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_id uuid;
  ws_name text;
begin
  ws_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Mon espace');
  insert into public.workspaces (name, created_by) values (ws_name, new.id) returning id into ws_id;
  insert into public.memberships (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  insert into public.events (workspace_id, actor_id, type, payload)
    values (ws_id, new.id, 'workspace.created', jsonb_build_object('source', 'signup'));
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
