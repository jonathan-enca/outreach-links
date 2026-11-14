-- MA.2 : taille des concurrents (domaines référents) mesurée avant l'étape Backlinks.
-- Additive : deux colonnes nullables / avec défaut.
alter table public.competitors
  add column if not exists referring_domains int check (referring_domains is null or referring_domains >= 0),
  add column if not exists size_excluded boolean not null default false;

comment on column public.competitors.referring_domains is
  'Domaines référents mesurés (backlinks.bulk_referring_domains), null si non mesuré.';
comment on column public.competitors.size_excluded is
  'Écarté car plus gros que le seuil du plan (MA.2) ; remplacé par le candidat suivant.';
