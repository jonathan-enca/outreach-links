# Emails d'authentification (Supabase Auth)

Gabarits HTML en français, source de vérité versionnée ici (aucun secret). Ils sont appliqués par l'API de gestion Supabase (`PATCH /v1/projects/{ref}/config/auth`, champs `mailer_templates_*_content` et `mailer_subjects_*`) : inscription (`confirmation`), mot de passe oublié (`recovery`), lien de connexion (`magic_link`), invitation, changement d'adresse, ré-authentification. Le nom « Autolink.ai » y est écrit en dur (nom de travail) : à remplacer au changement de nom. Expéditeur : SMTP Resend, domaine `ouiouioui.app` (provisoire).
