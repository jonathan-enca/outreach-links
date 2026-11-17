-- Réglages de notification par espace (18/11). Migration ADDITIVE.
-- Sans ligne : tout est activé (défaut). Lecture par les membres, écriture par le serveur.
create table public.notification_prefs (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  reply_waiting boolean not null default true,
  to_validate boolean not null default true,
  links boolean not null default true,
  mailbox boolean not null default true,
  new_sites boolean not null default true,
  weekly boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
revoke all on public.notification_prefs from anon, authenticated, service_role;
grant select on public.notification_prefs to authenticated;
grant select, insert, update on public.notification_prefs to service_role;
create policy notification_prefs_select on public.notification_prefs
  for select to authenticated using (public.is_workspace_member(workspace_id));
