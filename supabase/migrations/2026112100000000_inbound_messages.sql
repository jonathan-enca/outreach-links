-- M4.4 : lecture des réponses (IMAP). Migration ADDITIVE.
-- Les messages entrants sont NON FIABLES : stockés en texte brut tronqué, jamais interprétés.
-- Seuls les messages rattachés à un envoi de campagne sont conservés ; le reste est ignoré.

alter table public.mailboxes
  add column imap_uid_validity bigint,
  add column imap_last_uid bigint not null default 0 check (imap_last_uid >= 0),
  add column imap_last_read_at timestamptz;

create table public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes (id) on delete cascade,
  -- Envoi INITIAL de la campagne auquel le message se rattache.
  sent_message_id uuid not null references public.sent_messages (id) on delete cascade,
  message_id text not null check (char_length(message_id) <= 998),
  in_reply_to text check (in_reply_to is null or char_length(in_reply_to) <= 998),
  from_email text check (from_email is null or char_length(from_email) <= 320),
  subject text check (subject is null or char_length(subject) <= 500),
  -- Texte brut tronqué, sans HTML ni pièce jointe. Donnée non fiable.
  body_excerpt text not null default '' check (char_length(body_excerpt) <= 4000),
  kind text not null check (kind in ('reponse', 'rebond', 'reponse_automatique')),
  match_method text not null check (match_method in ('en_tete', 'dsn', 'adresse')),
  received_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (mailbox_id, message_id)
);
create index inbound_messages_sent_idx on public.inbound_messages (sent_message_id);
create index inbound_messages_ws_idx on public.inbound_messages (workspace_id, received_at desc);

alter table public.inbound_messages enable row level security;
revoke all on public.inbound_messages from anon, authenticated, service_role;
grant select on public.inbound_messages to authenticated;
grant select, insert on public.inbound_messages to service_role;
create policy inbound_messages_select on public.inbound_messages
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Un rebond met l'adresse en suppression, dans la même transaction que le signal.
create function public.suppress_bounced_address() returns trigger
language plpgsql set search_path = '' as $$
declare
  addr text;
begin
  if new.kind <> 'rebond' then
    return new;
  end if;
  select to_email into addr from public.sent_messages where id = new.sent_message_id;
  if addr is not null then
    insert into public.suppressions (workspace_id, email, reason)
      values (new.workspace_id, lower(addr), 'rebond')
      on conflict do nothing;
  end if;
  return new;
end $$;
create trigger reply_signals_suppress_bounce after insert on public.reply_signals
  for each row execute function public.suppress_bounced_address();
