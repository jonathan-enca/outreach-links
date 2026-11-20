-- MQ.4 : la piste « requête de contenu sans lien » a sa propre valeur (sinon ses cibles tombent dans « serp »
-- et le rendement par piste ne peut pas la mesurer). Additive : aucune ligne existante n'est modifiée.
-- Ordre de priorité identique à `PISTES` (TypeScript) : requete_contenu juste après content, avant serp.

alter table public.qualified_targets drop constraint if exists qualified_targets_piste_check;

alter table public.qualified_targets
  add constraint qualified_targets_piste_check check (piste is null or piste in (
    'lien_mort', 'citation', 'mention', 'intersection', 'content', 'requete_contenu', 'serp'));
