-- M1.1 : cache des réponses DataForSEO. Clé = endpoint + paramètres normalisés (sha256).
-- Table système (aucun workspace) : lue et écrite uniquement par service_role.
-- Un audit réutilise ainsi les réponses déjà payées tant que le TTL n'est pas écoulé.

create table public.dataforseo_cache (
  cache_key text primary key check (char_length(cache_key) = 64),
  endpoint text not null check (char_length(endpoint) between 1 and 200),
  params jsonb not null,
  response jsonb not null,
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index dataforseo_cache_expires_idx on public.dataforseo_cache (expires_at);
create index dataforseo_cache_endpoint_idx on public.dataforseo_cache (endpoint, created_at desc);

alter table public.dataforseo_cache enable row level security;

revoke all on public.dataforseo_cache from anon, authenticated;
grant select, insert, update, delete on public.dataforseo_cache to service_role;
-- Aucune policy : RLS active sans policy = aucun accès pour les rôles clients.
