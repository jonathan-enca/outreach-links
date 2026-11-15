-- MA.6 : parcours unique. Une seule confirmation du coût total ; les étapes suivantes
-- (backlinks, profil, opportunités) s'enchaînent seules quand auto_chain est vrai.
-- Additif : défaut false (les audits existants gardent leur parcours par étapes).
alter table public.audits add column if not exists auto_chain boolean not null default false;
