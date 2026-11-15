-- M6.1 : facturation (Stripe en MODE TEST). Migration ADDITIVE.
-- `plans` : catalogue (source de vérité des plafonds, lue côté serveur). `subscriptions` : un abonnement
-- par workspace, écrit par le webhook (service_role) seulement. `credits_ledger` : journal en ajout seul.
-- `stripe_events` : idempotence des webhooks. `workspaces.plan` (gratuit/payant, M1.3) reste le palier
-- des audits : le webhook le passe à 'payant' pendant un abonnement actif.

create table public.plans (
  key text primary key check (key in ('gratuit', 'starter', 'pro')),
  name text not null,
  price_eur_cents int not null check (price_eur_cents >= 0),
  -- Plafond d'envois réels (emails + réponses) par mois civil UTC, tous sites confondus.
  monthly_send_cap int not null check (monthly_send_cap >= 0),
  monthly_credits int not null check (monthly_credits >= 0),
  max_sites int not null check (max_sites >= 1),
  max_mailboxes int not null check (max_mailboxes >= 0),
  sort_order int not null
);
insert into public.plans (key, name, price_eur_cents, monthly_send_cap, monthly_credits, max_sites, max_mailboxes, sort_order)
values
  ('gratuit', 'Gratuit', 0, 0, 0, 1, 0, 1),
  ('starter', 'Starter', 4900, 150, 100, 1, 1, 2),
  ('pro', 'Pro', 11900, 600, 400, 5, 3, 3);
alter table public.plans enable row level security;
create policy plans_read on public.plans for select to authenticated using (true);
grant select on public.plans to authenticated, service_role;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  plan text not null references public.plans (key),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  livemode boolean not null default false check (livemode = false),
  updated_at timestamptz not null default now()
);
create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
alter table public.subscriptions enable row level security;
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (public.is_workspace_member(workspace_id));
grant select on public.subscriptions to authenticated;
grant select, insert, update on public.subscriptions to service_role;

create table public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('abonnement', 'consommation', 'ajustement')),
  -- Clé d'idempotence (ex. id de facture Stripe) : un même événement ne crédite qu'une fois.
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);
create index credits_ledger_ws_idx on public.credits_ledger (workspace_id, created_at);
alter table public.credits_ledger enable row level security;
create policy credits_ledger_read on public.credits_ledger for select to authenticated
  using (public.is_workspace_member(workspace_id));
grant select on public.credits_ledger to authenticated;
grant select, insert on public.credits_ledger to service_role;

create table public.stripe_events (
  id text primary key,
  type text not null,
  livemode boolean not null default false check (livemode = false),
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
grant select, insert on public.stripe_events to service_role;
