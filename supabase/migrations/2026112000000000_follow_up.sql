-- M4.3 : relance unique. Migration ADDITIVE.
-- Une réponse, une désinscription ou un rebond annule la relance. M4.4 (lecture IMAP) écrira les
-- signaux ; la route de désinscription écrit déjà le sien. Les garde-fous sont EN BASE.

create table public.reply_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Envoi initial auquel le signal se rattache.
  sent_message_id uuid not null references public.sent_messages (id) on delete cascade,
  kind text not null check (kind in ('reponse', 'desinscription', 'rebond')),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (sent_message_id, kind)
);
create index reply_signals_message_idx on public.reply_signals (sent_message_id);

alter table public.reply_signals enable row level security;
revoke all on public.reply_signals from anon, authenticated, service_role;
grant select on public.reply_signals to authenticated;
grant select, insert on public.reply_signals to service_role;
create policy reply_signals_select on public.reply_signals
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Garde-fou propre à la relance (s'ajoute à guard_sent_message : lot validé, suppression, plafonds…).
create function public.guard_follow_up() returns trigger
language plpgsql set search_path = '' as $$
declare
  i public.sent_messages%rowtype;
begin
  if new.step <> 'relance' or new.status <> 'en_cours' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'en_cours' then
    return new;
  end if;
  select * into i from public.sent_messages
    where draft_id = new.draft_id and step = 'initial' and dry_run = new.dry_run;
  if not found or i.status not in ('envoye', 'simule') then
    raise exception 'relance refusée : aucun envoi initial terminé' using errcode = '23514';
  end if;
  if i.follow_up_due_at is null or i.follow_up_due_at > now() then
    raise exception 'relance refusée : trop tôt' using errcode = '23514';
  end if;
  if exists (select 1 from public.reply_signals r where r.sent_message_id = i.id) then
    raise exception 'relance refusée : réponse, désinscription ou rebond reçu' using errcode = '23514';
  end if;
  if new.to_email is distinct from i.to_email
     or new.mailbox_id is distinct from i.mailbox_id
     or new.in_reply_to is distinct from i.message_id then
    raise exception 'relance refusée : doit répondre dans le même fil, à la même adresse'
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger sent_messages_guard_follow_up before insert or update on public.sent_messages
  for each row execute function public.guard_follow_up();
