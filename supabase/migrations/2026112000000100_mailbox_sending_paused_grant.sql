-- La colonne `sending_paused` (suspension des envois) n'était pas lisible par la personne connectée :
-- les droits de lecture de `mailboxes` sont donnés colonne par colonne, et celle-ci avait été oubliée.
-- Toute lecture qui la demandait échouait, et l'écran des envois croyait qu'aucune boîte n'existait.
grant select (sending_paused) on public.mailboxes to authenticated;
