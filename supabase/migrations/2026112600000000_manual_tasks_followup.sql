-- M5.4 : suivi des tâches manuelles (formulaires). Migration ADDITIVE.
-- Une tâche faite lance un compte à rebours de relance (J+10 par défaut) : la relance d'un
-- formulaire est elle aussi une tâche manuelle, jamais un envoi. Les garde-fous sont EN BASE.

alter table public.manual_tasks
  add column done_at timestamptz,
  add column follow_up_due_at timestamptz,
  add column follow_up_status text check (follow_up_status in ('en_attente', 'fait', 'annulee')),
  add column follow_up_message text,
  add column follow_up_done_at timestamptz,
  -- Pourquoi la relance est annulée (réponse reçue, refus, ou abandon par l'utilisateur).
  add column follow_up_cancel_reason text
    check (follow_up_cancel_reason in ('reponse', 'refus', 'abandon')),
  add constraint manual_tasks_done_consistent
    check ((status = 'fait') = (done_at is not null)),
  add constraint manual_tasks_follow_up_needs_done
    check (follow_up_status is null or status = 'fait'),
  add constraint manual_tasks_follow_up_due_consistent
    check (follow_up_status is null or follow_up_due_at is not null),
  add constraint manual_tasks_follow_up_done_consistent
    check ((follow_up_status = 'fait') = (follow_up_done_at is not null)),
  add constraint manual_tasks_follow_up_cancel_consistent
    check ((follow_up_status = 'annulee') = (follow_up_cancel_reason is not null));

create index manual_tasks_follow_up_idx on public.manual_tasks (workspace_id, follow_up_due_at)
  where follow_up_status = 'en_attente';

create function public.guard_manual_task() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'a_faire' or new.follow_up_status is not null then
      raise exception 'tâche manuelle : une nouvelle tâche est « à faire »' using errcode = '23514';
    end if;
    return new;
  end if;
  -- Un statut final ne change plus.
  if old.status in ('fait', 'ignoree') and new.status is distinct from old.status then
    raise exception 'tâche manuelle : statut final' using errcode = '23514';
  end if;
  -- Rien n'est « fait » avant la validation du lot qui contient le message.
  if new.status = 'fait' and old.status is distinct from 'fait' and not exists (
    select 1
    from public.target_drafts d
    join public.batch_items bi on bi.draft_id = d.id
    join public.batches b on b.id = bi.batch_id
    where d.plan_item_id = new.plan_item_id and b.status = 'valide'
  ) then
    raise exception 'tâche manuelle : le lot n''est pas validé' using errcode = '23514';
  end if;
  if old.follow_up_status in ('fait', 'annulee')
     and new.follow_up_status is distinct from old.follow_up_status then
    raise exception 'relance de tâche : statut final' using errcode = '23514';
  end if;
  if new.follow_up_status = 'fait' and old.follow_up_status is distinct from 'fait' then
    if old.follow_up_status is distinct from 'en_attente' or old.follow_up_due_at > now() then
      raise exception 'relance de tâche refusée : trop tôt' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
create trigger manual_tasks_guard before insert or update on public.manual_tasks
  for each row execute function public.guard_manual_task();
