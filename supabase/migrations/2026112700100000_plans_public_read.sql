-- MH.3 : le catalogue des plans est public (page Tarifs de la home, visiteur non connecté).
-- Migration ADDITIVE : lecture seule pour `anon`, aucune écriture. Les colonnes sont des
-- plafonds et un prix, jamais une donnée personnelle ; la source de vérité reste `plans`.
create policy plans_read_public on public.plans for select to anon using (true);
grant select on public.plans to anon;
