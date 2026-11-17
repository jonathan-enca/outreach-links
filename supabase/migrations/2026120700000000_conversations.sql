-- Conversations (mini-CRM, 18/11) : état lu / non lu et étiquettes libres d'un fil. Migration ADDITIVE.
-- Un fil = un envoi initial (`sent_messages`). Lecture par la RLS (membres de l'espace) ; écriture par
-- le serveur seulement, après contrôle des droits de la personne.

create table public.thread_reads (
  sent_message_id uuid primary key references public.sent_messages (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  read_at timestamptz not null default now(),
  read_by uuid
);
create index thread_reads_ws_idx on public.thread_reads (workspace_id);

create table public.thread_tags (
  sent_message_id uuid not null references public.sent_messages (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 30),
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (sent_message_id, tag)
);
create index thread_tags_ws_idx on public.thread_tags (workspace_id, tag);

alter table public.thread_reads enable row level security;
alter table public.thread_tags enable row level security;
revoke all on public.thread_reads, public.thread_tags from anon, authenticated, service_role;
grant select on public.thread_reads, public.thread_tags to authenticated;
grant select, insert, update on public.thread_reads to service_role;
grant select, insert, delete on public.thread_tags to service_role;
create policy thread_reads_select on public.thread_reads
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy thread_tags_select on public.thread_tags
  for select to authenticated using (public.is_workspace_member(workspace_id));
