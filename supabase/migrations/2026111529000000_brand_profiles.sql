-- MT.1 : profil de marque, versionné. Migration ADDITIVE.
-- Une ligne = une version immuable du profil d'un site (activité, offre, public, ressources
-- liables, variantes du nom, personas de donneurs de liens). Une correction de l'utilisateur
-- crée une nouvelle version ; la dernière version fait foi. Le contenu (`profile`) est validé
-- côté application (zod) ; la base garantit l'appartenance, l'unicité de la version et l'immuabilité.
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  version int not null check (version > 0),
  source text not null check (source in ('llm', 'utilisateur')),
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  -- Pages réellement lues pour produire cette version : [{ url, title }].
  pages_read jsonb not null default '[]'::jsonb check (jsonb_typeof(pages_read) = 'array'),
  cost_usd numeric(10, 6) not null default 0 check (cost_usd >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (site_id, version)
);
create index brand_profiles_site_idx on public.brand_profiles (site_id, version desc);

alter table public.brand_profiles enable row level security;
revoke all on public.brand_profiles from anon, authenticated, service_role;
-- Immuable : ni update ni delete (les suppressions passent par la cascade du site).
grant select, insert on public.brand_profiles to authenticated, service_role;

create policy brand_profiles_select on public.brand_profiles
  for select to authenticated using (public.is_workspace_member(workspace_id));
-- Insertion : membre de l'espace, et le site appartient bien à cet espace.
create policy brand_profiles_insert on public.brand_profiles
  for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.sites s
      where s.id = brand_profiles.site_id and s.workspace_id = brand_profiles.workspace_id
    )
  );
