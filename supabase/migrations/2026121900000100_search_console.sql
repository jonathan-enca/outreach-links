-- MQ.2 : connexion de la Search Console du site (OAuth Google, lecture seule). Migration ADDITIVE.
-- Une ligne par site. Le jeton de renouvellement est chiffré (même anneau de clés que les boîtes) et
-- n'est lisible que par le serveur : aucune politique pour `authenticated`. Le compte et la propriété
-- (siteUrl) sont des informations non sensibles, lues par la page du site via le serveur.

create table public.search_console_connections (
  site_id uuid primary key references public.sites (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  google_email text not null,
  property text not null,
  refresh_token_enc text not null,
  key_version text not null,
  scopes text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.search_console_connections enable row level security;
revoke all on public.search_console_connections from anon, authenticated, service_role;
grant select, insert, update, delete on public.search_console_connections to service_role;
