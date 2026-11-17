-- Réglages « Vos messages » (17/11) : signature complète et contreparties. Migration ADDITIVE.
-- 1. `sites` : nom, lien vers le site, LinkedIn, téléphone, jeton du logo, contreparties acceptées.
--    La signature est composée à l'envoi (et à l'affichage) : elle s'applique donc aussi aux messages
--    déjà rédigés. `offered_asset` reste en base mais n'est plus cité dans le premier message.
-- 2. `site_logos` : le logo de la signature, servi par l'application (adresse publique à jeton).

alter table public.sites
  add column signature_last_name text
    check (signature_last_name is null or char_length(signature_last_name) between 1 and 60),
  add column signature_show_site boolean not null default true,
  add column signature_linkedin_url text
    check (
      signature_linkedin_url is null
      or (
        char_length(signature_linkedin_url) <= 200
        and signature_linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/[^\s]+$'
      )
    ),
  add column signature_phone text
    check (signature_phone is null or char_length(signature_phone) between 6 and 30),
  -- Écrit par le serveur seulement : nul = pas de logo.
  add column signature_logo_token text unique
    check (signature_logo_token is null or signature_logo_token ~ '^[0-9a-f]{32}$'),
  add column counterparts text[] not null default '{}'
    check (counterparts <@ array['partage', 'article', 'lien_retour']::text[]);

-- Droits par colonne (voir M1.2) : l'utilisateur règle lui-même sa signature, sauf le jeton du logo.
grant update (
  signature_last_name, signature_show_site, signature_linkedin_url, signature_phone, counterparts
) on public.sites to authenticated;

create table public.site_logos (
  site_id uuid primary key references public.sites (id) on delete cascade,
  mime text not null check (mime in ('image/png', 'image/jpeg')),
  -- 150 Ko au plus, encodés en base64.
  data_base64 text not null check (char_length(data_base64) between 1 and 204800),
  updated_at timestamptz not null default now()
);
alter table public.site_logos enable row level security;
-- Aucune policy : lecture et écriture par le serveur seulement.
revoke all on public.site_logos from anon, authenticated, service_role;
grant select, insert, update, delete on public.site_logos to service_role;
