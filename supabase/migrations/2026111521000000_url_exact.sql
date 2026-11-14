-- MA.5 : une URL de cible reconstruite depuis une redirection Google n'est pas exacte.
-- Additif : défaut true (les lignes existantes viennent de vraies URL ou de contrôles HTTP).
alter table public.link_opportunities add column if not exists url_exact boolean not null default true;
alter table public.link_plan_items add column if not exists url_exact boolean not null default true;

create or replace function public.create_link_plan(p_audit_id uuid, p_user_id uuid, p_items jsonb)
returns table (plan_id uuid, version int)
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v int;
  pid uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'plan vide' using errcode = '22023';
  end if;
  select id, workspace_id, site_id into a from public.audits where id = p_audit_id for update;
  if not found then
    raise exception 'audit introuvable' using errcode = 'P0002';
  end if;
  select coalesce(max(lp.version), 0) + 1 into v from public.link_plans lp where lp.audit_id = p_audit_id;
  insert into public.link_plans (audit_id, workspace_id, site_id, version, item_count, validated_by)
    values (a.id, a.workspace_id, a.site_id, v, jsonb_array_length(p_items), p_user_id)
    returning id into pid;
  insert into public.link_plan_items
    (plan_id, workspace_id, opportunity_id, position, type, source_domain, source_url, url_exact, target_page_url,
     anchor_kind, anchor_text, expected_link_type, offer, rationale, priority, priority_score, broken_url)
  select pid, a.workspace_id, nullif(e.value->>'opportunity_id', '')::uuid, e.ordinality::int,
         e.value->>'type', e.value->>'source_domain', e.value->>'source_url',
         coalesce((e.value->>'url_exact')::boolean, true), e.value->>'target_page_url',
         e.value->>'anchor_kind', e.value->>'anchor_text', e.value->>'expected_link_type',
         e.value->>'offer', e.value->>'rationale', e.value->>'priority',
         (e.value->>'priority_score')::int, e.value->>'broken_url'
  from jsonb_array_elements(p_items) with ordinality as e(value, ordinality);
  return query select pid, v;
end;
$$;
revoke all on function public.create_link_plan(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_link_plan(uuid, uuid, jsonb) to service_role;
