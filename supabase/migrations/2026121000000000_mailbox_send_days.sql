-- Horaires d'envoi réglables par la personne (décision de Jonathan, 17/11/2026). Migration ADDITIVE.
-- Jours d'envoi en numérotation ISO : 1 = lundi … 7 = dimanche. Défaut conseillé : du lundi au vendredi.
alter table public.mailboxes
  add column send_days smallint[] not null default '{1,2,3,4,5}'
    check (
      cardinality(send_days) between 1 and 7
      and send_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    );

-- Les horaires s'affichent dans l'espace client (réglages, heure de départ prévue d'un email approuvé) :
-- lecture par colonnes, comme le reste de la table. L'écriture reste réservée au serveur.
grant select (timezone, send_window_start, send_window_end, send_days)
  on public.mailboxes to authenticated;
