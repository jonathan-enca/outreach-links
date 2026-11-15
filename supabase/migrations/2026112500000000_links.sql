-- M5.3 : vérification des liens obtenus. Migration ADDITIVE.
-- `links` : un lien déclaré posé (page source -> page de l'utilisateur). Les vérifications à
-- J+7, J+14 et J+30 sont consignées dans `link_checks` (historique, jamais modifié).

create table public.links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  -- Élément du plan à l'origine du lien (facultatif : un lien peut être déclaré à la main).
  plan_item_id uuid references public.link_plan_items (id) on delete set null,
  source_url text not null check (source_url ~ '^https?://[^\s]+$' and char_length(source_url) <= 2000),
  source_domain text not null check (source_domain = lower(source_domain)),
  target_url text not null check (target_url ~ '^https?://[^\s]+$' and char_length(target_url) <= 2000),
  expected_anchor text check (expected_anchor is null or char_length(expected_anchor) <= 200),
  origin text not null default 'manuel' check (origin in ('reponse', 'manuel')),
  declared_at timestamptz not null default now(),
  -- Résultat de la dernière vérification.
  status text not null default 'a_verifier'
    check (status in ('a_verifier', 'live', 'disparu', 'injoignable')),
  http_status int,
  -- 'dofollow' | 'nofollow' | 'sponsored' | 'ugc'
  rel text check (rel is null or rel in ('dofollow', 'nofollow', 'sponsored', 'ugc')),
  contextual boolean,
  indexable boolean,
  exact_page boolean,
  anchor_found text,
  last_error text,
  -- Étapes déjà faites (0 à 3) : J+7, J+14, J+30 ; tentatives de l'étape en cours.
  checks_done int not null default 0 check (checks_done between 0 and 3),
  attempts int not null default 0 check (attempts >= 0),
  last_checked_at timestamptz,
  next_check_at timestamptz,
  first_live_at timestamptz,
  lost_at timestamptz,
  -- Alerte à afficher : lien disparu, devenu nofollow / sponsorisé, ou page non indexable.
  alert text check (alert in ('disparu', 'devenu_nofollow', 'non_indexable')),
  alert_at timestamptz,
  created_at timestamptz not null default now(),
  unique (site_id, source_url, target_url),
  constraint links_done_has_no_next check (checks_done < 3 or next_check_at is null)
);
create index links_due_idx on public.links (next_check_at) where next_check_at is not null;
create index links_workspace_idx on public.links (workspace_id, created_at desc);

create table public.link_checks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Jalon visé (7, 14 ou 30 jours après la déclaration), null pour une vérification hors calendrier.
  milestone_day int check (milestone_day in (7, 14, 30)),
  checked_at timestamptz not null default now(),
  http_status int,
  found boolean not null default false,
  rel text check (rel is null or rel in ('dofollow', 'nofollow', 'sponsored', 'ugc')),
  contextual boolean,
  indexable boolean,
  exact_page boolean,
  anchor_found text,
  outcome text not null check (outcome in ('live', 'disparu', 'injoignable')),
  error text
);
create index link_checks_link_idx on public.link_checks (link_id, checked_at desc);

-- Un lien ne peut viser que le site de l'espace, et la page source doit être un autre domaine.
create function public.guard_link() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s_ws uuid;
begin
  select workspace_id into s_ws from public.sites where id = new.site_id;
  if s_ws is distinct from new.workspace_id then
    raise exception 'lien refusé : le site n''appartient pas à l''espace' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.site_id <> old.site_id or new.source_url <> old.source_url
       or new.target_url <> old.target_url or new.workspace_id <> old.workspace_id then
      raise exception 'lien refusé : l''adresse déclarée ne change pas' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger links_guard before insert or update on public.links
  for each row execute function public.guard_link();

create function public.guard_link_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare l_ws uuid;
begin
  select workspace_id into l_ws from public.links where id = new.link_id;
  if l_ws is distinct from new.workspace_id then
    raise exception 'vérification refusée : espace différent du lien' using errcode = '23514';
  end if;
  if new.outcome = 'live' and not new.found then
    raise exception 'vérification incohérente : « live » sans lien trouvé' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger link_checks_guard before insert on public.link_checks
  for each row execute function public.guard_link_check();

alter table public.links enable row level security;
alter table public.link_checks enable row level security;
revoke all on public.links, public.link_checks from anon, authenticated, service_role;
grant select on public.links, public.link_checks to authenticated;
-- Pas de delete : un lien déclaré reste dans l'historique ; l'historique des contrôles est figé.
grant select, insert, update on public.links to service_role;
grant select, insert on public.link_checks to service_role;
create policy links_select on public.links
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy link_checks_select on public.link_checks
  for select to authenticated using (public.is_workspace_member(workspace_id));

revoke all on function public.guard_link(), public.guard_link_check() from public, anon, authenticated;
