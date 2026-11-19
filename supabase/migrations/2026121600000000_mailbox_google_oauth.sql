-- G1 : connexion d'une boîte par compte Google (OAuth). Migration ADDITIVE.
-- `provider` distingue SMTP/IMAP (défaut, comportement actuel) et Google. Les jetons vivent dans une
-- table à part, chiffrés (AES-256-GCM, même anneau de clés que les mots de passe), jamais lisibles
-- par un utilisateur connecté. Une boîte Google reste « en_attente » tant que l'envoi par l'API Gmail
-- n'existe pas (G2) : le moteur actuel ne sélectionne que les boîtes « verifiee ».

alter table public.mailboxes
  add column provider text not null default 'smtp' check (provider in ('smtp', 'google'));

grant select (provider) on public.mailboxes to authenticated;

create table public.mailbox_google_tokens (
  mailbox_id uuid primary key references public.mailboxes (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  refresh_token_enc text not null,
  key_version text not null,
  scopes text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mailbox_google_tokens enable row level security;
revoke all on public.mailbox_google_tokens from anon, authenticated, service_role;
grant select, insert, update, delete on public.mailbox_google_tokens to service_role;
-- Aucune politique pour `authenticated` : la table n'est lisible que par le serveur.
