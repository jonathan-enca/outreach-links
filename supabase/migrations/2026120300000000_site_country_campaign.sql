-- Chantier B : une campagne = un site × un pays. Migration ADDITIVE (contrainte d'unicité élargie).
-- Un même domaine peut avoir une campagne par pays (son analyse, ses cibles, son contexte local).
update public.sites set country = 'FR' where country is null;
alter table public.sites
  alter column country set default 'FR',
  alter column country set not null,
  add constraint sites_country_format check (country ~ '^[A-Z]{2}$');
alter table public.sites drop constraint sites_workspace_id_domain_key;
alter table public.sites
  add constraint sites_workspace_domain_country_key unique (workspace_id, domain, country);
