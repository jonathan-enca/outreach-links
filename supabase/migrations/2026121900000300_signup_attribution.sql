-- Source d'inscription : d'où vient la personne (UTM de la première visite, site d'origine, page
-- d'arrivée). Le cookie de première visite (90 jours) est lu à l'inscription et passé à Supabase dans
-- `raw_user_meta_data.attribution` ; le déclencheur existant le copie ici. Additif : une nouvelle table
-- et la fonction `handle_new_user` remplacée (même comportement + cette copie).
create table public.signup_attribution (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer_host text,
  landing_path text,
  created_at timestamptz not null default now()
);

-- Écrite par le déclencheur (security definer), lue par le service_role : aucune politique, donc aucun
-- accès depuis un navigateur.
alter table public.signup_attribution enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_id uuid;
  ws_name text;
  attr jsonb;
begin
  ws_name := coalesce(
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Mon espace'
  );
  insert into public.workspaces (name, created_by) values (ws_name, new.id) returning id into ws_id;
  insert into public.memberships (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  insert into public.events (workspace_id, actor_id, type, payload)
    values (ws_id, new.id, 'workspace.created', jsonb_build_object('source', 'signup'));

  attr := new.raw_user_meta_data -> 'attribution';
  if jsonb_typeof(attr) = 'object' then
    insert into public.signup_attribution
      (user_id, workspace_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
       referrer_host, landing_path)
    values (
      new.id, ws_id,
      left(attr ->> 'utm_source', 100), left(attr ->> 'utm_medium', 100),
      left(attr ->> 'utm_campaign', 100), left(attr ->> 'utm_content', 150),
      left(attr ->> 'utm_term', 150), left(attr ->> 'referrer_host', 100),
      left(attr ->> 'landing_path', 200)
    );
  end if;
  return new;
end;
$$;
