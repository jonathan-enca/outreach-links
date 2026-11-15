-- M3.4 : lots et validation. Migration ADDITIVE.
-- Un lot regroupe des brouillons d'email prêts ; seul un lot validé est envoyable (M4.2).

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  number int not null check (number > 0),
  status text not null default 'brouillon' check (status in ('brouillon', 'valide')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz,
  unique (plan_id, number),
  constraint batches_validated_has_date check ((status = 'valide') = (validated_at is not null))
);

create table public.batch_items (
  batch_id uuid not null references public.batches (id) on delete cascade,
  -- Un brouillon appartient à un seul lot.
  draft_id uuid not null unique references public.target_drafts (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  position int not null check (position > 0),
  primary key (batch_id, draft_id)
);
create index batch_items_batch_idx on public.batch_items (batch_id, position);

-- Le brouillon peut être modifié par l'utilisateur (relu par le linter) puis verrouillé à la validation.
alter table public.target_drafts
  add column edited_by_user boolean not null default false,
  add column edited_at timestamptz;
alter table public.target_drafts drop constraint target_drafts_status_check;
alter table public.target_drafts
  add constraint target_drafts_status_check check (status in ('brouillon', 'valide'));

-- Verrouillage : un brouillon validé ne change plus ; un lot validé ne change plus de contenu.
create function public.lock_validated_draft() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = 'valide' then
    raise exception 'brouillon verrouillé : le lot est validé' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger target_drafts_lock before update on public.target_drafts
  for each row execute function public.lock_validated_draft();

create function public.lock_validated_batch_items() returns trigger
language plpgsql set search_path = '' as $$
declare b_status text;
begin
  if tg_op = 'DELETE' then
    select status into b_status from public.batches where id = old.batch_id;
  else
    select status into b_status from public.batches where id = new.batch_id;
  end if;
  -- Absent : suppression en cascade du lot lui-même, autorisée.
  if b_status = 'valide' then
    raise exception 'lot verrouillé : il est validé' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger batch_items_lock before insert or update or delete on public.batch_items
  for each row execute function public.lock_validated_batch_items();

-- Validation : lot non vide, tous les brouillons prêts (URL 200, linter vert), jamais de retour arrière.
-- Les brouillons passent à « valide » dans la même transaction.
create function public.validate_batch_guard() returns trigger
language plpgsql set search_path = '' as $$
declare n int; not_ready int;
begin
  if old.status = 'valide' then
    raise exception 'lot déjà validé' using errcode = '23514';
  end if;
  if new.status = 'valide' then
    select count(*), count(*) filter (where not d.ready)
      into n, not_ready
      from public.batch_items i join public.target_drafts d on d.id = i.draft_id
      where i.batch_id = new.id;
    if n = 0 then
      raise exception 'lot vide' using errcode = '23514';
    end if;
    if not_ready > 0 then
      raise exception 'le lot contient des messages non prêts' using errcode = '23514';
    end if;
    update public.target_drafts set status = 'valide'
      where id in (select draft_id from public.batch_items where batch_id = new.id);
  end if;
  return new;
end $$;
create trigger batches_validate before update on public.batches
  for each row execute function public.validate_batch_guard();

alter table public.batches enable row level security;
alter table public.batch_items enable row level security;
revoke all on public.batches, public.batch_items from anon, authenticated, service_role;
grant select on public.batches, public.batch_items to authenticated;
-- Écriture réservée au serveur. delete : retirer un message d'un lot non validé.
grant select, insert, update on public.batches to service_role;
grant select, insert, update, delete on public.batch_items to service_role;

create policy batches_select on public.batches
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy batch_items_select on public.batch_items
  for select to authenticated using (public.is_workspace_member(workspace_id));
