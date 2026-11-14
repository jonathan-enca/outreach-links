# PROGRESS.md

## État

| Sous-jalon  | Statut                                                                                                | PR                                                             | Date       |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| M0.1        | fait                                                                                                  | [#1](https://github.com/jonathan-enca/outreach-links/pull/1)   | 2026-11-14 |
| M0.2        | fait (connexion par lien magique testée avec succès par Jonathan sur le site en ligne)                | PR M0.2, M0.2b, M0.2c                                          | 2026-11-14 |
| M0.3        | code fait et fusionné ; production Inngest bloquée (clés manquantes, voir « À fournir par Jonathan ») | [#7](https://github.com/jonathan-enca/outreach-links/pull/7)   | 2026-11-14 |
| M0.4        | fait (Lighthouse mobile 98/100/100/100 sur `/` et `/connexion`)                                       | [#6](https://github.com/jonathan-enca/outreach-links/pull/6)   | 2026-11-14 |
| M1.1        | fait (client DataForSEO testé sur fixtures synthétiques ; appel réel non fait, voir « À fournir »)    | [#12](https://github.com/jonathan-enca/outreach-links/pull/12) | 2026-11-14 |
| M1.2        | fait (onboarding du site et vérification de propriété ; pas de test Playwright)                       | [#11](https://github.com/jonathan-enca/outreach-links/pull/11) | 2026-11-14 |
| M1.3 à M7.3 | à faire                                                                                               |                                                                |            |

## Décisions prises

- Autonomie maximale demandée par Jonathan (14/11/2026) : déploiements, variables Vercel, réglages Supabase et fusions de PR faits par Claude sans redemander (voir CLAUDE.md section 15).
- Identifiants techniques (non secrets) : projet Vercel `outreach-links` = `prj_AACqPJWqGZmJJq94BPsP5Ke3N8Vr`, équipe `team_yk1dtY94b3oF9BYJ93D5hJqh`, site `https://outreach-links.vercel.app` ; projet Supabase `ivjkwhhgtibewqzccvrj`.
- Variables Vercel (Production et Preview) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publishable) ajoutées ; `NEXT_PUBLIC_APP_URL` existait déjà (valeur masquée, à confirmer = site ci-dessus). Supabase Auth : Site URL = le site, Redirect URLs = `/auth/callback` du site et de localhost.
- Mails de connexion : l'envoi par défaut de Supabase est limité (2 mails/heure, membres de l'organisation seulement). Brancher un SMTP dédié (Resend) avant l'ouverture au public.

- Projet Supabase `outreach-links` : id `ivjkwhhgtibewqzccvrj`, région eu-west-3 (Paris), organisation de Jonathan. Pour libérer une place gratuite, le projet `coloring-pages` (analytics) a été mis en pause à la demande de Jonathan ; le projet `scan-vie-privee` reste actif.
- La migration a été appliquée via l'outil MCP sous le nom `core_schema` (le fichier du dépôt reste la source de référence).

- Produit : outreach IA de backlinks gratuits, audit d'abord, français d'abord (voir CLAUDE.md).
- Pas de mention de l'IA dans les emails d'outreach ; le site vend l'automatisation par IA.
- Plafonds d'envoi intégrés au pricing ; audit gratuit à coût plafonné.
- Règle de travail : utiliser au maximum les MCP et CLI disponibles pour toutes les tâches techniques (voir CLAUDE.md section 15).
- Dépôt GitHub : `jonathan-enca/outreach-links` (nom provisoire du produit, pas de domaine défini).

### M0.3 (Inngest, coûts, logs)

- `cost_ledger` : `workspace_id` nul possible (appels système), invisible côté client ; `audit_id` = uuid sans clé étrangère (la table `audits` n'existe pas encore, contrainte à ajouter en M1 par migration additive). Écriture réservée à `service_role` (select et insert seulement).
- `recordCost(client, entry)` prend le client Supabase en paramètre (testable) ; `createServiceClient()` fournit le client `service_role`.
- Variables optionnelles dans `env.ts` avec `requireEnv()` (erreur claire à l'usage) : `SUPABASE_SERVICE_ROLE_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `LOG_LEVEL`. `OUTREACH_SENDING_ENABLED` (défaut false) ajoutée, aucun code ne la lit encore.
- `/api/inngest` est exclu du matcher du proxy de session (protégé par la clé de signature). Id d'application Inngest : `outreach-links`. `health` est déclenchée par l'événement `app/health.ping`, sans cron.
- `inngest-cli` n'est pas une dépendance (pnpm bloque son script) : `pnpm inngest:dev` lance `npx --ignore-scripts=false inngest-cli@1.53.0 dev --no-discovery`.
- `SUPABASE_SERVICE_ROLE_KEY` posée sur Vercel (Production et Preview, sensitive) via l'API. Une route de diagnostic temporaire des clés a été ajoutée puis retirée (PR #8 et #9). Sentry et `jobs_audit` non faits (optionnels).

### M0.4 (coquille UI)

- shadcn/ui installé à la main (Button, Card, Badge). Un seul système de statuts (cycle prospect et vues inbox) avec un ton par statut. Mode clair uniquement ; palette papier `#faf8f3` / sapin `#14595a` ; polices Fraunces et Public Sans.
- Navigation : barre basse sur mobile, latérale à partir de `md`, lien d'évitement. `/app` = accueil avec workspace, bouton vers l'audit et déconnexion ; bouton « Se connecter » ajouté sur l'accueil public.
- Hors périmètre : contenu réel des écrans, mode sombre.

### M1.1 (client DataForSEO)

- Paramètres des endpoints en snake_case comme l'API ; défauts France (location 2250), français, depth 30.
- Cache écrit avant le journal des coûts : si `recordCost` échoue, l'erreur est loguée mais la réponse payée est rendue. Les hits de cache sont journalisés à 0 USD avec `cacheHit=true` dans metadata. Le cache est lu avant les plafonds de budget.
- `estimateCost` repose sur la grille publique (SERP 0,002 USD par page de 10 ; Labs 0,01 + 0,0001 par ligne ; Backlinks 0,02 + 0,00003 par ligne ; OnPage 0,000125 par page). Hypothèse à recaler sur le coût réel.
- Plafonds `maxCostPerCallUsd` et `budgetUsd` par instance : `BudgetExceededError` avant l'appel.
- Démo réelle : `pnpm demo:dataforseo` (fichier vitest ignoré sauf `DATAFORSEO_LIVE_DEMO=1`).
- Table `dataforseo_cache` sans policy : `service_role` seulement.

### M1.2 (onboarding du site, vérification de propriété)

- Jeton, méthode et date de vérification écrits par `service_role` seulement ; droits insert/update de `authenticated` sur `sites` passés en droits par colonne. Changer de domaine remet la vérification à zéro et renouvelle le jeton (trigger SQL).
- Vérification : balise `<meta name="outreach-links-verification" content="JETON">` sur l'accueil, ou fichier `/.well-known/outreach-links-verification.txt` contenant le jeton ; https puis http. Protection SSRF (DNS vérifié, ports 80/443, 3 redirections, 512 Ko).
- Domaine normalisé (minuscules, sans schéma, chemin, port ni `www.`, IDN en punycode ; IP, localhost et TLD internes refusés). Pays : FR, BE, CH, CA, LU, MC ; langues : fr, en. 1 à 3 requêtes prioritaires obligatoires.
- `sender_email` facultatif (intention) ; connexion réelle de la boîte en M4.1.
- Logique dans `service.ts` (client Supabase en paramètre, testable) ; `actions.ts` appelle seulement ces fonctions. Événements `site.created`, `site.updated`, `site.verified`. Accès via le bouton « Configurer mon site » de `/app`.

## Fichiers et modules clés

- `src/env.ts` : validation zod des variables (`parseEnv`, `env`) ; importé par `next.config.ts` (build) et `layout.tsx` (runtime). Toute variable nouvelle s'ajoute ici et dans `.env.example`.
- `messages/fr.ts` + `src/lib/messages.ts` (`t`) : toutes les chaînes de l'interface.
- `src/{app,lib,server,features}` : structure de base.
- `.github/workflows/ci.yml` : lint, typecheck, format, test, build.

- `supabase/migrations/20261114000100_core_schema.sql` : `workspaces`, `memberships`, `sites`, `events`, RLS, trigger `handle_new_user` (workspace + membership owner à l'inscription). Écriture client sur `workspaces`/`memberships` interdite (pas d'insert) ; `events` en ajout seul.
- `supabase/tests/bootstrap.sql` (imite rôles et `auth.uid()` de Supabase) et `supabase/tests/rls.test.ts` (11 tests de RLS sur un vrai Postgres).
- `src/lib/supabase/{client,server,database.types}.ts`, `src/proxy.ts` (session + protection de `/app`), `src/app/connexion`, `src/app/auth/callback`, `src/app/app`.

- M0.3 : `src/app/api/inngest/route.ts`, `src/inngest/{client.ts,functions/health.ts,functions/index.ts}`, `src/lib/{costs.ts,logger.ts}`, `src/lib/supabase/service.ts`, `supabase/migrations/2026111503000000_cost_ledger.sql`, `supabase/tests/cost-ledger.test.ts`.
- M0.4 : `src/app/app/layout.tsx`, `src/components/{app-nav,status-badge,shell-page,empty-state}.tsx`, `src/components/ui/button.tsx`, `src/lib/{navigation,statuses}.ts`, `src/app/{not-found,error}.tsx`, `src/app/globals.css`, `components.json`.

- M1.1 : `src/lib/dataforseo/{client,endpoints,schemas,cache}.ts`, `src/lib/dataforseo/fixtures/`, `src/lib/dataforseo/demo.live.test.ts`, `supabase/migrations/2026111511000000_dataforseo_cache.sql`, `supabase/tests/dataforseo-cache.test.ts`.
- M1.2 : `supabase/migrations/2026111512000000_sites_onboarding.sql`, `supabase/tests/sites-onboarding.test.ts`, `src/features/sites/{domain,schema,verification-constants,verify,service,actions}.ts`, `src/features/sites/{site-form,verification-panel}.tsx`, `src/app/app/site/` (liste, `nouveau`, `[id]`).

## Commandes (dev, tests, migrations, Inngest)

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm build` (voir README). Démo DataForSEO : `pnpm demo:dataforseo` (clés requises). Build local : exige `NEXT_PUBLIC_APP_URL` et les variables Supabase publiques. Tests de RLS : `TEST_DATABASE_URL=postgres://user@host:port/postgres pnpm test` (Postgres 16 avec un superutilisateur ; une base temporaire est créée puis supprimée ; ignorés si la variable manque en local, obligatoires en CI). Migrations : fichiers dans `supabase/migrations`, appliqués par la CLI Supabase (`supabase db push`). Types : `pnpm db:types`. Inngest en local : `pnpm dev`, puis dans un autre terminal `pnpm inngest:dev` (dev server Inngest, doit rester sur le port 8288) ; enregistrer l'app : `curl -X PUT http://localhost:3000/api/inngest` ; événement d'essai : `curl -X POST http://localhost:8288/e/dev -H 'content-type: application/json' -d '{"name":"app/health.ping","data":{}}'`.

## Mesures (coût par audit, taux de contact, etc.)

- M0.3 : essai local de la fonction `health` = 0 USD (fournisseur `internal`, appel factice). Aucune dépense DataForSEO ni LLM à ce jour.
- M0.4 : Lighthouse mobile (Chrome headless sur `next start`) : `/` et `/connexion` = performance 98, accessibilité 100, bonnes pratiques 100, SEO 100. Pages `/app/*` non mesurées (derrière la connexion).

- M1.1 : aucun coût réel mesuré (appel impossible, 40100), dépense 0 USD. Estimations : SERP top 30 = 0,006 USD ; Labs limit 100 = 0,02 USD ; Backlinks limit 1000 = 0,05 USD ; Backlinks summary = 0,02 USD.
- M1.2 : 0 USD ; 65 tests Vitest verts dont 22 de RLS sur Postgres réel.

## Dettes et pièges

- Vercel : le projet avait `framework: null` (tout en 404). Corrigé en `nextjs` via l'API le 14/11/2026 ; production redéployée et vérifiée (`/` 200, `/connexion` 200, `/app` redirige vers `/connexion`).
- Reste : confirmer que `NEXT_PUBLIC_APP_URL` vaut `https://outreach-links.vercel.app` (valeur masquée dans Vercel).

- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API (voir `AGENTS.md`). `LayoutProps` est généré par `next build`/`dev` : ne pas l'utiliser, le typecheck CI tourne avant le build.
- Tailwind v4 passe par `@tailwindcss/postcss` (`postcss.config.mjs`). Le chargeur `@tailwindcss/turbopack` livré par create-next-app ne traitait pas `@theme`.
- `.env.example` est dé-ignoré dans `.gitignore` ; `.env*` reste ignoré sinon.
- Vitest en `vitest.config.mts` (évite l'avertissement ESM).
- `NEXT_PUBLIC_APP_URL` doit être définie sur Vercel (Preview et Production) ; valeur provisoire à remplacer quand le domaine est choisi.
- En session Claude, `gh pr create` échoue (GraphQL bloqué) : ouvrir les PR via `gh api repos/{owner}/{repo}/pulls --input fichier.json`.
- Après `prettier --write .`, vérifier que les modifications de documents par script ont bien été appliquées.

- **À faire par Jonathan (aucun outil disponible pour le faire)** : (1) dans Vercel, définir pour Preview et Production `NEXT_PUBLIC_APP_URL` (URL du site), `NEXT_PUBLIC_SUPABASE_URL` (`https://ivjkwhhgtibewqzccvrj.supabase.co`) et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publishable du projet) ; (2) dans Supabase, Authentication > URL Configuration : Site URL = URL du site, Redirect URLs = `<URL du site>/auth/callback` et `http://localhost:3000/auth/callback` ; (3) tester une vraie connexion par lien magique (réception du mail, session, déconnexion).
- `database.types.ts` généré depuis le vrai projet (outil MCP Supabase) ; à régénérer après chaque migration.
- Next 16 : `middleware` devient `src/proxy.ts`. Avec `cacheComponents`, tout accès à `cookies()` doit être sous `<Suspense>`.
- `src/env.ts` valide `process.env` à l'import : `vitest.config.mts` fournit des valeurs fictives.
- Les tests Vitest de RLS utilisent un faux schéma `auth` ; le trigger d'inscription et la RLS ont aussi été vérifiés sur le vrai projet (transaction annulée : isolation en lecture, écriture croisée refusée, update croisé sans effet, anon refusé).

- M0.3 : les outils MCP Inngest listent environnements et apps mais ne lisent pas les clés. Le compte Inngest a déjà l'app `scan-vie-privee` (environnement `production-195a09c2`). Sans `INNGEST_SIGNING_KEY`, `GET /api/inngest` répond 500 en production (critère « fonction Inngest sur Vercel » non atteint).
- M0.3 : une ligne d'essai (`internal` / `health.check`, coût 0) existe dans `cost_ledger` sur la vraie base. `database.types.ts` a été mis à jour d'après l'outil MCP puis passé à prettier (`pnpm db:types` exige la CLI Supabase locale, absente en session).
- Un classifieur de sécurité a refusé un curl direct vers `api.inngest.com` ; non contourné.
- Parcours connectés non testables par Playwright (lien magique) : tests via Postgres réel (RLS) et client Supabase simulé ; `/app/*` non mesuré par Lighthouse.
- Vitest n'inclut que `*.test.ts` : tests de composants via `createElement` et `renderToStaticMarkup`, sans JSX. Next 16 : `error.tsx` reçoit `retry` (pas `reset`). Le build télécharge les polices Google à la compilation.

- M1.1 : le proxy de cette session n'injecte pas les identifiants DataForSEO (40100). Fixtures synthétiques d'après la documentation : schémas zod tolérants mais à valider sur de vraies réponses. `DATAFORSEO_PROXY_AUTH` ne doit jamais être défini sur Vercel.
- M1.1 : les nouvelles tentatives sur 429/5xx/réseau rejouent aussi les POST payants (`task_post`) : double débit théoriquement possible. `task_get` hors cache (facturation au `task_post`). Erreurs de tâche non journalisées dans `cost_ledger`. `domain_intersection` attend `targets` en `{ "1": ..., "2": ... }`.
- M1.1 : le cache n'est jamais purgé (prévoir un job Inngest de nettoyage). `database.types.ts` modifié à la main d'après l'outil MCP.
- M1.2 : pas de Playwright dans le dépôt (parcours derrière le lien magique) : tests de services et de composants. Un composant client ne doit pas importer `verify.ts` (`node:dns`) : constantes dans `verification-constants.ts`.
- M1.2 : SSRF : rebinding DNS entre vérification et requête théoriquement possible ; redirections pouvant changer d'hôte (durcissement : domaine ou `www.domaine` seulement) ; pas de limite de débit de la vérification (à faire en 1.6). La vérification exige `SUPABASE_SERVICE_ROLE_KEY` (déjà sur Vercel). Le jeton reste lisible par les membres du workspace (voulu).

## Backlog (idées hors périmètre)

- Contrainte de clé étrangère `cost_ledger.audit_id` vers `audits` (M1).
- Mode sombre ; contenu réel des écrans de la coquille.
- Sentry et `jobs_audit` (optionnels).
- Job Inngest de purge de `dataforseo_cache` ; idempotence des `task_post` payants lors des nouvelles tentatives.
- Limite de débit de la vérification de propriété (1.6) ; durcir les redirections de vérification.
- Test Playwright connecté si une session de test est mise en place.

## À fournir par Jonathan

1. Inngest : reconnecter le connecteur avec droit de lecture des clés, ou copier `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY` (environnement production) vers Vercel (Production et Preview, type sensitive). Puis redéployer, synchroniser l'app avec `https://outreach-links.vercel.app/api/inngest`, envoyer `app/health.ping` et vérifier une nouvelle ligne dans `cost_ledger`.
2. Choisir si `outreach-links` cohabite avec `scan-vie-privee` dans l'environnement Inngest de production ou dans un environnement dédié.
3. `DATAFORSEO_LOGIN` et `DATAFORSEO_PASSWORD` (https://app.dataforseo.com/api-access) sur Vercel, Production et Preview, type sensitive ; vérifier que l'abonnement Backlinks est actif (séparé du SERP et des Labs). Puis lancer `pnpm demo:dataforseo` (SERP FR sur mega-coloring.com), consigner le coût réel ici et remplacer la fixture SERP synthétique.
4. Clé LLM (Anthropic) pour Vercel, nécessaire dès les sous-jalons d'audit.

## Prochain sous-jalon recommandé

M1.3 (audit, voir PLAN.md) : ajouter la clé étrangère `cost_ledger.audit_id` vers `audits`. En parallèle, un petit suivi pour finir la mise en production d'Inngest dès que Jonathan fournit les clés.
