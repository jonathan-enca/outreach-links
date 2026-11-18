-- Retours de Jonathan (18/11). Migration ADDITIVE.
-- 1. « Plus tard » devient durable : un message ou une réponse remis à plus tard sort de la file (et du
--    compteur) jusqu'à la date indiquée.
-- 2. « Refuser » un premier message : la cible est écartée avec le motif « refusé par vous » (elle garde
--    « Rédiger quand même ») ; le brouillon est supprimé.
-- 3. « Archiver » une conversation (boîte à zéro) : elle sort de la boîte de réception, et y revient si
--    une nouvelle réponse arrive après.

alter table public.target_drafts add column snoozed_until timestamptz;
alter table public.reply_drafts add column snoozed_until timestamptz;
grant update (snoozed_until) on public.reply_drafts to service_role;
grant delete on public.target_drafts to service_role;

alter table public.draft_declines drop constraint draft_declines_declined_by_check;
alter table public.draft_declines
  add constraint draft_declines_declined_by_check
  check (declined_by in ('tri', 'redacteur', 'lecture', 'utilisateur'));

alter table public.thread_reads add column archived_at timestamptz;
-- Une lecture ne doit pas défaire l'archivage : `read_at` garde son défaut, `archived_at` est nul.
