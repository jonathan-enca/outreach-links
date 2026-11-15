-- M3.3 : rédacteur de messages (brouillons). Migration ADDITIVE.
-- Un brouillon par cible contactable ; la validation par lot arrive en M3.4.

create table public.draft_runs (
  plan_id uuid primary key references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  status text not null check (status in ('en_cours', 'termine', 'echoue')),
  error_message text,
  requested_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  cost_usd numeric(10, 6) not null default 0
);

create table public.target_drafts (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null unique references public.link_plan_items (id) on delete cascade,
  plan_id uuid not null references public.link_plans (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  channel text not null check (channel in ('email', 'formulaire')),
  -- Pas de sujet pour un formulaire.
  subject text,
  body text not null,
  hook text not null,
  targeting_reason text not null,
  -- URL proposée dans le message, vérifiée au moment de la génération.
  proposed_url text not null,
  url_status integer,
  url_checked_at timestamptz,
  lint_issues jsonb not null default '[]'::jsonb,
  -- Un brouillon qui ne passe pas le linter ou dont l'URL n'est pas en 200 n'est jamais « prêt ».
  ready boolean not null default false,
  status text not null default 'brouillon' check (status in ('brouillon')),
  cost_usd numeric(10, 6) not null default 0,
  generated_at timestamptz not null default now(),
  constraint target_drafts_ready_needs_checks
    check (not ready or (coalesce(url_status, 0) = 200 and jsonb_array_length(lint_issues) = 0)),
  constraint target_drafts_email_has_subject check (channel <> 'email' or subject is not null)
);
create index target_drafts_plan_idx on public.target_drafts (plan_id);

alter table public.draft_runs enable row level security;
alter table public.target_drafts enable row level security;
revoke all on public.draft_runs, public.target_drafts from anon, authenticated, service_role;
grant select on public.draft_runs, public.target_drafts to authenticated;
grant select, insert, update on public.draft_runs, public.target_drafts to service_role;
-- Le serveur remplit le message pré-rédigé des tâches manuelles (M3.2) : update déjà accordé.

create policy draft_runs_select on public.draft_runs
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy target_drafts_select on public.target_drafts
  for select to authenticated using (public.is_workspace_member(workspace_id));
