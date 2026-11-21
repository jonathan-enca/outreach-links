-- MO.1 : accès par offre (décisions de Jonathan, 21/11/2026, docs/offres-et-acces.md).
-- Le gratuit voit tout sauf les contacts et n'envoie rien ; l'analyse gratuite se fait une fois.
-- Changements :
--   - nouveaux droits lus par src/features/billing/entitlements.ts : contacts visibles, messages
--     lisibles en entier (null = tous), export, surveillance continue des liens, réponses prêtes à
--     insérer, plafond de pages du catalogue, campagnes à vie (null = pas de plafond à vie) ;
--   - `monthly_send_cap` compte désormais les CIBLES CONTACTÉES (premier message) : relances et
--     réponses incluses, non comptées. Scale passe de 1 000 à 2 000 ;
--   - la vérification du lien obtenu (`link_checks`) entre dans toutes les offres payantes.
-- Migration additive puis mise à jour : aucune donnée supprimée.

alter table public.plans
  add column contacts_visible boolean not null default false,
  add column readable_drafts int check (readable_drafts is null or readable_drafts >= 0),
  add column export_csv boolean not null default false,
  add column link_monitoring boolean not null default false,
  add column ready_replies boolean not null default false,
  add column catalogue_cap int not null default 100 check (catalogue_cap > 0),
  add column lifetime_campaigns int check (lifetime_campaigns is null or lifetime_campaigns >= 0);

comment on column public.plans.monthly_send_cap is
  'Cibles contactées par mois civil (premier message). Relances et réponses non comptées.';
comment on column public.plans.readable_drafts is
  'Messages rédigés lisibles en entier ; null = tous.';
comment on column public.plans.lifetime_campaigns is
  'Campagnes autorisées sur la vie du compte ; null = pas de plafond à vie (plafond mensuel seul).';

update public.plans set
  contacts_visible = false, readable_drafts = 3, export_csv = false,
  link_monitoring = false, ready_replies = false, catalogue_cap = 100, lifetime_campaigns = 1
where key = 'gratuit';

update public.plans set
  contacts_visible = true, readable_drafts = null, export_csv = true,
  link_checks = true, link_monitoring = false, ready_replies = false,
  catalogue_cap = 200, lifetime_campaigns = null
where key = 'starter';

update public.plans set
  contacts_visible = true, readable_drafts = null, export_csv = true,
  link_checks = true, link_monitoring = true, ready_replies = true,
  catalogue_cap = 500, lifetime_campaigns = null
where key = 'pro';

update public.plans set
  monthly_send_cap = 2000,
  contacts_visible = true, readable_drafts = null, export_csv = true,
  link_checks = true, link_monitoring = true, ready_replies = true,
  catalogue_cap = 1000, lifetime_campaigns = null
where key = 'business';
