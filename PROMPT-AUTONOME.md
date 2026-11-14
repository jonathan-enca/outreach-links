# PROMPT-AUTONOME.md — Mode autonomie totale (absence longue de Jonathan)

> Créé le 14/11/2026. À lire en entier au début de chaque session lancée dans ce mode. Complète `CLAUDE.md` (qui reste la référence produit et méthode) sans le contredire. En cas de conflit, la règle la plus prudente gagne.

## 0. Mission

Jonathan est absent pour longtemps et **ne répondra à aucune question**. Construis le maximum du produit, dans l'ordre ci-dessous, sous-jalon par sous-jalon, en respectant la méthode de `CLAUDE.md` section 15 (un sous-jalon = un objectif, tests/lint/typecheck verts, `PROGRESS.md` à jour, PR fusionnée seul quand la CI est verte). **Ne jamais poser de question à l'utilisateur** : décide toi-même avec l'option par défaut proposée dans `CLAUDE.md` / `PLAN.md`, note la décision dans `PROGRESS.md > Décisions prises` (tag `[auto]`), et avance.

## 1. Ordre de travail

1. **M2.2** chasseur 404, **M2.3** écran Plan de liens (avec un test Playwright si une session de test est faisable ; sinon tests de composants et de services).
2. **MA** refonte de l'audit (voir PLAN.md et PROGRESS.md « M1.6 bis »). Découpe d'abord MA en sous-jalons dans `PLAN.md` (MA.1, MA.2, ...), en partant des constats mesurés : concurrents trop gros (cultura, shutterstock, pixabay), site sans mot-clé classé, URL exactes inconnues quand la SERP renvoie des redirections Google, coût Backlinks ~20 % au-dessus de la grille, parcours en étapes séparées. Choisis les options par défaut les plus simples et les moins coûteuses.
3. **M3.1 à M3.4** (tri des cibles, contacts, rédaction, lots). Pour la recherche d'emails : implémente l'ordre de repli de `PLAN.md` ; le finder payant (Hunter / ZeroBounce) derrière une interface, désactivé sans clé.
4. **M4.1 à M4.4** (boîte SMTP/IMAP chiffrée, envoi plafonné, relance unique, lecture IMAP) : **uniquement en dry run** et contre un faux serveur local (par exemple GreenMail ou un serveur SMTP/IMAP de test lancé en processus) ; jamais d'envoi réel (voir section 3).
5. **M5.1 à M5.4**, puis **M6.1 à M6.3** (Stripe en mode test uniquement, Resend transactionnel, digest ; derrière des adaptateurs avec implémentation factice si la clé manque), puis **M6.4** hors design visuel (pages légales en brouillon marqué « à valider par un juriste », anti-abus).
6. Si tout est fait : dette technique de `PROGRESS.md` (purges des états `en_cours` bloqués, idempotence des `task_post`, limite de débit de la vérification de propriété, durcissement SSRF), puis tests de bout en bout sur données de test.

**Hors périmètre absolu** : le jalon **MD (design du site global)** — Jonathan le fera lui-même ; ne touche pas à l'identité visuelle (reste fonctionnel et lisible, sans refonte). **M7.1 à M7.3** (dogfooding réel, avis juridique, ouverture) : ne pas faire, ils exigent Jonathan. Prépare seulement ce qui peut l'être (checklists, documents).

## 2. Accès techniques

### 2.1 Déjà en place (vérifiés le 14/11/2026, ne rien redemander)

- GitHub : dépôt `jonathan-enca/outreach-links`, fusion des PR autorisée par CLAUDE.md.
- Vercel : variables Production et Preview (noms vérifiés) : `ANTHROPIC_API_KEY`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_*`. API : `curl https://api.vercel.com/...` avec `Authorization: Bearer proxyinjectedplaceholdertoken0123` et `teamId=team_yk1dtY94b3oF9BYJ93D5hJqh` ; projet `prj_AACqPJWqGZmJJq94BPsP5Ke3N8Vr`.
- Supabase : projet `ivjkwhhgtibewqzccvrj` (outils MCP, autorisés sans validation par `.claude/settings.json`). L'outil `apply_migration` peut attendre une confirmation qui expire en session cloud : utiliser alors `POST https://api.supabase.com/v1/projects/ivjkwhhgtibewqzccvrj/database/query` (voir PROGRESS.md).
- Inngest : production active (environnement `production-195a09c2`) ; outil MCP `send_event` pour renvoyer un événement (utiliser un `id` neuf, sinon dédoublonnage).
- DataForSEO (SERP, Labs, Backlinks) et LLM Anthropic : actifs en production.
- Playwright / Chromium préinstallés dans l'environnement cloud.

### 2.2 À fournir par Jonathan AVANT son départ (sinon : adaptateur factice + fixtures, et ligne dans `PROGRESS.md > À fournir`)

| Accès                                                                                                                           | Sert à                                   | Où                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| Clé Resend (`RESEND_API_KEY`) + domaine d'envoi vérifié                                                                         | mails de connexion (limite 2/h), M6.3    | Vercel, Production et Preview, sensitive        |
| Clé Hunter ou ZeroBounce (`EMAIL_FINDER_API_KEY`)                                                                               | M3.2 recherche et vérification d'email   | Vercel, sensitive                               |
| Clés Stripe **de test** (`STRIPE_SECRET_KEY` `sk_test_...`, `STRIPE_WEBHOOK_SECRET`)                                            | M6.1                                     | Vercel Preview, sensitive                       |
| Une boîte mail **de test dédiée** (SMTP + IMAP, mot de passe d'application) ou rien                                             | essai réel M4 (seulement vers elle-même) | formulaire sécurisé de session, jamais le dépôt |
| Hôtes à autoriser dans le réseau de l'environnement cloud : api.resend.com, api.stripe.com, l'API du finder choisi, `r.jina.ai` | appels sortants des essais               | réglages de l'environnement cloud               |

Optionnel : `FIRECRAWL_API_KEY` (lecture de pages bloquées), Sentry. Sans ces éléments, tout reste construit derrière des interfaces, testé sur fixtures, et s'activera quand la clé arrivera.

## 3. Règles non négociables

1. **Aucun email d'outreach réel, jamais.** `OUTREACH_SENDING_ENABLED` reste `false` (ne pas la définir sur Vercel), `EMAIL_DRY_RUN` reste actif par défaut. Les essais d'envoi vont vers un faux serveur local ou, si Jonathan a fourni une boîte de test, vers cette boîte seulement. Aucun message à un vrai tiers, aucun formulaire de contact rempli.
2. **Budget d'API réel plafonné** pour toute l'absence : 3 USD DataForSEO au total et 1 USD LLM au total, tous consignés dans `cost_ledger` et dans `PROGRESS.md > Mesures`. Au-delà, plus aucun appel payant : fixtures seulement. Pas d'audit réel supplémentaire sur `mega-coloring.com` hors budget, et jamais plus d'un par jour. Utiliser le cache.
3. **Pas de nouvelle ressource payante** (nouveau projet Supabase, abonnement, domaine, plan supérieur), pas d'action destructive sur les données de production (pas de `DELETE`/`TRUNCATE`/`DROP` sur des données réelles ; les migrations restent additives). Pas de clé live Stripe. Aucun secret dans le dépôt, les logs ni les PR.
4. **Stripe en mode test uniquement** ; pas de prélèvement réel.
5. Respecter les règles de produit de `CLAUDE.md` : pas de mention de l'IA dans les emails d'outreach, pas de promesse de backlinks garantis, validation de lot obligatoire, autopilot désactivé par défaut, liens libellés honnêtement. Politique « c'est payant » : décliner par défaut.
6. Crawl (M2.2, M3.1) : `robots.txt`, user-agent identifiable, délais, plafonds de volume et de profondeur, protection SSRF ; pas de crawl au-delà des plafonds du sous-jalon.
7. Ne rien pousser en dehors de la branche de travail de la session et des PR vers `main` ; ne pas réécrire l'historique de `main`.

## 4. Boucle de travail

Pour chaque sous-jalon :

1. `git fetch`, repartir de `main` à jour ; lire `CLAUDE.md`, `PROGRESS.md`, uniquement le sous-jalon voulu dans `PLAN.md`. Vérifier les prérequis sur `main`.
2. Annoncer en 3 lignes ce qui est fait et ce qui ne l'est pas. Rester dans le périmètre ; les idées hors périmètre vont dans `PROGRESS.md > Backlog`.
3. Coder avec tests. `pnpm install --frozen-lockfile`, puis `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` (variables `NEXT_PUBLIC_*` fictives en local) doivent être verts. Migrations dans `supabase/migrations`, appliquées sur la vraie base, puis types régénérés avec l'outil MCP Supabase (`generate_typescript_types`) et `pnpm exec prettier`.
4. Mettre à jour `PROGRESS.md` (fait / partiel, décisions `[auto]`, fichiers clés, commandes, dettes, mesures, prochain sous-jalon) et `PLAN.md` si le périmètre change.
5. Commit, PR (description avec périmètre et critères cochés), attendre la CI verte, **fusionner soi-même**, vérifier que `main` contient `PROGRESS.md` à jour et que le déploiement Vercel de production est `READY` (`/` en 200). Si la production casse : corriger immédiatement ou revenir en arrière par un commit de retour (revert), sans attendre.
6. Passer au sous-jalon suivant. Si le contexte devient long, ouvrir une nouvelle session pour le suivant avec `create_session` (même environnement) et le prompt de démarrage de la section 7, **au plus 12 sessions enfants au total**, une seule à la fois, sans jamais en lancer deux en parallèle.

### Rythme de commits et de mise en ligne (demande de Jonathan, 14/11/2026)

- **Commit** à chaque bloc cohérent terminé (une table, un service, un écran, une série de tests), au moins toutes les 30 à 45 minutes de travail, jamais un gros commit unique en fin de sous-jalon. Pousser à chaque commit sur la branche de travail : rien ne doit rester seulement dans le conteneur, qui peut être réclamé.
- **PR et fusion dans `main` à chaque sous-jalon, ou à chaque étape livrable** d'un gros sous-jalon (scinder en PR plus petites plutôt qu'une PR géante), dès que la CI est verte.
- **Mise en ligne** : chaque fusion déclenche un déploiement de production Vercel ; vérifier à chaque fois qu'il est `READY` pour le bon commit (`GET /v6/deployments?projectId=...&target=production&limit=1`), que `/`, `/connexion` répondent 200 et que `/app` renvoie bien vers `/connexion`. Si les migrations du sous-jalon ne sont pas encore appliquées sur la vraie base, les appliquer **avant** de fusionner pour que le code déployé ne casse pas.
- Un point d'étape de `PROGRESS.md` (même court) est commité et fusionné au moins toutes les deux heures, pour que l'état réel soit toujours lisible sur `main`.

## 5. Blocages : quoi faire sans déranger Jonathan

- Clé ou accès manquant : bâtir l'adaptateur et la version factice, tester sur fixtures, ajouter une ligne claire dans `PROGRESS.md > À fournir` (quoi, où le mettre, quel sous-jalon se débloque), continuer.
- CI rouge : corriger la cause réelle ; jamais désactiver, ignorer ou assouplir un test pour passer au vert.
- Sous-jalon trop gros : le scinder dans `PLAN.md`, faire la première partie.
- Décision de produit manquante : option par défaut de `CLAUDE.md`/`PLAN.md`, sinon l'option la plus prudente et la plus réversible ; consigner `[auto]`.
- Blocage réel sur un sous-jalon après deux approches sérieuses : le marquer « bloqué » dans `PROGRESS.md` avec le diagnostic, passer au suivant indépendant.
- Appel réseau refusé par le proxy : lire la documentation de l'environnement (`read_documentation`), ne pas contourner un refus de sécurité.

## 6. Fin de mission

Quand l'ordre de la section 1 est épuisé ou que tout reste est bloqué : un dernier commit met à jour `PROGRESS.md` avec un **bilan de retour** en tête de fichier (ce qui marche et a été vérifié, ce qui est bloqué et pourquoi, coûts réels cumulés, liste exacte de ce que Jonathan doit fournir ou décider, risques) puis s'arrêter. Ne pas inventer de travail hors périmètre pour « finir plus haut » ; ne pas toucher au design (MD).

## 7. Prompt de démarrage (session enfant)

« Lis CLAUDE.md, PROMPT-AUTONOME.md et PROGRESS.md. Mode autonomie totale : Jonathan est absent et ne répond pas. Reprends au premier sous-jalon non fait de l'ordre de PROMPT-AUTONOME.md section 1, applique la boucle de la section 4, respecte les règles de la section 3 (aucun email réel, budget d'API plafonné, pas de design MD). À la fin du sous-jalon : PR fusionnée, PROGRESS.md à jour, puis session suivante selon la section 4.6. »
