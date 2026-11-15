-- M5.2b : envoi des réponses VALIDÉES (dry run par défaut). Migration ADDITIVE.
-- Les garde-fous sont EN BASE (trigger), comme pour l'outreach (M4.2) : même un bug applicatif ne
-- peut pas envoyer un brouillon non validé, à une adresse en suppression, à une autre personne que
-- l'expéditeur de la réponse, ni après une plainte ou une désinscription, ni au-delà des plafonds.

create table public.reply_sends (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  reply_draft_id uuid not null references public.reply_drafts (id) on delete cascade,
  inbound_message_id uuid not null references public.inbound_messages (id) on delete cascade,
  -- Envoi initial du fil (sert au jeton de désinscription et au rattachement).
  sent_message_id uuid not null references public.sent_messages (id) on delete cascade,
  mailbox_id uuid references public.mailboxes (id) on delete set null,
  -- Simulation : ne sort jamais du serveur ; ne consomme pas le quota réel.
  dry_run boolean not null,
  to_email text not null check (to_email = lower(to_email) and to_email like '%_@_%.__%'),
  subject text not null,
  body text not null,
  message_id text not null unique,
  -- Message de la cible auquel on répond (fil conservé).
  in_reply_to text not null,
  status text not null check (status in (
    'en_cours', 'envoye', 'simule', 'a_reessayer', 'echec', 'ignore')),
  skip_reason text,
  attempts int not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  -- Idempotence : une seule réponse par brouillon et par mode.
  unique (reply_draft_id, dry_run),
  constraint reply_sends_done_has_date
    check (status not in ('envoye', 'simule') or sent_at is not null),
  constraint reply_sends_ignore_has_reason check (status <> 'ignore' or skip_reason is not null)
);
create index reply_sends_mailbox_idx on public.reply_sends (mailbox_id, dry_run, claimed_at desc);
create index reply_sends_inbound_idx on public.reply_sends (inbound_message_id);

create function public.guard_reply_send() returns trigger
language plpgsql set search_path = '' as $$
declare
  d_status text;
  d_inbound uuid;
  i_from text;
  i_mailbox uuid;
  cat text;
  m_status text;
  m_hourly int;
  m_daily int;
  n_hour int;
  n_day int;
begin
  if tg_op = 'UPDATE' and old.status in ('envoye', 'simule', 'ignore', 'echec') then
    raise exception 'enregistrement d''envoi terminé : non modifiable' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.status not in ('en_cours', 'ignore') then
    raise exception 'un envoi commence par « en_cours »' using errcode = '23514';
  end if;
  -- Un « ignore » ne part jamais : pas de contrôle.
  if new.status <> 'en_cours' or (tg_op = 'UPDATE' and old.status = 'en_cours') then
    return new;
  end if;

  select status, inbound_message_id into d_status, d_inbound
    from public.reply_drafts where id = new.reply_draft_id;
  if d_status is distinct from 'validee' then
    raise exception 'envoi refusé : brouillon de réponse non validé' using errcode = '23514';
  end if;
  if d_inbound is distinct from new.inbound_message_id then
    raise exception 'envoi refusé : brouillon et message entrant ne correspondent pas'
      using errcode = '23514';
  end if;
  select lower(from_email), mailbox_id into i_from, i_mailbox
    from public.inbound_messages where id = new.inbound_message_id;
  -- On répond uniquement à celui qui nous a écrit, depuis la boîte qui a reçu son message.
  if i_from is null or i_from <> new.to_email then
    raise exception 'envoi refusé : le destinataire n''est pas l''expéditeur de la réponse'
      using errcode = '23514';
  end if;
  if new.mailbox_id is null or new.mailbox_id is distinct from i_mailbox then
    raise exception 'envoi refusé : boîte différente de celle qui a reçu la réponse'
      using errcode = '23514';
  end if;
  -- Aucune réponse après une désinscription, une plainte ou un rebond (catégorie corrigée d'abord).
  select coalesce(validated_category, category) into cat
    from public.reply_classifications where inbound_message_id = new.inbound_message_id;
  if cat in ('desinscription', 'plainte_hostile', 'rebond') then
    raise exception 'envoi refusé : catégorie à risque (%)', cat using errcode = '23514';
  end if;
  select status, hourly_cap, daily_cap into m_status, m_hourly, m_daily
    from public.mailboxes where id = new.mailbox_id;
  if m_status is distinct from 'verifiee' then
    raise exception 'envoi refusé : boîte non vérifiée ou suspendue' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.suppressions s
    where (s.workspace_id is null or s.workspace_id = new.workspace_id)
      and ((s.email is not null and lower(s.email) = lower(new.to_email))
        or (s.domain is not null
            and (lower(s.domain) = split_part(lower(new.to_email), '@', 2)
              or split_part(lower(new.to_email), '@', 2) like '%.' || lower(s.domain))))
  ) then
    raise exception 'envoi refusé : adresse en liste de suppression' using errcode = '23514';
  end if;

  -- Plafonds durs partagés avec l'outreach (réponses + envois), verrou par boîte.
  perform pg_advisory_xact_lock(hashtext(new.mailbox_id::text));
  select
    (select count(*) from public.sent_messages
       where mailbox_id = new.mailbox_id and dry_run = new.dry_run
         and status in ('en_cours', 'envoye', 'simule', 'a_reessayer', 'echec')
         and claimed_at > now() - interval '1 hour')
    + (select count(*) from public.reply_sends
       where mailbox_id = new.mailbox_id and dry_run = new.dry_run and id <> new.id
         and status in ('en_cours', 'envoye', 'simule', 'a_reessayer', 'echec')
         and claimed_at > now() - interval '1 hour'),
    (select count(*) from public.sent_messages
       where mailbox_id = new.mailbox_id and dry_run = new.dry_run
         and status in ('en_cours', 'envoye', 'simule', 'a_reessayer', 'echec')
         and claimed_at > now() - interval '24 hours')
    + (select count(*) from public.reply_sends
       where mailbox_id = new.mailbox_id and dry_run = new.dry_run and id <> new.id
         and status in ('en_cours', 'envoye', 'simule', 'a_reessayer', 'echec')
         and claimed_at > now() - interval '24 hours')
    into n_hour, n_day;
  if n_hour >= m_hourly then
    raise exception 'plafond horaire atteint' using errcode = '23514';
  end if;
  if n_day >= m_daily then
    raise exception 'plafond journalier atteint' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger reply_sends_guard before insert or update on public.reply_sends
  for each row execute function public.guard_reply_send();

alter table public.reply_sends enable row level security;
revoke all on public.reply_sends from anon, authenticated, service_role;
grant select on public.reply_sends to authenticated;
grant select, insert, update on public.reply_sends to service_role;
create policy reply_sends_select on public.reply_sends
  for select to authenticated using (public.is_workspace_member(workspace_id));
