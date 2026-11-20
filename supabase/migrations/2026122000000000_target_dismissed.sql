-- Cibles écartées par la personne sur l'écran « Cibles » (retour de Jonathan, 20/11/2026 : on ne
-- pouvait pas dire « je ne veux pas ce site »). Réversible : « Remettre » efface la date.
alter table public.qualified_targets add column if not exists dismissed_at timestamptz;
