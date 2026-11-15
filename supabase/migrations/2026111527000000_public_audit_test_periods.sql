-- MA.8 : les sites de test (remove-me.io, mega-coloring.com) relancent un audit gratuit à chaque
-- soumission. Leur période est suffixée par l'horodatage ("2026-11~1763227200000") pour passer
-- l'unicité (domain, period_key) ; les autres domaines gardent le format "AAAA-MM".
alter table public.public_audits drop constraint if exists public_audits_period_key_check;
alter table public.public_audits
  add constraint public_audits_period_key_check
  check (period_key ~ '^[0-9]{4}-[0-9]{2}(~[0-9]{10,16})?$');
