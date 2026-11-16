-- Chantier A.2 : « Reprendre à partir d'ici ». Migration ADDITIVE (une fonction).
-- Remet à zéro, EN UNE TRANSACTION, les étapes données d'une analyse : efface leurs résultats dérivés
-- (les suppressions suivent les clés étrangères en cascade : la collecte emporte la qualification,
-- qui emporte les constats), ne touche à rien de ce qui précède, remet les lignes de progression
-- « en attente ». Tout ou rien : une panne au milieu ne laisse jamais une analyse à moitié effacée.
-- Les profils de marque (versions immuables) ne sont pas effacés : l'étape « comprendre » en crée
-- une nouvelle version quand son drapeau `redo` est posé.
create function public.analysis_reset_steps(p_audit uuid, p_steps text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if 'concurrents' = any (p_steps) then
    delete from public.competitors where audit_id = p_audit;
    delete from public.audit_serp_results where audit_id = p_audit;
    update public.audits
      set status = 'confirme', error_message = null, finished_at = null
      where id = p_audit;
  end if;
  if 'recherche' = any (p_steps) then
    delete from public.candidate_collections where audit_id = p_audit;
  end if;
  if 'tri' = any (p_steps) then
    delete from public.qualification_runs where audit_id = p_audit;
  end if;
  if 'constats' = any (p_steps) then
    delete from public.findings_runs where audit_id = p_audit;
  end if;

  -- Fil d'événements : ceux des étapes refaites et les lignes générales (« Analyse terminée »).
  delete from public.analysis_feed
    where audit_id = p_audit and (step_key = any (p_steps) or step_key is null);

  update public.analysis_steps s set
    status = 'attente',
    counters = case when s.key = 'comprendre' then '{"redo": 1}'::jsonb else '{}'::jsonb end,
    last_example = null,
    error_message = null,
    started_at = null,
    finished_at = null,
    updated_at = now()
  where s.audit_id = p_audit and s.key = any (p_steps);
end;
$$;

revoke all on function public.analysis_reset_steps(uuid, text[]) from public, anon, authenticated;
grant execute on function public.analysis_reset_steps(uuid, text[]) to service_role;
