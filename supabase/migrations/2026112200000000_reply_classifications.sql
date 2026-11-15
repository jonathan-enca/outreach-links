-- M5.1 : classification des réponses. Migration ADDITIVE.
-- Le texte entrant est NON FIABLE : la catégorie est une DONNÉE, jamais une instruction. Les actions
-- automatiques sont décidées par le code à partir de la catégorie, jamais par le contenu du message.

create table public.reply_classifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Une classification par message entrant (idempotence).
  inbound_message_id uuid not null unique references public.inbound_messages (id) on delete cascade,
  -- Envoi initial de la campagne auquel le message se rattache.
  sent_message_id uuid not null references public.sent_messages (id) on delete cascade,
  category text not null check (category in (
    'accepte_lien_pose', 'interesse_conditions', 'demande_paiement', 'demande_echange', 'question',
    'refus_poli', 'desinscription', 'redirection', 'reponse_automatique', 'rebond',
    'plainte_hostile', 'ambigu')),
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  justification text not null check (char_length(justification) between 1 and 500),
  -- regle : motif déterministe ; llm : modèle ; repli : sortie du modèle inexploitable.
  source text not null check (source in ('regle', 'llm', 'repli')),
  needs_review boolean not null default false,
  -- Le message contenait une tentative d'instruction adressée au classifieur.
  injection_suspected boolean not null default false,
  proposed_action text not null check (proposed_action in (
    'preparer_reponse_inseree', 'brouillon_reponse', 'politique_payant', 'clore_refuse',
    'suppression', 'proposer_nouveau_contact', 'repousser_relance', 'deja_traite',
    'suppression_et_alerte', 'revue_manuelle')),
  -- appliquee : effet de bord déjà fait par le serveur ; proposee : attend l'utilisateur (M5.2).
  action_status text not null check (action_status in ('appliquee', 'proposee', 'aucune')),
  -- Relance repoussée jusqu'à cette date (réponse automatique d'absence).
  follow_up_not_before timestamptz,
  model text,
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  -- Validation humaine (M5.2) : la catégorie corrigée alimentera le déblocage de l'autopilot.
  validated_category text check (validated_category is null or validated_category in (
    'accepte_lien_pose', 'interesse_conditions', 'demande_paiement', 'demande_echange', 'question',
    'refus_poli', 'desinscription', 'redirection', 'reponse_automatique', 'rebond',
    'plainte_hostile', 'ambigu')),
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reply_class_postpone_only_for_auto
    check (follow_up_not_before is null or category = 'reponse_automatique')
);
create index reply_classifications_sent_idx on public.reply_classifications (sent_message_id);
create index reply_classifications_ws_idx
  on public.reply_classifications (workspace_id, category, created_at desc);

alter table public.reply_classifications enable row level security;
revoke all on public.reply_classifications from anon, authenticated, service_role;
grant select on public.reply_classifications to authenticated;
grant select, insert on public.reply_classifications to service_role;
-- La validation humaine (M5.2) passera par le serveur : seules ces colonnes sont modifiables.
grant update (validated_category, validated_by, validated_at) on public.reply_classifications
  to service_role;
create policy reply_classifications_select on public.reply_classifications
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Marque de traitement : les messages entrants non classés sont repris au passage suivant.
alter table public.inbound_messages add column classified_at timestamptz;
create index inbound_messages_unclassified_idx on public.inbound_messages (created_at)
  where classified_at is null;
grant update (classified_at) on public.inbound_messages to service_role;

-- Relance repoussée : le garde-fou de M4.3 refuse la relance tant que la date n'est pas passée.
create or replace function public.guard_follow_up() returns trigger
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
  if exists (
    select 1 from public.reply_classifications c
      where c.sent_message_id = i.id and c.follow_up_not_before > now()
  ) then
    raise exception 'relance refusée : repoussée (réponse automatique)' using errcode = '23514';
  end if;
  if new.to_email is distinct from i.to_email
     or new.mailbox_id is distinct from i.mailbox_id
     or new.in_reply_to is distinct from i.message_id then
    raise exception 'relance refusée : doit répondre dans le même fil, à la même adresse'
      using errcode = '23514';
  end if;
  return new;
end $$;
