-- M4.2 : moteur d'envoi plafonné. Migration ADDITIVE.
-- Les garde-fous sont EN BASE (trigger) : même un bug applicatif ne peut pas envoyer sans lot validé,
-- à une adresse en suppression, depuis une boîte non vérifiée, ni au-delà des plafonds.

alter table public.mailboxes
  add column timezone text not null default 'Europe/Paris',
  add column send_window_start int not null default 9 check (send_window_start between 0 and 23),
  add column send_window_end int not null default 18 check (send_window_end between 1 and 24),
  add constraint mailboxes_window_order check (send_window_start < send_window_end);

create table public.sent_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  batch_id uuid not null references public.batches (id) on delete cascade,
  draft_id uuid not null references public.target_drafts (id) on delete cascade,
  mailbox_id uuid references public.mailboxes (id) on delete set null,
  step text not null default 'initial' check (step in ('initial', 'relance')),
  -- Simulation : ne sort jamais du serveur ; ne consomme pas le quota réel.
  dry_run boolean not null,
  to_email text not null check (to_email = lower(to_email) and to_email like '%_@_%.__%'),
  subject text not null,
  body text not null,
  message_id text not null unique,
  in_reply_to text,
  status text not null check (status in (
    'en_cours', 'envoye', 'simule', 'a_reessayer', 'echec', 'ignore')),
  skip_reason text,
  attempts int not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  -- Date de relance prévue (J+10 par défaut), lue par M4.3.
  follow_up_due_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  -- Idempotence : un seul enregistrement par brouillon, étape et mode.
  unique (draft_id, step, dry_run),
  constraint sent_messages_done_has_date
    check (status not in ('envoye', 'simule') or sent_at is not null),
  constraint sent_messages_ignore_has_reason check (status <> 'ignore' or skip_reason is not null)
);
create index sent_messages_mailbox_idx on public.sent_messages (mailbox_id, dry_run, claimed_at desc);
create index sent_messages_batch_idx on public.sent_messages (batch_id);
create index sent_messages_followup_idx on public.sent_messages (follow_up_due_at)
  where status = 'envoye' and step = 'initial';

create function public.guard_sent_message() returns trigger
language plpgsql set search_path = '' as $$
declare
  b_status text;
  d_status text;
  d_channel text;
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
  -- Un « ignore » (adresse supprimée, contact non envoyable…) ne part jamais : pas de contrôle.
  if new.status <> 'en_cours' or (tg_op = 'UPDATE' and old.status = 'en_cours') then
    return new;
  end if;

  select status into b_status from public.batches where id = new.batch_id;
  if b_status is distinct from 'valide' then
    raise exception 'envoi refusé : le lot n''est pas validé' using errcode = '23514';
  end if;
  select status, channel into d_status, d_channel from public.target_drafts where id = new.draft_id;
  if d_status is distinct from 'valide' or d_channel is distinct from 'email' then
    raise exception 'envoi refusé : brouillon non validé ou non email' using errcode = '23514';
  end if;
  if new.mailbox_id is null then
    raise exception 'envoi refusé : aucune boîte' using errcode = '23514';
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

  -- Plafonds durs (le serveur applique en plus l'échauffement, plus bas). Verrou par boîte :
  -- deux envois simultanés ne peuvent pas passer ensemble sous le plafond.
  perform pg_advisory_xact_lock(hashtext(new.mailbox_id::text));
  select count(*) filter (where claimed_at > now() - interval '1 hour'), count(*)
    into n_hour, n_day
    from public.sent_messages
    where mailbox_id = new.mailbox_id and dry_run = new.dry_run and id <> new.id
      and status in ('en_cours', 'envoye', 'simule', 'a_reessayer', 'echec')
      and claimed_at > now() - interval '24 hours';
  if n_hour >= m_hourly then
    raise exception 'plafond horaire atteint' using errcode = '23514';
  end if;
  if n_day >= m_daily then
    raise exception 'plafond journalier atteint' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger sent_messages_guard before insert or update on public.sent_messages
  for each row execute function public.guard_sent_message();

alter table public.sent_messages enable row level security;
revoke all on public.sent_messages from anon, authenticated, service_role;
grant select on public.sent_messages to authenticated;
grant select, insert, update on public.sent_messages to service_role;
create policy sent_messages_select on public.sent_messages
  for select to authenticated using (public.is_workspace_member(workspace_id));
