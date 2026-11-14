-- M1.2 : onboarding du site. Colonnes additives sur `sites` : requêtes
-- prioritaires, boîte d'envoi souhaitée (optionnelle), jeton et état de la
-- vérification de propriété du domaine.

alter table public.sites
  add column priority_queries text[] not null default '{}'
    check (cardinality(priority_queries) <= 3),
  add column sender_email text
    check (sender_email is null or char_length(sender_email) between 3 and 254),
  add column verification_token text not null
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column verification_method text
    check (verification_method is null or verification_method in ('meta', 'file')),
  add column verified_at timestamptz,
  add column updated_at timestamptz not null default now();

-- La vérification est un fait établi par le serveur : un membre ne doit pas
-- pouvoir s'auto-déclarer vérifié. On remplace les droits de table par des
-- droits par colonne qui excluent le jeton, la méthode et la date de
-- vérification (écrits uniquement par service_role, qui contourne ces droits).
revoke insert, update on public.sites from authenticated;
grant insert (
  workspace_id, domain, niche, country, language, signature_first_name,
  offered_asset, categories, priority_queries, sender_email
) on public.sites to authenticated;
grant update (
  domain, niche, country, language, signature_first_name,
  offered_asset, categories, priority_queries, sender_email
) on public.sites to authenticated;

-- Changer de domaine invalide la vérification et renouvelle le jeton.
create function public.sites_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.domain is distinct from old.domain then
    new.verified_at := null;
    new.verification_method := null;
    new.verification_token :=
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.sites_before_update() from public, anon, authenticated;

create trigger sites_before_update
  before update on public.sites
  for each row execute function public.sites_before_update();
