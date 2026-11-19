-- Suspension des envois (décision du 19/11/2026, écran « Envois ») : une boîte suspendue ne part plus,
-- sans rien annuler. Écrit uniquement par le service (action serveur qui vérifie les boîtes de la personne).
alter table public.mailboxes add column if not exists sending_paused boolean not null default false;
