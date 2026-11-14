-- M1.6 : audit gratuit public (sans compte), anti-abus.
-- Migration ADDITIVE. Toutes les tables ci-dessous sont des tables système sans workspace :
-- RLS active SANS policy = aucun accès pour anon / authenticated ; service_role seulement.

-- Audit gratuit : une ligne par domaine et par période (mois civil, UTC).
create table public.public_audits (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (char_length(domain) between 3 and 253),
  -- Période (ex. "2026-11") : unique (domain, period_key) = une exécution par domaine et par période.
  period_key text not null check (period_key ~ '^[0-9]{4}-[0-9]{2}$'),
  status text not null default 'en_attente'
    check (status in ('en_attente', 'en_cours', 'termine', 'echoue')),
  queries text[] not null default '{}',
  queries_source text not null default 'visiteur' check (queries_source in ('visiteur', 'auto')),
  -- Nombre d'exécutions réellement démarrées (borne les réessais après échec).
  attempts int not null default 0 check (attempts >= 0),
  -- Résultat COMPLET, lu côté serveur seulement ; le navigateur reçoit une projection.
  result jsonb not null default '{}'::jsonb,
  score int check (score is null or score between 0 and 100),
  estimated_cost_usd numeric(12, 6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  cost_usd numeric(12, 6) check (cost_usd is null or cost_usd >= 0),
  error_code text,
  error_message text,
  requester_hash text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (domain, period_key)
);
create index public_audits_created_idx on public.public_audits (created_at desc);
create index public_audits_requester_idx on public.public_audits (requester_hash, created_at desc);

-- Email demandé pour voir le rapport complet. Le jeton ouvre le rapport (cookie httpOnly).
create table public.public_audit_leads (
  id uuid primary key default gen_random_uuid(),
  public_audit_id uuid not null references public.public_audits (id) on delete cascade,
  email text not null check (char_length(email) between 5 and 254 and email = lower(email)),
  access_token text not null unique check (char_length(access_token) >= 32),
  requester_hash text,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (public_audit_id, email)
);
create index public_audit_leads_email_idx on public.public_audit_leads (email, created_at desc);

-- Journal des appels pour la limitation de débit (sans service externe).
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null check (char_length(bucket) between 1 and 60),
  key_hash text not null check (char_length(key_hash) between 1 and 128),
  created_at timestamptz not null default now()
);
create index rate_limit_hits_lookup_idx on public.rate_limit_hits (bucket, key_hash, created_at desc);

-- Les coûts d'un audit public sont rattachés par public_audit_id (cost_ledger.audit_id a une clé étrangère vers audits).
alter table public.cost_ledger
  add column public_audit_id uuid references public.public_audits (id) on delete set null;
create index cost_ledger_public_audit_idx on public.cost_ledger (public_audit_id, created_at desc)
  where public_audit_id is not null;

alter table public.public_audits enable row level security;
alter table public.public_audit_leads enable row level security;
alter table public.rate_limit_hits enable row level security;
revoke all on public.public_audits, public.public_audit_leads, public.rate_limit_hits
  from anon, authenticated;
grant select, insert, update on public.public_audits to service_role;
grant select, insert on public.public_audit_leads to service_role;
grant select, insert, delete on public.rate_limit_hits to service_role;
grant usage, select on sequence public.rate_limit_hits_id_seq to service_role;

-- Limitation de débit atomique : compte les appels de la fenêtre et enregistre celui-ci
-- seulement s'il est autorisé. Le verrou consultatif par (bucket, clé) évite la course entre
-- deux requêtes simultanées. Appelable par service_role uniquement.
create function public.rate_limit_hit(
  p_bucket text,
  p_key_hash text,
  p_limit int,
  p_window_seconds int
)
returns table (allowed boolean, hits int, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_oldest timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'rate_limit_hit : limite et fenêtre doivent être positives';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key_hash, 0));
  -- Nettoyage des appels périmés de cette clé (aucune donnée utile au-delà de 2 jours).
  delete from public.rate_limit_hits
    where bucket = p_bucket and key_hash = p_key_hash
      and created_at < now() - interval '2 days';
  select count(*), min(created_at) into v_count, v_oldest
    from public.rate_limit_hits
    where bucket = p_bucket and key_hash = p_key_hash
      and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then
    return query select
      false, v_count,
      greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => p_window_seconds) - now())))::int);
    return;
  end if;
  insert into public.rate_limit_hits (bucket, key_hash) values (p_bucket, p_key_hash);
  return query select true, v_count + 1, 0;
end;
$$;
revoke all on function public.rate_limit_hit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, int, int) to service_role;

-- Dépense des audits gratuits depuis `p_since` (coupe-circuit journalier), en USD.
create function public.public_audit_spend_since(p_since timestamptz)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(actual_cost_usd, estimated_cost_usd)), 0)
  from public.cost_ledger
  where public_audit_id is not null and created_at >= p_since
$$;
revoke all on function public.public_audit_spend_since(timestamptz) from public, anon, authenticated;
grant execute on function public.public_audit_spend_since(timestamptz) to service_role;
