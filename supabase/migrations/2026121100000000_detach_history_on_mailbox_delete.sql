-- Supprimer une boîte d'envoi échouait dès qu'un email était parti : la clé étrangère passe `mailbox_id` à
-- NULL sur les envois et réponses déjà terminés, et la garde les déclarait « non modifiables ».
-- Correction ADDITIVE : la garde accepte ce seul changement (mailbox_id : valeur -> NULL, tout le reste
-- identique). L'historique des envois est conservé, détaché de la boîte supprimée.

create or replace function public.guard_sent_message() returns trigger
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
    -- Seule exception : la suppression d'une boîte (clé étrangère ON DELETE SET NULL) détache l'historique
    -- de la boîte, sans toucher à rien d'autre. Toute autre modification d'un envoi terminé reste refusée.
    if old.mailbox_id is not null and new.mailbox_id is null
       and (to_jsonb(new) - 'mailbox_id') = (to_jsonb(old) - 'mailbox_id') then
      return new;
    end if;
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

create or replace function public.guard_reply_send() returns trigger
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
    -- Seule exception : la suppression d'une boîte (clé étrangère ON DELETE SET NULL) détache l'historique
    -- de la boîte, sans toucher à rien d'autre. Toute autre modification d'un envoi terminé reste refusée.
    if old.mailbox_id is not null and new.mailbox_id is null
       and (to_jsonb(new) - 'mailbox_id') = (to_jsonb(old) - 'mailbox_id') then
      return new;
    end if;
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
