-- Notifications par email, deuxième version (22/11) : un interrupteur par email. Migration ADDITIVE.
-- Les anciennes colonnes (`links`, `mailbox`, `new_sites`) restent en place et ne sont plus lues :
-- « boîte d'envoi » et « paiement » sont toujours envoyés, « nouveaux sites » n'existe pas encore.
alter table public.notification_prefs
  add column if not exists analysis_ready boolean not null default true,
  add column if not exists link_live boolean not null default true,
  add column if not exists link_lost boolean not null default true,
  add column if not exists quota boolean not null default true,
  add column if not exists campaign_idle boolean not null default true,
  add column if not exists monthly boolean not null default true;

-- Qui avait coupé « Un lien est obtenu ou a disparu » garde les deux emails coupés.
update public.notification_prefs set link_live = false, link_lost = false where links = false;
