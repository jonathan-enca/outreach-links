-- M3.3 : corrige la contrainte « prêt » (un url_status nul passait le CHECK). Additive.
alter table public.target_drafts drop constraint target_drafts_ready_needs_checks;
alter table public.target_drafts add constraint target_drafts_ready_needs_checks
  check (not ready or (coalesce(url_status, 0) = 200 and jsonb_array_length(lint_issues) = 0));
