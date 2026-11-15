-- Imite le minimum de Supabase (rôles, schéma auth, auth.uid()) pour exécuter
-- les migrations et les tests de RLS sur un Postgres vierge. Test uniquement.
-- Les fichiers de test tournent en parallèle sur le même cluster : la création des
-- rôles (globaux au cluster) tolère une course (duplicate_object / unique_violation).
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    begin
      if not exists (select 1 from pg_roles where rolname = r) then
        if r = 'service_role' then
          create role service_role nologin bypassrls;
        else
          execute format('create role %I nologin', r);
        end if;
      end if;
    exception when duplicate_object or unique_violation then null;
    end;
  end loop;
end $$;

create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
