-- MT.2b : univers de requêtes par persona et par tactique. Migration ADDITIVE.
--
-- 1. query_recipes : cache PARTAGÉ entre clients (niche + langue + persona + version de recette).
--    Table système : lue et écrite par service_role uniquement (aucune policy cliente), comme
--    dataforseo_cache. Ne contient aucune donnée de client, seulement des requêtes génériques.
-- 2. query_universes : univers classé d'un site à un instant donné (une ligne = une génération,
--    immuable, la plus récente fait foi). Lu ensuite par la collecte de candidats (MT.3).
create table public.query_recipes (
  id uuid primary key default gen_random_uuid(),
  niche_key text not null check (char_length(niche_key) between 2 and 120),
  language text not null check (language in ('fr', 'en')),
  persona_key text not null check (char_length(persona_key) between 2 and 120),
  recipe_version int not null check (recipe_version > 0),
  persona_label text not null check (char_length(persona_label) between 2 and 160),
  queries jsonb not null check (jsonb_typeof(queries) = 'array'),
  cost_usd numeric(10, 6) not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  unique (niche_key, language, persona_key, recipe_version)
);
alter table public.query_recipes enable row level security;
revoke all on public.query_recipes from anon, authenticated, service_role;
grant select, insert on public.query_recipes to service_role;

create table public.query_universes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  brand_profile_version int check (brand_profile_version is null or brand_profile_version > 0),
  goal text not null check (goal in ('autorite_generale', 'mots_cles')),
  budget_usd numeric(10, 6) not null check (budget_usd >= 0),
  est_cost_usd numeric(10, 6) not null check (est_cost_usd >= 0),
  llm_cost_usd numeric(10, 6) not null default 0 check (llm_cost_usd >= 0),
  queries jsonb not null check (jsonb_typeof(queries) = 'array'),
  -- Origine des recettes : { cache, generated, fallback } (nombre de personas).
  recipes jsonb not null default '{}'::jsonb check (jsonb_typeof(recipes) = 'object'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index query_universes_site_idx on public.query_universes (site_id, created_at desc);

alter table public.query_universes enable row level security;
revoke all on public.query_universes from anon, authenticated, service_role;
grant select, insert on public.query_universes to authenticated, service_role;

create policy query_universes_select on public.query_universes
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy query_universes_insert on public.query_universes
  for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1 from public.sites s
      where s.id = query_universes.site_id and s.workspace_id = query_universes.workspace_id
    )
  );
