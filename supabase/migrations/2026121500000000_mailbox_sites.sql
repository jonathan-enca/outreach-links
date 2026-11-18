-- Une boîte d'envoi appartient à l'espace de travail et peut servir plusieurs sites (campagnes).
-- Migration ADDITIVE : table de liens boîte <-> site, remplie depuis `mailboxes.site_id`.
-- `mailboxes.site_id` reste (site d'origine, informatif) mais n'est plus obligatoire : supprimer le
-- site d'origine ne supprime plus la boîte, qui reste utilisable par les autres sites.

create table public.mailbox_sites (
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mailbox_id, site_id)
);
create index mailbox_sites_site_idx on public.mailbox_sites (site_id);

insert into public.mailbox_sites (mailbox_id, site_id, workspace_id)
  select id, site_id, workspace_id from public.mailboxes where site_id is not null
  on conflict do nothing;

alter table public.mailboxes alter column site_id drop not null;
alter table public.mailboxes drop constraint mailboxes_site_id_fkey;
alter table public.mailboxes
  add constraint mailboxes_site_id_fkey foreign key (site_id) references public.sites (id)
  on delete set null;

-- Le lien et la boîte doivent être dans le même espace de travail que le site.
create or replace function public.guard_mailbox_site() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.mailboxes where id = new.mailbox_id and workspace_id = new.workspace_id)
     or not exists (select 1 from public.sites where id = new.site_id and workspace_id = new.workspace_id) then
    raise exception 'boîte et site doivent appartenir au même espace' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger mailbox_sites_guard before insert or update on public.mailbox_sites
  for each row execute function public.guard_mailbox_site();

alter table public.mailbox_sites enable row level security;
revoke all on public.mailbox_sites from anon, authenticated, service_role;
grant select on public.mailbox_sites to authenticated;
grant select, insert, update, delete on public.mailbox_sites to service_role;
create policy mailbox_sites_select on public.mailbox_sites
  for select to authenticated using (public.is_workspace_member(workspace_id));
