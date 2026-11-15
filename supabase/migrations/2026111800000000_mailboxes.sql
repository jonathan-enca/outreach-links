-- M4.1 : boîte d'envoi (SMTP/IMAP). Migration ADDITIVE.
-- Le mot de passe est chiffré (AES-256-GCM) par le serveur ; il n'est jamais lisible
-- par un utilisateur connecté : la colonne n'est pas dans ses droits de lecture.

create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%.__%'),
  from_name text not null check (char_length(from_name) between 1 and 80),
  username text not null check (char_length(username) between 1 and 254),
  password_enc text not null,
  key_version text not null,
  smtp_host text not null,
  smtp_port int not null check (smtp_port in (25, 465, 587, 2525)),
  imap_host text not null,
  imap_port int not null check (imap_port in (143, 993)),
  status text not null default 'en_attente'
    check (status in ('en_attente', 'verifiee', 'erreur', 'suspendue')),
  last_test_at timestamptz,
  smtp_ok boolean,
  imap_ok boolean,
  last_error text,
  health jsonb,
  -- Plafonds par défaut de CLAUDE.md 4.4 ; relevés seulement par le serveur (M4.2).
  hourly_cap int not null default 10 check (hourly_cap between 1 and 10),
  daily_cap int not null default 20 check (daily_cap between 1 and 100),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- « verifiee » exige que SMTP et IMAP aient réussi.
  constraint mailboxes_verified_needs_tests
    check (status <> 'verifiee' or (smtp_ok is true and imap_ok is true))
);
create unique index mailboxes_workspace_email_uq on public.mailboxes (workspace_id, email);
create index mailboxes_site_idx on public.mailboxes (site_id);

alter table public.mailboxes enable row level security;
revoke all on public.mailboxes from anon, authenticated, service_role;
-- Lecture par colonnes : password_enc et key_version ne sont JAMAIS exposés au client.
grant select (id, workspace_id, site_id, email, from_name, username, smtp_host, smtp_port,
  imap_host, imap_port, status, last_test_at, smtp_ok, imap_ok, last_error, health,
  hourly_cap, daily_cap, created_at, updated_at)
  on public.mailboxes to authenticated;
grant select, insert, update, delete on public.mailboxes to service_role;

create policy mailboxes_select on public.mailboxes
  for select to authenticated using (public.is_workspace_member(workspace_id));
