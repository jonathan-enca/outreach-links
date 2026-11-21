-- MO.2 : masquage en base des contacts et des messages (décisions de Jonathan, 21/11/2026,
-- docs/offres-et-acces.md). Quand l'offre n'a pas `contacts_visible`, l'adresse email, le lien du
-- formulaire et le message à copier ne sortent JAMAIS de la base vers un utilisateur connecté :
-- il lit des vues qui les remplacent par NULL. Au-delà de `readable_drafts` messages, seuls l'objet
-- et la première phrase sortent. Le serveur (service_role) lit toujours les tables : les envois du
-- moteur ne changent pas.
--
-- Migration ADDITIVE (fonctions, vues, réglage). Le retrait de lecture sur les tables est dans la
-- migration suivante (2026122100000200), appliquée une fois le code qui lit les vues déployé.

-- 1. Réglage « bêta » côté base. Pendant la bêta, tout espace sans abonnement a les droits Starter
-- (miroir de la variable d'environnement BETA_MODE, lue par le code). À basculer AVEC elle (MO.5).
create table public.app_flags (
  key text primary key,
  enabled boolean not null,
  updated_at timestamptz not null default now()
);
alter table public.app_flags enable row level security;
revoke all on public.app_flags from anon, authenticated, service_role;
grant select, update on public.app_flags to service_role;
insert into public.app_flags (key, enabled) values ('beta_mode', true);
comment on table public.app_flags is
  'Réglages lus par les fonctions de droits. beta_mode doit rester égal à la variable BETA_MODE.';

-- 2. Forfait effectif et droits d'un espace (miroir de src/features/billing/entitlements.ts).
create function public.workspace_plan_key(ws uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.plan
       from public.subscriptions s
      where s.workspace_id = ws
        and s.plan in ('starter', 'pro', 'business')
        and s.status in ('active', 'trialing', 'past_due')
        and (s.current_period_end is null or s.current_period_end >= now())),
    case when coalesce((select f.enabled from public.app_flags f where f.key = 'beta_mode'), false)
      then 'starter' else 'gratuit' end
  );
$$;

create function public.workspace_contacts_visible(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.contacts_visible from public.plans p where p.key = public.workspace_plan_key(ws)),
    false);
$$;

-- Nombre de messages lisibles en entier ; 2147483647 = tous ; 0 si le forfait est introuvable.
create function public.workspace_readable_drafts(ws uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select coalesce(p.readable_drafts, 2147483647)
       from public.plans p where p.key = public.workspace_plan_key(ws)),
    0);
$$;

-- Première phrase d'un message : on saute la formule d'appel (« Bonjour Marie, »), puis on garde
-- jusqu'à la première ponctuation forte ou le premier saut de ligne.
create function public.first_sentence(body text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    btrim((regexp_match(
      regexp_replace(coalesce(body, ''), '^\s*[^\n.!?]{1,60},[ \t]*\n+', ''),
      '^[^.!?\n]*[.!?]?'))[1]),
    '');
$$;

revoke all on function public.workspace_plan_key(uuid), public.workspace_contacts_visible(uuid),
  public.workspace_readable_drafts(uuid), public.first_sentence(text)
  from public, anon, authenticated;
grant execute on function public.workspace_plan_key(uuid), public.workspace_contacts_visible(uuid),
  public.workspace_readable_drafts(uuid), public.first_sentence(text) to service_role;
-- Les fonctions appelées par une vue s'exécutent avec les droits de celui qui lit la vue : elles
-- doivent donc être exécutables par `authenticated` (elles ne rendent qu'un booléen ou un entier).
grant execute on function public.workspace_contacts_visible(uuid),
  public.workspace_readable_drafts(uuid), public.first_sentence(text) to authenticated;

-- Le serveur lit les vues : la fonction d'appartenance doit lui être exécutable.
grant execute on function public.is_workspace_member(uuid) to service_role;

-- 3. Vues masquées. Le serveur (appel sans jeton utilisateur : service_role) les lit en clair, sans
-- filtre d'espace : le masquage ne vise que le jeton de l'utilisateur. Elles tournent avec les droits de leur propriétaire (le jeton de l'utilisateur
-- ne lit plus les tables) et filtrent elles-mêmes sur l'appartenance à l'espace.
create view public.target_contacts_v with (security_barrier = true) as
select
  c.id, c.plan_item_id, c.plan_id, c.workspace_id, c.status,
  case when v.ok or auth.uid() is null then c.email end as email,
  c.email_source, c.verification, c.verifier,
  case when v.ok or auth.uid() is null then c.contact_url end as contact_url,
  case when v.ok or auth.uid() is null then c.form_url end as form_url,
  c.reason, c.sendable, c.cost_usd, c.assessed_at,
  not (v.ok or auth.uid() is null) as masked
from public.target_contacts c
cross join lateral (select public.workspace_contacts_visible(c.workspace_id) as ok) v
where auth.uid() is null or public.is_workspace_member(c.workspace_id);

create view public.manual_tasks_v with (security_barrier = true) as
select
  t.id, t.plan_item_id, t.plan_id, t.workspace_id, t.type,
  case when v.ok or auth.uid() is null then t.form_url end as form_url,
  case when v.ok or auth.uid() is null then t.message end as message,
  t.status, t.created_at, t.done_at, t.follow_up_due_at, t.follow_up_status,
  case when v.ok or auth.uid() is null then t.follow_up_message end as follow_up_message,
  t.follow_up_done_at, t.follow_up_cancel_reason,
  not (v.ok or auth.uid() is null) as masked
from public.manual_tasks t
cross join lateral (select public.workspace_contacts_visible(t.workspace_id) as ok) v
where auth.uid() is null or public.is_workspace_member(t.workspace_id);

create view public.qualified_targets_v with (security_barrier = true) as
select
  q.id, q.run_id, q.audit_id, q.workspace_id, q.domain, q.url, q.tactics, q.status, q.stage_reached,
  q.exclusion_reason, q.exclusion_detail, q.provisional_score, q.platform_hosted, q.domain_rank,
  q.competitors_count, q.page, q.site_type, q.fit, q.judgement, q.hook, q.contact_status,
  case when v.ok or auth.uid() is null then q.contact_email end as contact_email,
  case when v.ok or auth.uid() is null then q.contact_url end as contact_url,
  case when v.ok or auth.uid() is null then q.form_url end as form_url,
  q.sendable, q.score, q.score_parts, q.rank, q.request_lines, q.why, q.created_at, q.piste,
  q.niveau, q.dismissed_at,
  not (v.ok or auth.uid() is null) as contact_masked
from public.qualified_targets q
cross join lateral (select public.workspace_contacts_visible(q.workspace_id) as ok) v
where auth.uid() is null or public.is_workspace_member(q.workspace_id);

-- Messages : les `readable_drafts` mieux classés (position dans le plan, puis id : ordre stable)
-- restent lisibles ; les autres gardent l'objet et la première phrase. Le corps complet reste en base.
create view public.target_drafts_v with (security_barrier = true) as
select
  d.id, d.plan_item_id, d.plan_id, d.workspace_id, d.channel, d.subject,
  case when r.open or auth.uid() is null then d.body else public.first_sentence(d.body) end as body,
  d.hook, d.targeting_reason, d.proposed_url, d.url_status, d.url_checked_at, d.lint_issues,
  d.ready, d.status, d.cost_usd, d.generated_at, d.edited_by_user, d.edited_at, d.review_note,
  d.snoozed_until,
  not (r.open or auth.uid() is null) as locked
from public.target_drafts d
join public.link_plan_items i on i.id = d.plan_item_id
cross join lateral (
  select case
    when public.workspace_readable_drafts(d.workspace_id) >= 2147483647 then true
    else (
      select count(*)
        from public.target_drafts d2
        join public.link_plan_items i2 on i2.id = d2.plan_item_id
       where d2.workspace_id = d.workspace_id
         and (i2.position, d2.id) <= (i.position, d.id)
    ) <= public.workspace_readable_drafts(d.workspace_id)
  end as open
) r
where auth.uid() is null or public.is_workspace_member(d.workspace_id);

revoke all on public.target_contacts_v, public.manual_tasks_v, public.qualified_targets_v,
  public.target_drafts_v from public, anon, authenticated;
grant select on public.target_contacts_v, public.manual_tasks_v, public.qualified_targets_v,
  public.target_drafts_v to authenticated;
grant select on public.target_contacts_v, public.manual_tasks_v, public.qualified_targets_v,
  public.target_drafts_v to service_role;
