-- MT.2a : objectif de l'utilisateur sur son site.
--   goal            : 'autorite_generale' (défaut : la page citée est l'accueil, ancres de marque
--                     ou d'URL) ou 'mots_cles' (faire monter des mots-clés précis).
--   target_keywords : mots-clés choisis APRÈS l'audit, dans l'écran Plan de liens, parmi les
--                     mots-clés réels du site. Toujours vide en mode autorité générale.

alter table public.sites
  add column goal text not null default 'autorite_generale'
    check (goal in ('autorite_generale', 'mots_cles')),
  add column target_keywords text[] not null default '{}'
    check (cardinality(target_keywords) <= 10);

-- Droits par colonne (voir M1.2) : l'utilisateur choisit son objectif et ses mots-clés.
grant insert (goal, target_keywords) on public.sites to authenticated;
grant update (goal, target_keywords) on public.sites to authenticated;
