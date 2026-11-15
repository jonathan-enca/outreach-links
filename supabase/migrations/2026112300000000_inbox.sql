-- M5.2 : inbox classé, brouillons de réponse, politique « c'est payant », niveau d'autonomie.
-- Migration ADDITIVE. Rien n'est envoyé par ce jalon : un brouillon validé attend M5.2b (envoi en
-- dry run). Le texte entrant reste une donnée non fiable ; les décisions viennent de l'utilisateur.

-- Niveau d'autonomie du workspace : manuel (tout validé) ou assisté (défaut). L'autopilot est
-- réservé à M6.2 et n'est donc pas encore une valeur admise.
alter table public.workspaces
  add column autonomy_level text not null default 'assiste'
    check (autonomy_level in ('manuel', 'assiste'));
grant select on public.workspaces to service_role;
grant update (autonomy_level) on public.workspaces to service_role;

-- État manuel d'un fil (un fil = un envoi initial) : sert aux vues En négociation, Gagné, Archivé.
create table public.inbox_states (
  sent_message_id uuid primary key references public.sent_messages (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  state text not null check (state in ('aucun', 'en_negociation', 'gagne', 'archive')),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create index inbox_states_ws_idx on public.inbox_states (workspace_id, state);

-- Brouillons de réponse (à valider) et réponses « prêtes à insérer ».
create table public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  inbound_message_id uuid not null references public.inbound_messages (id) on delete cascade,
  sent_message_id uuid not null references public.sent_messages (id) on delete cascade,
  -- reponse : message à la cible ; pret_a_inserer : ce que la cible doit coller dans sa page.
  kind text not null check (kind in ('reponse', 'pret_a_inserer')),
  subject text,
  body text not null check (char_length(body) between 1 and 4000),
  -- Pour « prêt à insérer » : { page_url, anchor, sentence_to_add, sentence_after }.
  insertion jsonb,
  -- Politique « c'est payant » (CLAUDE.md 4.3). Défaut : décliner.
  payment_option text check (payment_option in ('decliner', 'echanger', 'achat_plafonne')),
  budget_cap_eur numeric(8, 2) check (budget_cap_eur is null or budget_cap_eur > 0),
  -- Nature honnête du lien discuté.
  link_nature text check (link_nature in ('editorial_gratuit', 'echange', 'sponsorise')),
  status text not null default 'brouillon' check (status in ('brouillon', 'validee', 'rejetee')),
  edited boolean not null default false,
  source text not null check (source in ('modele', 'llm')),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  -- Une proposition par message et par nature (régénération = mise à jour d'un brouillon).
  unique (inbound_message_id, kind),
  constraint reply_drafts_insertion_required
    check ((kind = 'pret_a_inserer') = (insertion is not null)),
  constraint reply_drafts_insertion_has_no_subject check (kind = 'reponse' or subject is null),
  -- Un achat exige un plafond et un libellé « sponsorisé » ; sinon aucun plafond.
  constraint reply_drafts_purchase_rules check (
    (payment_option = 'achat_plafonne') = (budget_cap_eur is not null)
    and (payment_option <> 'achat_plafonne' or link_nature = 'sponsorise')),
  constraint reply_drafts_validated_has_author
    check (status <> 'validee' or (validated_by is not null and validated_at is not null))
);
create index reply_drafts_ws_idx on public.reply_drafts (workspace_id, status, created_at desc);
create index reply_drafts_sent_idx on public.reply_drafts (sent_message_id);

-- Un brouillon validé ou rejeté est figé ; seul « brouillon » est modifiable.
create function public.guard_reply_draft() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'brouillon' then
    raise exception 'brouillon de réponse figé (déjà validé ou rejeté)' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger reply_drafts_guard before update on public.reply_drafts
  for each row execute function public.guard_reply_draft();

alter table public.inbox_states enable row level security;
alter table public.reply_drafts enable row level security;
revoke all on public.inbox_states, public.reply_drafts from anon, authenticated, service_role;
grant select on public.inbox_states, public.reply_drafts to authenticated;
grant select, insert, update on public.inbox_states to service_role;
grant select, insert on public.reply_drafts to service_role;
grant update (subject, body, insertion, payment_option, budget_cap_eur, link_nature, status, edited,
  validated_by, validated_at) on public.reply_drafts to service_role;
create policy inbox_states_select on public.inbox_states
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy reply_drafts_select on public.reply_drafts
  for select to authenticated using (public.is_workspace_member(workspace_id));
