-- MQ.1 : chaque cible garde sa piste de découverte (la source qui l'a trouvée, jamais « inconnu »)
-- et son niveau de boule de neige (0 = premier passage, 1 = trouvée par la boule de neige ; MQ.6
-- ajoutera les niveaux suivants). Ordre de priorité des pistes identique à `pisteOf` (TypeScript) :
-- lien mort, citation d'une ressource, mention, recoupement de concurrents, contenu, SERP.

alter table public.collection_candidates
  add column niveau int not null default 0 check (niveau >= 0);

alter table public.qualified_targets
  add column piste text check (piste is null or piste in (
    'lien_mort', 'citation', 'mention', 'intersection', 'content', 'serp')),
  add column niveau int not null default 0 check (niveau >= 0);

-- Reprise de l'existant : la piste vient des sources du candidat ; à défaut, de la tactique.
update public.qualified_targets q
set piste = coalesce(
  (select case
      when c.sources @> '[{"source":"lien_mort"}]' then 'lien_mort'
      when c.sources @> '[{"source":"citation"}]' then 'citation'
      when c.sources @> '[{"source":"mention"}]' then 'mention'
      when c.sources @> '[{"source":"intersection"}]' then 'intersection'
      when c.sources @> '[{"source":"content"}]' then 'content'
      when c.sources @> '[{"source":"serp"}]' then 'serp'
      else null
    end
   from public.qualification_runs r
   join public.collection_candidates c
     on c.collection_id = r.collection_id and c.domain = q.domain
   where r.id = q.run_id
   limit 1),
  case
    when 'mentions' = any (q.tactics) then 'mention'
    when 'ressources' = any (q.tactics) then 'citation'
    else 'serp'
  end)
where q.piste is null;

-- Obligatoire pour l'application (chaque écrivain la renseigne) ; la valeur par défaut ne sert qu'aux
-- insertions directes hors application (jeux de données SQL des tests, saisies manuelles).
alter table public.qualified_targets alter column piste set default 'serp';
alter table public.qualified_targets alter column piste set not null;
