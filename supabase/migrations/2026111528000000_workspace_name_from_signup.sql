-- Inscription par mot de passe : le nom saisi (raw_user_meta_data.full_name) nomme l'espace de travail ;
-- sinon repli sur la partie locale de l'email, comme avant. Additif (remplace la fonction seulement).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_id uuid;
  ws_name text;
begin
  ws_name := coalesce(
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Mon espace'
  );
  insert into public.workspaces (name, created_by) values (ws_name, new.id) returning id into ws_id;
  insert into public.memberships (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  insert into public.events (workspace_id, actor_id, type, payload)
    values (ws_id, new.id, 'workspace.created', jsonb_build_object('source', 'signup'));
  return new;
end;
$$;
