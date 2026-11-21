-- MO.2 (suite) : l'utilisateur connecté ne lit plus les tables qui portent les adresses, les liens de
-- formulaire et le corps des messages ; il lit les vues masquées `*_v` (migration 2026122100000100).
-- À appliquer APRÈS le déploiement du code qui lit les vues. Le serveur (service_role) lit toujours
-- les tables : le moteur d'envoi ne change pas.
revoke select on public.target_contacts, public.manual_tasks, public.target_drafts,
  public.qualified_targets from authenticated;
