-- MU.1 : une seule analyse, de bout en bout. Migration ADDITIVE.
-- `analysis_steps` : une ligne par étape et par audit (progression lisible par l'écran MU.3).
-- `analysis_feed` : événements lisibles (étape finie, cible prête, constat).
-- Lecture par les membres de l'espace ; écriture réservée à service_role.

alter table public.audits
  add column analysis_status text not null default 'aucun'
    check (analysis_status in ('aucun', 'confirme', 'en_cours', 'termine', 'echoue')),
  -- Date du dernier lancement (ou de la dernière reprise) : identifiant de l'événement Inngest.
  add column analysis_confirmed_at timestamptz,
  add column analysis_started_at timestamptz,
  add column analysis_finished_at timestamptz,
  add column analysis_error text,
  add column analysis_cost_usd numeric(12, 6)
    check (analysis_cost_usd is null or analysis_cost_usd >= 0),
  -- État des lieux des liens du site (étape parallèle, jamais bloquante).
  add column links_state jsonb not null default '{}'::jsonb
    check (jsonb_typeof(links_state) = 'object');

create table public.analysis_steps (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null check (key in (
    'comprendre', 'concurrents', 'etat_des_lieux', 'recherche',
    'tri', 'contacts', 'constats', 'demandes')),
  position smallint not null check (position between 1 and 8),
  status text not null default 'attente'
    check (status in ('attente', 'en_cours', 'termine', 'echoue', 'saute')),
  -- Compteurs libres, au moins `done` / `total` / `found` quand ils ont un sens.
  counters jsonb not null default '{}'::jsonb check (jsonb_typeof(counters) = 'object'),
  last_example text check (last_example is null or char_length(last_example) <= 300),
  error_message text check (error_message is null or char_length(error_message) <= 500),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id, key),
  unique (audit_id, position)
);
create index analysis_steps_running_idx on public.analysis_steps (updated_at)
  where status = 'en_cours';

create trigger analysis_steps_touch before update on public.analysis_steps
  for each row execute function public.candidate_collections_touch();

create table public.analysis_feed (
  id bigint generated always as identity primary key,
  audit_id uuid not null references public.audits (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind text not null check (kind in ('etape', 'cible', 'constat', 'info')),
  step_key text,
  message text not null check (char_length(message) between 1 and 300),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create index analysis_feed_audit_idx on public.analysis_feed (audit_id, id desc);

alter table public.analysis_steps enable row level security;
alter table public.analysis_feed enable row level security;

revoke all on public.analysis_steps, public.analysis_feed from anon, authenticated;
grant select on public.analysis_steps, public.analysis_feed to authenticated;
grant select, insert, update, delete on public.analysis_steps, public.analysis_feed to service_role;

create policy analysis_steps_select on public.analysis_steps
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy analysis_feed_select on public.analysis_feed
  for select to authenticated using (public.is_workspace_member(workspace_id));

-- Mise à jour d'une étape en UN aller-retour (helper `progress.update`) : statut, compteurs fusionnés,
-- dernier exemple, horodatage. Une étape terminée ou sautée n'est jamais rouverte par une écriture de
-- progression tardive. Renvoie vrai si une ligne a été écrite.
create function public.analysis_step_update(
  p_audit uuid,
  p_key text,
  p_status text default null,
  p_counters jsonb default null,
  p_example text default null,
  p_error text default null
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n int;
begin
  update public.analysis_steps s set
    status = coalesce(p_status, s.status),
    counters = case
      when p_status = 'attente' then coalesce(p_counters, '{}'::jsonb)
      else s.counters || coalesce(p_counters, '{}'::jsonb)
    end,
    last_example = case
      when p_status = 'attente' then null
      else coalesce(left(p_example, 300), s.last_example)
    end,
    error_message = case
      when p_status = 'echoue' then left(coalesce(p_error, ''), 500)
      when p_status is not null then null
      else s.error_message
    end,
    started_at = case
      when p_status = 'attente' then null
      when p_status is not null and s.started_at is null then now()
      else s.started_at
    end,
    finished_at = case
      when p_status in ('termine', 'echoue', 'saute') then now()
      when p_status in ('attente', 'en_cours') then null
      else s.finished_at
    end,
    updated_at = now()
  where s.audit_id = p_audit
    and s.key = p_key
    and not (s.status in ('termine', 'saute') and coalesce(p_status, 'en_cours') in ('attente', 'en_cours'));
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.analysis_step_update(uuid, text, text, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.analysis_step_update(uuid, text, text, jsonb, text, text)
  to service_role;
